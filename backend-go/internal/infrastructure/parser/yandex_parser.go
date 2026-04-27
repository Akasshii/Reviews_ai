package parser

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/service"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/google/uuid"
)

type YandexParser struct {
	browser     *BrowserManager
	rateLimiter *RateLimiter
}

func NewYandexParser(browser *BrowserManager, rateLimiter *RateLimiter) *YandexParser {
	return &YandexParser{
		browser:     browser,
		rateLimiter: rateLimiter,
	}
}

// Ensure YandexParser implements ReviewParser
var _ service.ReviewParser = (*YandexParser)(nil)

func (p *YandexParser) Source() string {
	return string(entity.SourceYandex)
}

func (p *YandexParser) ValidateURL(url string) bool {
	if !strings.Contains(url, "yandex.com/maps") && !strings.Contains(url, "yandex.ru/maps") {
		return false
	}
	re := regexp.MustCompile(`/org/[^/]+/\d+`)
	return re.MatchString(url)
}

func (p *YandexParser) ParseReviews(ctx context.Context, url string, opts service.ParseOptions) ([]entity.ParsedReview, error) {
	var result []entity.ParsedReview

	err := WithRetry(func() error {
		var parseErr error
		result, parseErr = p.parseReviewsInternal(ctx, url, opts)
		return parseErr
	}, 2)

	return result, err
}

func (p *YandexParser) parseReviewsInternal(ctx context.Context, url string, opts service.ParseOptions) ([]entity.ParsedReview, error) {
	reviewsURL := p.ensureReviewsURL(url)

	log.Printf("[YandexParser] Starting parse: %s (max=%d)", reviewsURL, opts.MaxReviews)

	tabCtx, cancel := p.browser.NewContext()
	defer cancel()

	// Navigate to the reviews page
	if err := chromedp.Run(tabCtx, chromedp.Navigate(reviewsURL)); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("timeout navigating to page: %w", err)
		}
		return nil, fmt.Errorf("failed to navigate to %s: %w", reviewsURL, err)
	}

	// Wait for the page to load - try multiple selectors for the reviews container
	if err := p.waitForReviews(tabCtx); err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "captcha") || strings.Contains(errMsg, "капч") {
			return nil, fmt.Errorf("Сервис временно заблокировал доступ, попробуйте позже")
		}
		return nil, fmt.Errorf("Отзывы не найдены: %w", err)
	}

	log.Println("[YandexParser] Reviews container loaded, starting scroll")

	// Scroll to load more reviews
	maxReviews := opts.MaxReviews
	if maxReviews <= 0 {
		maxReviews = 200
	}

	p.rateLimiter.Wait()
	if err := p.scrollToLoadReviews(tabCtx, maxReviews); err != nil {
		log.Printf("[YandexParser] WARNING: scroll incomplete, returning partial results: %v", err)
	}

	// Expand collapsed (spoilered) long reviews by clicking all "Ещё" buttons
	p.expandSpoilers(tabCtx)

	// Extract reviews from DOM via JavaScript
	rawReviews, err := p.extractReviewsFromDOM(tabCtx)
	if err != nil {
		return nil, fmt.Errorf("failed to extract reviews: %w", err)
	}

	log.Printf("[YandexParser] Extracted %d raw reviews", len(rawReviews))

	if len(rawReviews) == 0 {
		return nil, fmt.Errorf("Отзывы не найдены")
	}

	// Log sample date texts for debugging
	if len(rawReviews) > 0 {
		sampleCount := 10
		if len(rawReviews) < sampleCount {
			sampleCount = len(rawReviews)
		}
		emptyDateCount := 0
		for i := 0; i < len(rawReviews); i++ {
			if rawReviews[i].DateText == "" {
				emptyDateCount++
			}
		}
		log.Printf("[YandexParser] Date stats: %d total, %d with empty dateText", len(rawReviews), emptyDateCount)
		for i := 0; i < sampleCount; i++ {
			parsed := parseRelativeDate(rawReviews[i].DateText)
			parsedStr := "UNKNOWN"
			if !parsed.IsZero() {
				parsedStr = parsed.Format("2006-01-02")
			}
			log.Printf("[YandexParser] Sample date[%d]: text=%q parsed=%s", i, rawReviews[i].DateText, parsedStr)
		}
		if !opts.PeriodStart.IsZero() || !opts.PeriodEnd.IsZero() {
			log.Printf("[YandexParser] Date filter: %s — %s", opts.PeriodStart.Format("2006-01-02"), opts.PeriodEnd.Format("2006-01-02"))
		}
	}

	// Convert to ParsedReview and filter by date
	var result []entity.ParsedReview
	source := string(entity.SourceYandex)
	skippedBefore := 0
	skippedAfter := 0
	skippedUnknownDate := 0
	skippedDuplicates := 0
	seenTexts := make(map[string]bool)

	hasDateFilter := !opts.PeriodStart.IsZero() || !opts.PeriodEnd.IsZero()

	for _, raw := range rawReviews {
		// Deduplicate by text content
		textKey := strings.TrimSpace(raw.Text)
		if len(textKey) > 100 {
			textKey = textKey[:100] // use first 100 chars as key
		}
		if seenTexts[textKey] {
			skippedDuplicates++
			continue
		}
		seenTexts[textKey] = true

		reviewDate := parseRelativeDate(raw.DateText)

		// Skip reviews with unparseable dates when date filter is active
		if reviewDate.IsZero() {
			if hasDateFilter {
				skippedUnknownDate++
				continue
			}
			// No date filter — use current time as fallback
			reviewDate = time.Now()
		}

		if !opts.PeriodStart.IsZero() && reviewDate.Before(opts.PeriodStart) {
			skippedBefore++
			continue
		}
		if !opts.PeriodEnd.IsZero() && reviewDate.After(opts.PeriodEnd) {
			skippedAfter++
			continue
		}

		result = append(result, entity.ParsedReview{
			ReviewID: uuid.New().String(),
			Author:   raw.Author,
			Rating:   raw.Rating,
			Text:     raw.Text,
			Date:     reviewDate,
			Source:   source,
		})

		if len(result) >= maxReviews {
			break
		}
	}

	log.Printf("[YandexParser] Returning %d reviews (skipped: %d before period, %d after period, %d unknown date, %d duplicates)", len(result), skippedBefore, skippedAfter, skippedUnknownDate, skippedDuplicates)
	return result, nil
}

func (p *YandexParser) extractBusinessID(yandexURL string) (string, error) {
	re := regexp.MustCompile(`/org/[^/]+/(\d+)`)
	matches := re.FindStringSubmatch(yandexURL)
	if len(matches) < 2 {
		return "", fmt.Errorf("invalid Yandex Maps URL format")
	}
	return matches[1], nil
}

// ensureReviewsURL makes sure the URL path contains /reviews/ before query parameters.
func (p *YandexParser) ensureReviewsURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		// Fallback: naive append
		rawURL = strings.TrimRight(rawURL, "/")
		if !strings.HasSuffix(rawURL, "/reviews") {
			rawURL += "/reviews/"
		}
		return rawURL
	}
	u.Path = strings.TrimRight(u.Path, "/")
	if !strings.HasSuffix(u.Path, "/reviews") {
		u.Path += "/reviews/"
	} else {
		u.Path += "/"
	}
	return u.String()
}

// waitForReviews waits for the reviews section to appear on the page.
// Polls with Go-side loop to avoid Promise serialization issues with chromedp.
func (p *YandexParser) waitForReviews(ctx context.Context) error {
	checkJS := `
	(function() {
		var selectors = [
			'[class*="business-reviews-card-view__review"]',
			'[class*="business-review-view"]',
			'[class*="orgpage-reviews-card"]',
			'[class*="review-card"]',
			'[itemprop="review"]',
			'[data-review-id]',
			'[class*="reviews-card"]'
		];
		for (var i = 0; i < selectors.length; i++) {
			if (document.querySelectorAll(selectors[i]).length > 0) {
				return selectors[i];
			}
		}
		if (document.body && (document.body.innerText.includes('отзыв') || document.body.innerText.includes('review'))) {
			return 'text-match';
		}
		return '';
	})()
	`

	for attempt := 0; attempt < 20; attempt++ {
		var matched string
		if err := chromedp.Run(ctx, chromedp.Evaluate(checkJS, &matched)); err != nil {
			return fmt.Errorf("waiting for reviews: %w", err)
		}
		if matched != "" {
			log.Printf("[YandexParser] Reviews found with selector strategy: %s", matched)
			return nil
		}
		if err := chromedp.Run(ctx, chromedp.Sleep(1*time.Second)); err != nil {
			return err
		}
	}
	return fmt.Errorf("reviews not found after 20 attempts")
}

// scrollToLoadReviews scrolls the reviews container to trigger infinite scroll loading.
// Uses Go-side polling loop to avoid Promise serialization issues with chromedp.
func (p *YandexParser) scrollToLoadReviews(ctx context.Context, maxReviews int) error {
	// JS to scroll the container once and return current review count
	scrollOnceJS := `
	(function() {
		var findScrollContainer = function() {
			var candidates = [
				document.querySelector('[class*="scroll-container"]'),
				document.querySelector('[class*="sidebar-view__panel"]'),
				document.querySelector('[class*="orgpage-reviews"]'),
				document.querySelector('[class*="card-section-group"]'),
				document.querySelector('[class*="tabs-pane"]')
			];
			for (var i = 0; i < candidates.length; i++) {
				if (candidates[i] && candidates[i].scrollHeight > candidates[i].clientHeight) return candidates[i];
			}
			var all = document.querySelectorAll('div');
			var best = null;
			var bestDiff = 0;
			for (var j = 0; j < all.length; j++) {
				var diff = all[j].scrollHeight - all[j].clientHeight;
				if (diff > 100 && diff > bestDiff) {
					var style = window.getComputedStyle(all[j]);
					if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
						best = all[j];
						bestDiff = diff;
					}
				}
			}
			return best;
		};

		var container = findScrollContainer();
		if (!container) return 'no-scroll-container:0';

		container.scrollTop = container.scrollHeight;

		var reviewSelectors = [
			'.business-review-view__info',
			'[itemprop="review"]',
			'[data-review-id]'
		];
		var count = 0;
		for (var k = 0; k < reviewSelectors.length; k++) {
			var els = document.querySelectorAll(reviewSelectors[k]);
			if (els.length > count) count = els.length;
		}
		return 'ok:' + count;
	})()
	`

	maxScrolls := maxReviews / 5
	if maxScrolls < 5 {
		maxScrolls = 5
	}
	if maxScrolls > 50 {
		maxScrolls = 50
	}

	prevCount := 0
	noChangeCount := 0

	for i := 0; i < maxScrolls; i++ {
		var result string
		if err := chromedp.Run(ctx, chromedp.Evaluate(scrollOnceJS, &result)); err != nil {
			return fmt.Errorf("scroll failed: %w", err)
		}

		if strings.HasPrefix(result, "no-scroll-container") {
			log.Println("[YandexParser] No scroll container found")
			return nil
		}

		// Parse count from "ok:123"
		count := 0
		if parts := strings.SplitN(result, ":", 2); len(parts) == 2 {
			count, _ = strconv.Atoi(parts[1])
		}

		if count >= maxReviews {
			log.Printf("[YandexParser] Scroll done: %d reviews loaded (target: %d)", count, maxReviews)
			return nil
		}

		if count == prevCount {
			noChangeCount++
			if noChangeCount >= 3 {
				log.Printf("[YandexParser] Scroll stopped: no new reviews after 3 scrolls (%d total)", count)
				return nil
			}
		} else {
			noChangeCount = 0
		}
		prevCount = count

		// Wait between scrolls
		if err := chromedp.Run(ctx, chromedp.Sleep(1500*time.Millisecond)); err != nil {
			return err
		}
	}

	log.Printf("[YandexParser] Scroll complete after %d iterations", maxScrolls)
	return nil
}

// expandSpoilers clicks all "Ещё" buttons to reveal full text of collapsed reviews.
func (p *YandexParser) expandSpoilers(ctx context.Context) {
	expandJS := `
	(function() {
		var buttons = document.querySelectorAll('span.business-review-view__expand');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].click();
		}
		return buttons.length;
	})()
	`
	var clicked int
	if err := chromedp.Run(ctx, chromedp.Evaluate(expandJS, &clicked)); err != nil {
		log.Printf("[YandexParser] WARNING: failed to expand spoilers: %v", err)
		return
	}
	if clicked > 0 {
		log.Printf("[YandexParser] Expanded %d spoilered reviews", clicked)
		_ = chromedp.Run(ctx, chromedp.Sleep(500*time.Millisecond))
	}
}

// rawReview holds data extracted from the DOM before conversion.
type rawReview struct {
	Author   string `json:"author"`
	Rating   int    `json:"rating"`
	Text     string `json:"text"`
	DateText string `json:"dateText"`
}

// extractReviewsFromDOM runs JavaScript to extract all review data from the rendered page.
// Selectors are based on actual Yandex Maps DOM structure (2025-2026).
func (p *YandexParser) extractReviewsFromDOM(ctx context.Context) ([]rawReview, error) {
	extractJS := `
	(function() {
		const results = [];

		// Find review cards — use .business-review-view__info as primary (exact card container)
		// Each review card has this wrapper containing author, rating, text, date
		const cardSelectors = [
			'.business-review-view__info',
			'[itemprop="review"]',
			'[data-review-id]'
		];

		let reviewElements = [];
		for (const sel of cardSelectors) {
			const els = document.querySelectorAll(sel);
			if (els.length > 0) {
				reviewElements = Array.from(els);
				break; // use first selector that finds cards
			}
		}

		// Fallback: if no exact match, try broader selectors but filter to actual cards
		if (reviewElements.length === 0) {
			const candidates = document.querySelectorAll('[class*="business-reviews-card-view__review"], [class*="orgpage-reviews-card"], [class*="review-card"]');
			reviewElements = Array.from(candidates);
		}

		for (const el of reviewElements) {
			const review = {};

			// 1. AUTHOR — use itemprop="name" inside author block (most reliable)
			const nameEl = el.querySelector('[itemprop="name"]') ||
				el.querySelector('.business-review-view__author-name a span') ||
				el.querySelector('.business-review-view__author-name a');
			review.author = nameEl ? nameEl.textContent.trim() : '';
			if (!review.author) {
				// Fallback: first link in author container
				const authorLink = el.querySelector('.business-review-view__author-name a, [class*="author"] a');
				if (authorLink) review.author = authorLink.textContent.trim();
			}
			if (!review.author) review.author = 'Аноним';

			// 2. RATING — use meta itemprop="ratingValue" (exact value)
			let rating = 0;
			const ratingMeta = el.querySelector('meta[itemprop="ratingValue"]');
			if (ratingMeta) {
				rating = Math.round(parseFloat(ratingMeta.getAttribute('content') || '0'));
			}
			// Fallback: aria-label on stars container "Rating N Out of 5"
			if (rating === 0) {
				const starsDiv = el.querySelector('[aria-label*="Rating"], [aria-label*="рейтинг"], [aria-label*="Оценка"]');
				if (starsDiv) {
					const m = (starsDiv.getAttribute('aria-label') || '').match(/(\d)/);
					if (m) rating = parseInt(m[1]);
				}
			}
			// Fallback: count filled stars by class _full
			if (rating === 0) {
				const fullStars = el.querySelectorAll('.business-rating-badge-view__star._full, [class*="rating-badge-view__star"]._full');
				if (fullStars.length > 0) rating = fullStars.length;
			}
			review.rating = rating || 5;

			// 3. TEXT — use itemprop="reviewBody" (clean review text)
			const bodyEl = el.querySelector('[itemprop="reviewBody"]') ||
				el.querySelector('.business-review-view__body');
			if (bodyEl) {
				// Prefer text inside spoiler-view__text-container (avoids "Read more" buttons)
				const spoiler = bodyEl.querySelector('.spoiler-view__text-container');
				review.text = spoiler ? spoiler.textContent.trim() : bodyEl.textContent.trim();
			}
			if (!review.text) {
				// Fallback: any element with review-text class
				const textEl = el.querySelector('[class*="review-text"], [class*="review-body"], [class*="comment-text"]');
				if (textEl) review.text = textEl.textContent.trim();
			}
			if (!review.text) continue; // Skip reviews without text

			// 4. DATE — use meta itemprop="datePublished" (ISO format, most reliable)
			const dateMeta = el.querySelector('meta[itemprop="datePublished"]');
			if (dateMeta) {
				review.dateText = dateMeta.getAttribute('content') || '';
			}
			if (!review.dateText) {
				// Fallback: text from date span
				const dateSpan = el.querySelector('.business-review-view__date span, [class*="review-date"]');
				if (dateSpan) review.dateText = dateSpan.textContent.trim();
			}
			if (!review.dateText) {
				// Last resort: find text with date pattern
				const allSpans = el.querySelectorAll('span');
				for (const s of allSpans) {
					const t = s.textContent.trim();
					if (t.match(/назад|ago|\d{4}|январ|феврал|март|апрел|мая|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|may|june|july|august|september|october|november|december/i) && t.length < 50) {
						review.dateText = t;
						break;
					}
				}
			}
			if (!review.dateText) review.dateText = '';

			results.push(review);
		}

		return results;
	})()
	`

	var reviews []rawReview
	if err := chromedp.Run(ctx, chromedp.Evaluate(extractJS, &reviews, chromedp.EvalAsValue)); err != nil {
		return nil, fmt.Errorf("JS extraction failed: %w", err)
	}

	return reviews, nil
}

// parseRelativeDate converts Russian relative date strings to time.Time.
// Examples: "2 дня назад", "месяц назад", "вчера", "15 января 2025"
func parseRelativeDate(dateText string) time.Time {
	now := time.Now()
	dateText = strings.TrimSpace(dateText)

	if dateText == "" {
		return time.Time{} // return zero time for empty dates
	}

	// Try ISO formats BEFORE lowercasing — time.Parse requires uppercase T and Z
	// RFC3339Nano handles both "2025-10-26T15:31:15Z" and "2025-10-26T15:31:15.291Z"
	if t, err := time.Parse(time.RFC3339Nano, dateText); err == nil {
		return t
	}
	if t, err := time.Parse(time.RFC3339, dateText); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", dateText); err == nil {
		return t
	}

	// Lowercase for relative date parsing below
	dateText = strings.ToLower(dateText)

	// English date formats: "October 26, 2025", "26 October 2025", "Oct 26, 2025"
	englishFormats := []string{
		"January 2, 2006",
		"January 2 2006",
		"2 January 2006",
		"Jan 2, 2006",
		"Jan 2 2006",
		"2 Jan 2006",
	}
	// parseRelativeDate lowercases the input, so capitalize first letter of each word for time.Parse
	titleCased := capitalizeDateWords(dateText)
	for _, format := range englishFormats {
		if t, err := time.Parse(format, titleCased); err == nil {
			return t
		}
	}

	// "вчера" = yesterday
	if strings.Contains(dateText, "вчера") || strings.Contains(dateText, "yesterday") {
		return now.AddDate(0, 0, -1)
	}

	// "сегодня" = today
	if strings.Contains(dateText, "сегодня") || strings.Contains(dateText, "today") {
		return now
	}

	// "позавчера" = day before yesterday
	if strings.Contains(dateText, "позавчера") {
		return now.AddDate(0, 0, -2)
	}

	// Pattern: "N <unit> назад"
	reAgo := regexp.MustCompile(`(\d+)\s+(минут|час|дн|день|дня|дней|недел|месяц|год|лет)\S*\s+назад`)
	if matches := reAgo.FindStringSubmatch(dateText); len(matches) >= 3 {
		n, _ := strconv.Atoi(matches[1])
		unit := matches[2]
		switch {
		case strings.HasPrefix(unit, "минут"):
			return now.Add(-time.Duration(n) * time.Minute)
		case strings.HasPrefix(unit, "час"):
			return now.Add(-time.Duration(n) * time.Hour)
		case strings.HasPrefix(unit, "дн") || strings.HasPrefix(unit, "день") || strings.HasPrefix(unit, "дня") || strings.HasPrefix(unit, "дней"):
			return now.AddDate(0, 0, -n)
		case strings.HasPrefix(unit, "недел"):
			return now.AddDate(0, 0, -n*7)
		case strings.HasPrefix(unit, "месяц"):
			return now.AddDate(0, -n, 0)
		case strings.HasPrefix(unit, "год") || strings.HasPrefix(unit, "лет"):
			return now.AddDate(-n, 0, 0)
		}
	}

	// "неделю назад" (a week ago), "месяц назад" (a month ago), "год назад" (a year ago)
	if strings.Contains(dateText, "неделю назад") {
		return now.AddDate(0, 0, -7)
	}
	if strings.Contains(dateText, "месяц назад") {
		return now.AddDate(0, -1, 0)
	}
	if strings.Contains(dateText, "год назад") {
		return now.AddDate(-1, 0, 0)
	}

	// Russian date format: "15 января 2025" or "15 января"
	months := map[string]time.Month{
		"январ":   time.January,
		"феврал":  time.February,
		"март":    time.March,
		"апрел":   time.April,
		"мая":     time.May,
		"мае":     time.May,
		"май":     time.May,
		"июн":     time.June,
		"июл":     time.July,
		"август":  time.August,
		"сентябр": time.September,
		"октябр":  time.October,
		"ноябр":   time.November,
		"декабр":  time.December,
	}

	reDate := regexp.MustCompile(`(\d{1,2})\s+(\S+?)(?:\s+(\d{4}))?$`)
	if matches := reDate.FindStringSubmatch(dateText); len(matches) >= 3 {
		day, _ := strconv.Atoi(matches[1])
		monthStr := strings.ToLower(matches[2])
		year := now.Year()
		if len(matches) >= 4 && matches[3] != "" {
			year, _ = strconv.Atoi(matches[3])
		}

		for prefix, month := range months {
			if strings.HasPrefix(monthStr, prefix) {
				return time.Date(year, month, day, 12, 0, 0, 0, time.UTC)
			}
		}
	}

	// Could not parse date — return zero time
	return time.Time{}
}

// capitalizeDateWords capitalizes the first letter of each word for time.Parse compatibility.
func capitalizeDateWords(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// DetermineSentiment determines review sentiment based on rating and text
func DetermineSentiment(rating int, text string) string {
	text = strings.ToLower(text)

	negativeWords := []string{"плохо", "ужасно", "грязно", "разочарован", "не рекомендую", "отвратительно"}
	positiveWords := []string{"отлично", "хорошо", "прекрасно", "замечательно", "рекомендую", "понравилось"}

	negativeCount := 0
	positiveCount := 0

	for _, word := range negativeWords {
		if strings.Contains(text, word) {
			negativeCount++
		}
	}
	for _, word := range positiveWords {
		if strings.Contains(text, word) {
			positiveCount++
		}
	}

	// High rating (4-5): positive by default, negative only if text is clearly negative
	if rating >= 4 {
		if negativeCount > positiveCount {
			return string(entity.SentimentNegative)
		}
		return string(entity.SentimentPositive)
	}

	// Low rating (1-2): negative by default
	if rating <= 2 {
		return string(entity.SentimentNegative)
	}

	// Medium rating (3): determined by text, default neutral
	if negativeCount > positiveCount {
		return string(entity.SentimentNegative)
	}
	if positiveCount > negativeCount {
		return string(entity.SentimentPositive)
	}
	return string(entity.SentimentNeutral)
}

// ExtractCategories extracts categories from review text
func ExtractCategories(text string) []string {
	text = strings.ToLower(text)
	categories := []string{}

	categoryKeywords := map[string][]string{
		"quality":     {"качество", "товар", "продукт", "услуга"},
		"service":     {"обслуживание", "персонал", "сотрудник", "администратор", "официант"},
		"cleanliness": {"чистота", "чисто", "грязно", "убран", "порядок"},
		"atmosphere":  {"атмосфера", "уютно", "комфортно", "обстановка", "интерьер", "дизайн"},
		"price":       {"цена", "дорого", "дешево", "стоимость", "дорогой", "недорого"},
	}

	for category, keywords := range categoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(text, keyword) {
				categories = append(categories, category)
				break
			}
		}
	}

	if len(categories) == 0 {
		categories = append(categories, "quality")
	}

	return categories
}

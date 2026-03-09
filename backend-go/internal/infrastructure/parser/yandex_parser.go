package parser

import (
	"context"
	"fmt"
	"log"
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
		sampleCount := 3
		if len(rawReviews) < sampleCount {
			sampleCount = len(rawReviews)
		}
		for i := 0; i < sampleCount; i++ {
			parsed := parseRelativeDate(rawReviews[i].DateText)
			log.Printf("[YandexParser] Sample date[%d]: text=%q parsed=%s", i, rawReviews[i].DateText, parsed.Format("2006-01-02"))
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

	for _, raw := range rawReviews {
		reviewDate := parseRelativeDate(raw.DateText)

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

	log.Printf("[YandexParser] Returning %d reviews (skipped: %d before period, %d after period)", len(result), skippedBefore, skippedAfter)
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

// ensureReviewsURL makes sure the URL ends with /reviews/
func (p *YandexParser) ensureReviewsURL(url string) string {
	url = strings.TrimRight(url, "/")
	if !strings.HasSuffix(url, "/reviews") {
		url += "/reviews/"
	} else {
		url += "/"
	}
	return url
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

	for attempt := 0; attempt < 30; attempt++ {
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
	return fmt.Errorf("reviews not found after 30 attempts")
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
			'[class*="business-reviews-card-view__review"]',
			'[class*="business-review-view"]',
			'[class*="orgpage-reviews-card"]',
			'[class*="review-card"]',
			'[itemprop="review"]',
			'[data-review-id]',
			'[class*="reviews-card"]'
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
		if err := chromedp.Run(ctx, chromedp.Sleep(2500*time.Millisecond)); err != nil {
			return err
		}
	}

	log.Printf("[YandexParser] Scroll complete after %d iterations", maxScrolls)
	return nil
}

// rawReview holds data extracted from the DOM before conversion.
type rawReview struct {
	Author   string `json:"author"`
	Rating   int    `json:"rating"`
	Text     string `json:"text"`
	DateText string `json:"dateText"`
}

// extractReviewsFromDOM runs JavaScript to extract all review data from the rendered page.
func (p *YandexParser) extractReviewsFromDOM(ctx context.Context) ([]rawReview, error) {
	extractJS := `
	(function() {
		const results = [];

		// Strategy 1: Find review cards by known class patterns
		const reviewSelectors = [
			'[class*="business-reviews-card-view__review"]',
			'[class*="business-review-view"]',
			'[class*="orgpage-reviews-card"]',
			'[class*="review-card"]',
			'[itemprop="review"]',
			'[data-review-id]',
			'[class*="reviews-card"]'
		];

		let reviewElements = [];
		for (const sel of reviewSelectors) {
			const els = document.querySelectorAll(sel);
			if (els.length > reviewElements.length) {
				reviewElements = Array.from(els);
			}
		}

		for (const el of reviewElements) {
			const review = {};

			// Extract author
			const authorSelectors = [
				'[class*="business-review-view__author"] [class*="name"]',
				'[class*="review-author"]',
				'[itemprop="author"]',
				'[class*="author-name"]',
				'[class*="reviewer-name"]',
				'a[class*="user"]'
			];
			for (const sel of authorSelectors) {
				const authorEl = el.querySelector(sel);
				if (authorEl && authorEl.textContent.trim()) {
					review.author = authorEl.textContent.trim();
					break;
				}
			}
			if (!review.author) {
				// Fallback: find first link or span that looks like a name
				const links = el.querySelectorAll('a, span');
				for (const link of links) {
					const text = link.textContent.trim();
					if (text && text.length > 1 && text.length < 50 && !text.match(/^\d/) && !text.includes('отзыв')) {
						review.author = text;
						break;
					}
				}
			}
			if (!review.author) review.author = 'Аноним';

			// Extract rating by counting filled stars
			const starsSelectors = [
				'[class*="business-rating-badge-view__star"]',
				'[class*="rating-badge-view__star"]',
				'[class*="inline-stars"] [class*="star"]',
				'[class*="star-icon"]',
				'[class*="rating"] svg',
				'[class*="stars"] span'
			];
			let rating = 0;
			for (const sel of starsSelectors) {
				const stars = el.querySelectorAll(sel);
				if (stars.length > 0) {
					for (const star of stars) {
						const cls = star.className || '';
						const fill = star.getAttribute('fill') || '';
						const style = star.getAttribute('style') || '';
						// Filled star detection: class contains "side_full" / "_full" / "_active" / yellow color
						if (cls.includes('_full') || cls.includes('_active') || cls.includes('_filled') ||
							cls.includes('side_full') ||
							fill === '#ffa000' || fill === '#FFA000' || fill.includes('ffa') ||
							style.includes('ffa000') || style.includes('FFA000') ||
							star.querySelector('[fill="#FFA000"], [fill="#ffa000"]')) {
							rating++;
						}
					}
					if (rating > 0) break;
				}
			}
			// Try aria-label or title with rating
			if (rating === 0) {
				const ratingEl = el.querySelector('[class*="rating"], [aria-label*="оценк"], [aria-label*="рейтинг"]');
				if (ratingEl) {
					const label = ratingEl.getAttribute('aria-label') || ratingEl.getAttribute('title') || ratingEl.textContent;
					const match = label.match(/(\d)/);
					if (match) rating = parseInt(match[1]);
				}
			}
			review.rating = rating || 5;

			// Extract text
			const textSelectors = [
				'[class*="business-review-view__body-text"]',
				'[class*="review-text"]',
				'[class*="review-body"]',
				'[itemprop="description"]',
				'[class*="comment-text"]',
				'[class*="review-comment"]'
			];
			for (const sel of textSelectors) {
				const textEl = el.querySelector(sel);
				if (textEl && textEl.textContent.trim()) {
					review.text = textEl.textContent.trim();
					break;
				}
			}
			if (!review.text) {
				// Fallback: largest text block in the review card
				const spans = el.querySelectorAll('span, div, p');
				let longestText = '';
				for (const span of spans) {
					const text = span.textContent.trim();
					if (text.length > longestText.length && text.length > 20) {
						longestText = text;
					}
				}
				review.text = longestText;
			}
			if (!review.text) continue; // Skip reviews without text

			// Extract date
			const dateSelectors = [
				'[class*="business-review-view__date"]',
				'[class*="review-date"]',
				'[class*="review-time"]',
				'[itemprop="datePublished"]',
				'[class*="date"]',
				'span[class*="time"]'
			];
			for (const sel of dateSelectors) {
				const dateEl = el.querySelector(sel);
				if (dateEl) {
					const text = dateEl.textContent.trim();
					const dt = dateEl.getAttribute('datetime') || dateEl.getAttribute('content');
					review.dateText = dt || text;
					if (review.dateText) break;
				}
			}
			if (!review.dateText) {
				// Fallback: find text with "назад" (ago) or date-like pattern
				const allText = el.querySelectorAll('span, div');
				for (const t of allText) {
					const text = t.textContent.trim();
					if (text.match(/назад|ago|январ|феврал|март|апрел|мая|июн|июл|август|сентябр|октябр|ноябр|декабр/i) && text.length < 40) {
						review.dateText = text;
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
	dateText = strings.TrimSpace(strings.ToLower(dateText))

	if dateText == "" {
		return now
	}

	// Try ISO format first (datetime attribute)
	if t, err := time.Parse(time.RFC3339, dateText); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", dateText); err == nil {
		return t
	}

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

	return now
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

	if rating >= 4 && positiveCount > negativeCount {
		return string(entity.SentimentPositive)
	} else if rating <= 2 || negativeCount > positiveCount {
		return string(entity.SentimentNegative)
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

package parser

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/service"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/google/uuid"
)

type TwoGisParser struct {
	browserManager *BrowserManager
	rateLimiter    *RateLimiter
}

func NewTwoGisParser(browserManager *BrowserManager, rateLimiter *RateLimiter) *TwoGisParser {
	return &TwoGisParser{
		browserManager: browserManager,
		rateLimiter:    rateLimiter,
	}
}

var _ service.ReviewParser = (*TwoGisParser)(nil)

func (p *TwoGisParser) Source() string {
	return string(entity.Source2GIS)
}

func (p *TwoGisParser) ValidateURL(url string) bool {
	return regexp.MustCompile(`2gis\.(ru|com)/[^/]+/firm/\d+`).MatchString(url)
}

func (p *TwoGisParser) ExtractFirmID(url string) (string, error) {
	re := regexp.MustCompile(`/firm/(\d+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) < 2 {
		return "", fmt.Errorf("invalid 2GIS URL: firm ID not found")
	}
	return matches[1], nil
}

func (p *TwoGisParser) ensureReviewsURL(url string) string {
	url = strings.TrimRight(url, "/")
	if !strings.HasSuffix(url, "/tab/reviews") {
		// Remove any existing tab suffix
		if idx := strings.Index(url, "/tab/"); idx != -1 {
			url = url[:idx]
		}
		url += "/tab/reviews"
	}
	return url
}

func (p *TwoGisParser) ParseReviews(ctx context.Context, url string, opts service.ParseOptions) ([]entity.ParsedReview, error) {
	var result []entity.ParsedReview

	err := WithRetry(func() error {
		var parseErr error
		result, parseErr = p.parseReviewsInternal(ctx, url, opts)
		return parseErr
	}, 2)

	return result, err
}

func (p *TwoGisParser) parseReviewsInternal(ctx context.Context, url string, opts service.ParseOptions) ([]entity.ParsedReview, error) {
	reviewsURL := p.ensureReviewsURL(url)

	log.Printf("[TwoGisParser] Starting parse: %s (max=%d)", reviewsURL, opts.MaxReviews)

	tabCtx, cancel := p.browserManager.NewContext()
	defer cancel()

	// Navigate to the reviews page
	if err := chromedp.Run(tabCtx, chromedp.Navigate(reviewsURL)); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("timeout navigating to page: %w", err)
		}
		return nil, fmt.Errorf("failed to navigate to %s: %w", reviewsURL, err)
	}

	// Wait for reviews to load
	if err := p.waitForReviews(tabCtx); err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "captcha") || strings.Contains(errMsg, "капч") || strings.Contains(errMsg, "blocked") {
			return nil, fmt.Errorf("Сервис временно заблокировал доступ, попробуйте позже")
		}
		return nil, fmt.Errorf("Отзывы не найдены: %w", err)
	}

	log.Println("[TwoGisParser] Reviews loaded, clicking 'load more'")

	// Click "load more" button to get all reviews
	maxReviews := opts.MaxReviews
	if maxReviews <= 0 {
		maxReviews = 200
	}

	p.rateLimiter.Wait()
	if err := p.loadMoreReviews(tabCtx, maxReviews); err != nil {
		log.Printf("[TwoGisParser] WARNING: load more incomplete, returning partial results: %v", err)
	}

	// Expand truncated reviews ("Читать целиком") before extracting text
	var expandedCount int
	if err := chromedp.Run(tabCtx, chromedp.Evaluate(`(function(){
		var btns = document.querySelectorAll('._1e65qgv');
		btns.forEach(function(b){ b.click(); });
		return btns.length;
	})()`, &expandedCount, chromedp.EvalAsValue)); err == nil && expandedCount > 0 {
		log.Printf("[TwoGisParser] Expanded %d truncated reviews", expandedCount)
		if err := chromedp.Run(tabCtx, chromedp.Sleep(1*time.Second)); err != nil {
			log.Printf("[TwoGisParser] sleep after expand: %v", err)
		}
	}

	// Extract reviews from DOM
	rawReviews, err := p.extractReviewsFromDOM(tabCtx)
	if err != nil {
		return nil, fmt.Errorf("failed to extract reviews: %w", err)
	}

	log.Printf("[TwoGisParser] Extracted %d raw reviews", len(rawReviews))

	if len(rawReviews) == 0 {
		return nil, fmt.Errorf("Отзывы не найдены")
	}

	// Convert to ParsedReview and filter by date
	var result []entity.ParsedReview
	source := string(entity.Source2GIS)

	for _, raw := range rawReviews {
		reviewDate := parseRelativeDate(raw.DateText)

		// Only apply date filter when the date was successfully parsed.
		// Zero time means the date format was unrecognised — include the review rather than silently dropping it.
		if !reviewDate.IsZero() {
			if !opts.PeriodStart.IsZero() && reviewDate.Before(opts.PeriodStart) {
				continue
			}
			if !opts.PeriodEnd.IsZero() && reviewDate.After(opts.PeriodEnd) {
				continue
			}
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

	log.Printf("[TwoGisParser] Returning %d reviews after date filtering", len(result))
	return result, nil
}

// waitForReviews waits for review elements to appear on the 2GIS page.
// Polls with Go-side loop to avoid Promise serialization issues with chromedp.
func (p *TwoGisParser) waitForReviews(ctx context.Context) error {
	checkJS := `
	(function() {
		var selectors = [
			'[class*="review"]',
			'[data-review-id]'
		];
		for (var i = 0; i < selectors.length; i++) {
			if (document.querySelectorAll(selectors[i]).length > 0) {
				return 'found:' + selectors[i];
			}
		}
		var stars = document.querySelectorAll('svg path[d*="M12"]');
		if (stars.length >= 5) {
			return 'found:stars';
		}
		var body = document.body ? document.body.innerText : '';
		if (body.includes('Загрузить ещё') || body.includes('отзыв')) {
			return 'found:text-match';
		}
		return '';
	})()
	`

	for attempt := 0; attempt < 45; attempt++ {
		var matched string
		if err := chromedp.Run(ctx, chromedp.Evaluate(checkJS, &matched)); err != nil {
			return fmt.Errorf("waiting for reviews: %w", err)
		}
		if matched != "" {
			log.Printf("[TwoGisParser] Reviews detected: %s", matched)
			return nil
		}
		if err := chromedp.Run(ctx, chromedp.Sleep(1*time.Second)); err != nil {
			return err
		}
	}
	return fmt.Errorf("reviews not found after 45 attempts")
}

// loadMoreReviews clicks the "load more reviews" button repeatedly to load all reviews.
func (p *TwoGisParser) loadMoreReviews(ctx context.Context, maxReviews int) error {
	maxClicks := maxReviews / 10
	if maxClicks < 3 {
		maxClicks = 3
	}
	if maxClicks > 40 {
		maxClicks = 40
	}

	countJS := `(function() {
		var byAttr = document.querySelectorAll('[data-review-id]');
		if (byAttr.length > 0) return byAttr.length;
		var allDivs = document.querySelectorAll('div');
		var count = 0;
		for (var div of allDivs) {
			var stars = div.querySelectorAll(':scope > svg, :scope > span > svg');
			if (stars.length === 5) count++;
		}
		if (count > 0) return count;
		return document.querySelectorAll('[style*="pre-line"], [style*="line-clamp"]').length;
	})()`

	clickOneJS := `(function() {
		var loadMoreTexts = ['Загрузить ещё', 'Показать ещё', 'Ещё отзывы', 'Загрузить еще', 'Показать еще'];
		var clickables = document.querySelectorAll('button, [role="button"], a, [class*="button"]');
		for (var el of clickables) {
			var text = el.textContent.trim();
			for (var variant of loadMoreTexts) {
				if (text.includes(variant)) {
					el.scrollIntoView({ behavior: 'instant', block: 'center' });
					el.click();
					return true;
				}
			}
		}
		return false;
	})()`

	var prevCount int
	noChangeCount := 0

	for i := 0; i < maxClicks; i++ {
		var currentCount int
		if err := chromedp.Run(ctx, chromedp.Evaluate(countJS, &currentCount, chromedp.EvalAsValue)); err != nil {
			return fmt.Errorf("count failed: %w", err)
		}
		if currentCount >= maxReviews {
			break
		}
		if currentCount == prevCount {
			noChangeCount++
			if noChangeCount >= 2 {
				break
			}
		} else {
			noChangeCount = 0
		}
		prevCount = currentCount

		var clicked bool
		if err := chromedp.Run(ctx, chromedp.Evaluate(clickOneJS, &clicked, chromedp.EvalAsValue)); err != nil {
			return fmt.Errorf("click failed: %w", err)
		}
		if !clicked {
			log.Printf("[TwoGisParser] No 'load more' button found after %d clicks", i)
			break
		}
		log.Printf("[TwoGisParser] Load more click %d, current count: %d", i+1, currentCount)

		if err := chromedp.Run(ctx, chromedp.Sleep(2500*time.Millisecond)); err != nil {
			return err
		}
	}
	return nil
}

// extractReviewsFromDOM extracts review data from the rendered 2GIS page via JavaScript.
//
// Карточка отзыва 2ГИС имеет такую структуру:
//
//	div (корень карточки, без класса)
//	  ├── div._my60n2
//	  │   └── span._19h0cqe  — имя автора (атрибут title содержит полное имя)
//	  └── div._ai6fyf
//	      ├── div._1fkin5c   — звёзды (width = rating * 16px)
//	      ├── span._10c0hgu  — дата
//	      └── div._83kmcy    — текст отзыва
//	          └── a._oxthv5 / a._co8kyiw
func (p *TwoGisParser) extractReviewsFromDOM(ctx context.Context) ([]rawReview, error) {
	extractJS := `
	(function() {
		var results = [];

		var containers = document.querySelectorAll('._83kmcy');

		for (var i = 0; i < containers.length; i++) {
			var container = containers[i];

			// contentArea = div._ai6fyf (содержит звёзды, дату и текст)
			var contentArea = container.parentElement;
			if (!contentArea) continue;

			// cardRoot = общий родитель блока автора и блока контента
			var cardRoot = contentArea.parentElement;
			if (!cardRoot) continue;

			// --- Текст ---
			var textEl = container.querySelector('a._co8kyiw') ||
			             container.querySelector('a._oxthv5') ||
			             container.querySelector('a');
			var text = textEl ? textEl.textContent.trim() : '';
			if (!text || text.length < 2) continue;

			// --- Дата ---
			var dateEl = contentArea.querySelector('._10c0hgu');
			var dateText = dateEl ? dateEl.textContent.trim() : '';

			// --- Рейтинг ---
			var rating = 5;
			var starsEl = contentArea.querySelector('._1fkin5c');
			if (starsEl && starsEl.style.width) {
				var w = parseInt(starsEl.style.width);
				if (w >= 16 && w <= 80) rating = Math.round(w / 16);
			}

			// --- Автор ---
			// span._19h0cqe живёт в div._my60n2 — соседнем блоке с cardRoot.
			// Атрибут title содержит полное имя; textContent — запасной вариант.
			var author = 'Аноним';
			var authorEl = cardRoot.querySelector('._19h0cqe');
			if (authorEl) {
				author = authorEl.getAttribute('title') || authorEl.textContent.trim() || 'Аноним';
			}

			results.push({ text: text, dateText: dateText, rating: rating, author: author });
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

// FindOrgURL searches 2GIS by org name (+ optional address) and returns the direct firm URL.
// Uses the 2GIS Catalog API when TWOGIS_API_KEY is set; returns "" if not found.
func (p *TwoGisParser) FindOrgURL(ctx context.Context, name, address string) (string, error) {
	return globalTwoGisAPIClient.findFirmURL(ctx, name, address)
}

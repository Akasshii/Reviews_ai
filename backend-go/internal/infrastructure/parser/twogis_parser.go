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

		if !opts.PeriodStart.IsZero() && reviewDate.Before(opts.PeriodStart) {
			continue
		}
		if !opts.PeriodEnd.IsZero() && reviewDate.After(opts.PeriodEnd) {
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

	for attempt := 0; attempt < 30; attempt++ {
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
	return fmt.Errorf("reviews not found after 30 attempts")
}

// loadMoreReviews clicks the "Загрузить ещё" button repeatedly to load all reviews.
func (p *TwoGisParser) loadMoreReviews(ctx context.Context, maxReviews int) error {
	maxClicks := maxReviews / 10
	if maxClicks < 3 {
		maxClicks = 3
	}
	if maxClicks > 40 {
		maxClicks = 40
	}

	loadMoreJS := fmt.Sprintf(`
	(async function() {
		const maxClicks = %d;
		const maxReviews = %d;
		let clicks = 0;

		const countReviews = () => {
			// Count review cards by looking for elements with star ratings
			// Each review card typically has a group of 5 star SVGs
			const allDivs = document.querySelectorAll('div');
			let count = 0;
			for (const div of allDivs) {
				const stars = div.querySelectorAll(':scope > svg, :scope > span > svg');
				if (stars.length === 5) {
					count++;
				}
			}
			if (count > 0) return count;

			// Fallback: count by text blocks that look like reviews
			const textBlocks = document.querySelectorAll('[style*="pre-line"], [style*="line-clamp"]');
			return textBlocks.length;
		};

		const findLoadMoreBtn = () => {
			// Find button with text "Загрузить ещё"
			const buttons = document.querySelectorAll('button');
			for (const btn of buttons) {
				if (btn.textContent.trim().includes('Загрузить ещё')) {
					return btn;
				}
			}
			// Also try div/span acting as button
			const clickables = document.querySelectorAll('[role="button"], a, [class*="button"]');
			for (const el of clickables) {
				if (el.textContent.trim().includes('Загрузить ещё')) {
					return el;
				}
			}
			return null;
		};

		for (let i = 0; i < maxClicks; i++) {
			const btn = findLoadMoreBtn();
			if (!btn) break;

			const currentCount = countReviews();
			if (currentCount >= maxReviews) break;

			btn.click();
			clicks++;
			await new Promise(r => setTimeout(r, 2500));
		}
		return 'clicked:' + clicks;
	})()
	`, maxClicks, maxReviews)

	var result string
	if err := chromedp.Run(ctx, chromedp.Evaluate(loadMoreJS, &result, chromedp.EvalAsValue)); err != nil {
		return fmt.Errorf("load more failed: %w", err)
	}

	log.Printf("[TwoGisParser] Load more result: %s", result)
	return nil
}

// extractReviewsFromDOM extracts review data from the rendered 2GIS page via JavaScript.
func (p *TwoGisParser) extractReviewsFromDOM(ctx context.Context) ([]rawReview, error) {
	extractJS := `
	(function() {
		const results = [];

		// Strategy: Find review cards in the DOM.
		// 2GIS uses obfuscated class names, so we identify reviews by structure:
		// Each review card contains: author name, star rating (5 SVGs), review text, date.

		// Find the scrollable review list container
		const findReviewCards = () => {
			// Approach 1: Look for containers with data-review-id
			let cards = document.querySelectorAll('[data-review-id]');
			if (cards.length > 0) return Array.from(cards);

			// Approach 2: Look for elements matching the review card structure
			// Review cards in 2GIS are typically direct children of the review list
			// Each has: author block, stars block, text block, date block
			const allDivs = document.querySelectorAll('div');
			const candidates = [];

			for (const div of allDivs) {
				// A review card likely contains a date-like text and review text
				const text = div.innerText || '';
				const childDivs = div.querySelectorAll(':scope > div');

				// Check if this div has the right structure (3-6 direct child divs)
				if (childDivs.length >= 2 && childDivs.length <= 10) {
					// Must contain star SVGs
					const svgs = div.querySelectorAll('svg');
					if (svgs.length >= 5) {
						// Must have some text content (review body)
						if (text.length > 30 && text.length < 5000) {
							// Check it's not a parent container (shouldn't contain too many SVG groups)
							if (svgs.length <= 20) {
								candidates.push(div);
							}
						}
					}
				}
			}

			// Filter out parent-child duplicates (keep the most specific)
			const filtered = candidates.filter(el => {
				return !candidates.some(other => other !== el && el.contains(other));
			});

			return filtered;
		};

		const cards = findReviewCards();

		for (const card of cards) {
			const review = {};

			// Extract author name
			// In 2GIS, author name is typically a link or styled span near the top of the card
			const links = card.querySelectorAll('a');
			for (const link of links) {
				const text = link.textContent.trim();
				// Author names are short, don't contain typical non-name words
				if (text && text.length > 1 && text.length < 60 &&
					!text.includes('Загрузить') && !text.includes('отзыв') &&
					!text.includes('Ответ') && !text.match(/^\d/)) {
					review.author = text;
					break;
				}
			}
			if (!review.author) {
				// Try spans with font-weight 500 or bold
				const spans = card.querySelectorAll('span, div');
				for (const span of spans) {
					const style = window.getComputedStyle(span);
					const text = span.textContent.trim();
					if (text && text.length > 1 && text.length < 60 &&
						(style.fontWeight === '500' || style.fontWeight === 'bold' || style.fontWeight === '700') &&
						span.children.length === 0 &&
						!text.includes('Загрузить') && !text.includes('отзыв') &&
						!text.includes('Ответ')) {
						review.author = text;
						break;
					}
				}
			}
			if (!review.author) review.author = 'Аноним';

			// Extract rating by counting filled/colored stars
			const svgs = card.querySelectorAll('svg');
			let rating = 0;
			let starCount = 0;
			for (const svg of svgs) {
				const paths = svg.querySelectorAll('path');
				for (const path of paths) {
					const fill = path.getAttribute('fill') || '';
					const d = path.getAttribute('d') || '';
					// Star paths typically have a specific d attribute pattern
					if (d.length > 20) {
						starCount++;
						// Filled stars have colored fill (yellow/orange), empty stars have gray/light fill
						if (fill && !fill.includes('none') &&
							(fill.includes('#f') || fill.includes('#F') ||
							 fill.includes('#e') || fill.includes('#E') ||
							 fill === '#ffa500' || fill === '#FFA500' ||
							 fill === '#FFB800' || fill === '#ffb800' ||
							 fill.match(/^#[fFeEdD]/))) {
							rating++;
						}
					}
				}
				// If we found a group of exactly 5 star-like paths, stop
				if (starCount >= 5) break;
			}
			// Normalize: if we somehow got more than 5, cap at 5
			if (rating > 5) rating = 5;
			review.rating = rating || 5;

			// Extract review text
			// The review text is typically the longest text block in the card
			const textElements = card.querySelectorAll('span, div, p');
			let longestText = '';
			for (const el of textElements) {
				const text = el.textContent.trim();
				const style = window.getComputedStyle(el);
				// Review text usually has pre-line white-space or line-clamp
				if (text.length > longestText.length && text.length > 15 && text.length < 3000) {
					// Exclude elements that are clearly not review text
					if (!text.includes('Загрузить ещё') &&
						!text.includes('Ответ компании') &&
						el.children.length <= 3) {
						// Prefer elements with pre-line style (review text in 2GIS)
						if (style.whiteSpace === 'pre-line' || style.webkitLineClamp) {
							longestText = text;
						} else if (text.length > longestText.length && longestText === '') {
							longestText = text;
						}
					}
				}
			}
			review.text = longestText;
			if (!review.text) continue;

			// Extract date
			// Date in 2GIS is typically small gray text like "2 дня назад", "15 января 2025"
			const allSpans = card.querySelectorAll('span, div, time');
			for (const span of allSpans) {
				const text = span.textContent.trim();
				const style = window.getComputedStyle(span);

				// Check for datetime attribute
				const dt = span.getAttribute('datetime');
				if (dt) {
					review.dateText = dt;
					break;
				}

				// Date text is typically short and gray
				if (text.length > 3 && text.length < 40 &&
					span.children.length === 0) {
					// Check if it looks like a date
					if (text.match(/назад|вчера|сегодня|январ|феврал|март|апрел|мая|июн|июл|август|сентябр|октябр|ноябр|декабр|\d{1,2}\.\d{1,2}\.\d{4}/i)) {
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

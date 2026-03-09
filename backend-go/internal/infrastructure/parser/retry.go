package parser

import (
	"context"
	"log"
	"strings"
	"time"
)

// WithRetry executes fn with exponential backoff retries.
// Retries on chromedp timeouts and context.DeadlineExceeded.
// Does NOT retry on navigation errors (page not found, captcha).
func WithRetry(fn func() error, maxRetries int) error {
	var err error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		err = fn()
		if err == nil {
			return nil
		}

		if !isRetryable(err) {
			log.Printf("[Retry] Non-retryable error, giving up: %v", err)
			return err
		}

		if attempt < maxRetries {
			backoff := time.Duration(2<<uint(attempt)) * time.Second // 2s, 4s
			log.Printf("[Retry] Attempt %d/%d failed: %v. Retrying in %v...", attempt+1, maxRetries+1, err, backoff)
			time.Sleep(backoff)
		}
	}
	return err
}

// isRetryable returns true for timeout-related errors that warrant a retry.
func isRetryable(err error) bool {
	if err == nil {
		return false
	}

	// Don't retry navigation/block errors
	msg := err.Error()
	nonRetryable := []string{
		"captcha",
		"заблокировал",
		"blocked",
		"page not found",
		"не найден",
		"reviews not found",
		"Отзывы не найдены",
	}
	for _, s := range nonRetryable {
		if strings.Contains(strings.ToLower(msg), strings.ToLower(s)) {
			return false
		}
	}

	// Retry on timeouts
	if err == context.DeadlineExceeded {
		return true
	}
	retryable := []string{
		"context deadline exceeded",
		"timeout",
		"deadline",
	}
	for _, s := range retryable {
		if strings.Contains(strings.ToLower(msg), s) {
			return true
		}
	}

	return false
}

package parser

import (
	"os"
	"strconv"
	"sync"
	"time"
)

// RateLimiter enforces a minimum delay between requests to the same domain.
type RateLimiter struct {
	mu       sync.Mutex
	delay    time.Duration
	lastCall time.Time
}

// NewRateLimiter creates a RateLimiter with delay from PARSER_SCROLL_DELAY_MS env (default 2000ms).
func NewRateLimiter() *RateLimiter {
	delay := 2000 * time.Millisecond
	if v := os.Getenv("PARSER_SCROLL_DELAY_MS"); v != "" {
		if ms, err := strconv.Atoi(v); err == nil && ms > 0 {
			delay = time.Duration(ms) * time.Millisecond
		}
	}
	return &RateLimiter{delay: delay}
}

// Wait blocks until the minimum delay since the last call has elapsed.
func (rl *RateLimiter) Wait() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if !rl.lastCall.IsZero() {
		elapsed := time.Since(rl.lastCall)
		if elapsed < rl.delay {
			time.Sleep(rl.delay - elapsed)
		}
	}
	rl.lastCall = time.Now()
}

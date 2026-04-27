package parser

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/chromedp/chromedp"
)

type BrowserManager struct {
	allocCtx    context.Context
	allocCancel context.CancelFunc
	pageTimeout time.Duration
}

func NewBrowserManager() *BrowserManager {
	pageTimeout := 90 * time.Second
	if v := os.Getenv("PARSER_TIMEOUT_SEC"); v != "" {
		if sec, err := strconv.Atoi(v); err == nil {
			pageTimeout = time.Duration(sec) * time.Second
		}
	}

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		chromedp.Flag("lang", "ru-RU"),
		chromedp.Flag("accept-lang", "ru-RU,ru;q=0.9"),
		chromedp.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
	)

	if chromeBin := os.Getenv("CHROME_BIN"); chromeBin != "" {
		opts = append(opts, chromedp.ExecPath(chromeBin))
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)

	log.Println("BrowserManager initialized (headless Chrome)")

	return &BrowserManager{
		allocCtx:    allocCtx,
		allocCancel: allocCancel,
		pageTimeout: pageTimeout,
	}
}

// NewContext creates a new browser tab context for a single parsing request.
// The caller must call the returned cancel function when done.
func (bm *BrowserManager) NewContext() (context.Context, context.CancelFunc) {
	ctx, cancel := chromedp.NewContext(bm.allocCtx)
	ctx, timeoutCancel := context.WithTimeout(ctx, bm.pageTimeout)

	combinedCancel := func() {
		timeoutCancel()
		cancel()
	}

	return ctx, combinedCancel
}

// PageTimeout returns the configured page timeout duration.
func (bm *BrowserManager) PageTimeout() time.Duration {
	return bm.pageTimeout
}

// Close shuts down the browser allocator and all associated contexts.
func (bm *BrowserManager) Close() {
	log.Println("BrowserManager shutting down...")
	bm.allocCancel()
}

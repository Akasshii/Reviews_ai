package service

import (
	"context"
	"reviews-ai/internal/domain/entity"
	"time"
)

type ReviewParser interface {
	ParseReviews(ctx context.Context, url string, opts ParseOptions) ([]entity.ParsedReview, error)
	ValidateURL(url string) bool
	Source() string
}

type ParseOptions struct {
	PeriodStart time.Time
	PeriodEnd   time.Time
	MaxReviews  int
}

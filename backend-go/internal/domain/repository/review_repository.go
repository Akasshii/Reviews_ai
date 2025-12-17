package repository

import (
	"context"
	"reviews-ai/internal/domain/entity"

	"github.com/google/uuid"
)

type ReviewRepository interface {
	Create(ctx context.Context, review *entity.Review) error
	CreateBatch(ctx context.Context, reviews []entity.Review) error
	FindByReportID(ctx context.Context, reportID uuid.UUID) ([]entity.Review, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

package repository

import (
	"context"
	"reviews-ai/internal/domain/entity"

	"github.com/google/uuid"
)

type ReportRepository interface {
	Create(ctx context.Context, report *entity.Report) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Report, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]entity.Report, error)
	Update(ctx context.Context, report *entity.Report) error
	Delete(ctx context.Context, id uuid.UUID) error
	CreateCategoryStats(ctx context.Context, stats []entity.CategoryStat) error
}

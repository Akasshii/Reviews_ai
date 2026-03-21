package repository

import (
	"context"
	"reviews-ai/internal/domain/entity"

	"github.com/google/uuid"
)

type LocationRepository interface {
	Create(ctx context.Context, location *entity.Location) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Location, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]entity.Location, error)
	Update(ctx context.Context, location *entity.Location) error
	Delete(ctx context.Context, id uuid.UUID) error
}

package repository

import (
	"context"
	"reviews-ai/internal/domain/entity"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)
	Update(ctx context.Context, id uuid.UUID, dto *entity.UpdateUserDTO) (*entity.User, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error
	Delete(ctx context.Context, id uuid.UUID) error
}

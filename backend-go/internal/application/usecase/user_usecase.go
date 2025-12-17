package usecase

import (
	"context"
	"errors"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"

	"github.com/google/uuid"
)

type UserUseCase struct {
	userRepo repository.UserRepository
}

func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
	return &UserUseCase{
		userRepo: userRepo,
	}
}

func (uc *UserUseCase) GetProfile(ctx context.Context, userID uuid.UUID) (*entity.User, error) {
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (uc *UserUseCase) UpdateProfile(ctx context.Context, userID uuid.UUID, dto *entity.UpdateUserDTO) (*entity.User, error) {
	// Check if user exists
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Update user
	updatedUser, err := uc.userRepo.Update(ctx, userID, dto)
	if err != nil {
		return nil, err
	}

	return updatedUser, nil
}

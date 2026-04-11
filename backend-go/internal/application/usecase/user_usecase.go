package usecase

import (
	"context"
	"errors"
	"fmt"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"
	"reviews-ai/pkg/utils"

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

func (uc *UserUseCase) ChangePassword(ctx context.Context, userID uuid.UUID, dto *entity.ChangePasswordDTO) error {
	// 1. Найти пользователя
	user, err := uc.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("пользователь не найден: %w", err)
	}
	if user == nil {
		return errors.New("пользователь не найден")
	}

	// 2. Проверить текущий пароль
	if !utils.CheckPassword(dto.CurrentPassword, user.Password) {
		return fmt.Errorf("неверный текущий пароль")
	}

	// 3. Хешировать новый пароль
	hashedPassword, err := utils.HashPassword(dto.NewPassword)
	if err != nil {
		return fmt.Errorf("ошибка хеширования пароля: %w", err)
	}

	// 4. Обновить в БД
	if err := uc.userRepo.UpdatePassword(ctx, userID, hashedPassword); err != nil {
		return fmt.Errorf("ошибка обновления пароля: %w", err)
	}

	return nil
}

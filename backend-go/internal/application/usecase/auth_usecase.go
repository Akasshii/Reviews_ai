package usecase

import (
	"context"
	"errors"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"
	"reviews-ai/pkg/utils"
	"time"

	"github.com/google/uuid"
)

type AuthUseCase struct {
	userRepo repository.UserRepository
}

func NewAuthUseCase(userRepo repository.UserRepository) *AuthUseCase {
	return &AuthUseCase{
		userRepo: userRepo,
	}
}

func (uc *AuthUseCase) Register(ctx context.Context, dto *entity.CreateUserDTO) (*entity.AuthResponse, error) {
	// Check if user already exists
	existingUser, err := uc.userRepo.FindByEmail(ctx, dto.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("user already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(dto.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &entity.User{
		ID:        uuid.New(),
		Email:     dto.Email,
		Password:  hashedPassword,
		Name:      dto.Name,
		Role:      "user",
		Company:   dto.Company,
		Position:  dto.Position,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &entity.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (uc *AuthUseCase) Login(ctx context.Context, dto *entity.LoginDTO) (*entity.AuthResponse, error) {
	// Find user
	user, err := uc.userRepo.FindByEmail(ctx, dto.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	// Check password
	if !utils.CheckPassword(dto.Password, user.Password) {
		return nil, errors.New("invalid credentials")
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &entity.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

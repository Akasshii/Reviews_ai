package usecase

import (
	"context"
	"errors"
	"fmt"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"
	"time"

	"github.com/google/uuid"
)

type LocationUseCase struct {
	locationRepo repository.LocationRepository
}

func NewLocationUseCase(locationRepo repository.LocationRepository) *LocationUseCase {
	return &LocationUseCase{locationRepo: locationRepo}
}

func (uc *LocationUseCase) CreateLocation(ctx context.Context, userID uuid.UUID, dto *entity.CreateLocationDTO) (*entity.Location, error) {
	location := &entity.Location{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      dto.Name,
		Address:   dto.Address,
		Latitude:  dto.Latitude,
		Longitude: dto.Longitude,
		YandexURL: dto.YandexURL,
		TwoGisURL: dto.TwoGisURL,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := uc.locationRepo.Create(ctx, location); err != nil {
		return nil, fmt.Errorf("failed to create location: %w", err)
	}

	return location, nil
}

func (uc *LocationUseCase) GetLocations(ctx context.Context, userID uuid.UUID) ([]entity.Location, error) {
	return uc.locationRepo.FindByUserID(ctx, userID)
}

func (uc *LocationUseCase) GetLocationByID(ctx context.Context, locationID uuid.UUID, userID uuid.UUID) (*entity.Location, error) {
	location, err := uc.locationRepo.FindByID(ctx, locationID)
	if err != nil {
		return nil, err
	}
	if location == nil {
		return nil, errors.New("location not found")
	}
	if location.UserID != userID {
		return nil, errors.New("access denied")
	}
	return location, nil
}

func (uc *LocationUseCase) UpdateLocation(ctx context.Context, locationID uuid.UUID, userID uuid.UUID, dto *entity.UpdateLocationDTO) (*entity.Location, error) {
	location, err := uc.locationRepo.FindByID(ctx, locationID)
	if err != nil {
		return nil, err
	}
	if location == nil {
		return nil, errors.New("location not found")
	}
	if location.UserID != userID {
		return nil, errors.New("access denied")
	}

	if dto.Name != nil {
		location.Name = *dto.Name
	}
	if dto.Address != nil {
		location.Address = dto.Address
	}
	if dto.Latitude != nil {
		location.Latitude = dto.Latitude
	}
	if dto.Longitude != nil {
		location.Longitude = dto.Longitude
	}
	if dto.YandexURL != nil {
		location.YandexURL = dto.YandexURL
	}
	if dto.TwoGisURL != nil {
		location.TwoGisURL = dto.TwoGisURL
	}

	if err := uc.locationRepo.Update(ctx, location); err != nil {
		return nil, fmt.Errorf("failed to update location: %w", err)
	}

	return location, nil
}

func (uc *LocationUseCase) DeleteLocation(ctx context.Context, locationID uuid.UUID, userID uuid.UUID) error {
	location, err := uc.locationRepo.FindByID(ctx, locationID)
	if err != nil {
		return err
	}
	if location == nil {
		return errors.New("location not found")
	}
	if location.UserID != userID {
		return errors.New("access denied")
	}
	return uc.locationRepo.Delete(ctx, locationID)
}

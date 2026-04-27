package entity

import (
	"time"

	"github.com/google/uuid"
)

type Location struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	Name      string    `json:"name"`
	Address   *string   `json:"address,omitempty"`
	Latitude  *float64  `json:"latitude,omitempty"`
	Longitude *float64  `json:"longitude,omitempty"`
	YandexURL *string   `json:"yandexUrl,omitempty"`
	TwoGisURL *string   `json:"twogisUrl,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateLocationDTO struct {
	Name      string   `json:"name" binding:"required"`
	Address   *string  `json:"address"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	YandexURL *string  `json:"yandexUrl"`
	TwoGisURL *string  `json:"twogisUrl"`
}

type UpdateLocationDTO struct {
	Name      *string  `json:"name"`
	Address   *string  `json:"address"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	YandexURL *string  `json:"yandexUrl"`
	TwoGisURL *string  `json:"twogisUrl"`
}

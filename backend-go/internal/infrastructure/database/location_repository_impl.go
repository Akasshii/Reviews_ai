package database

import (
	"context"
	"database/sql"
	"fmt"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"

	"github.com/google/uuid"
)

type LocationRepositoryImpl struct {
	db *sql.DB
}

func NewLocationRepository(db *sql.DB) repository.LocationRepository {
	return &LocationRepositoryImpl{db: db}
}

func (r *LocationRepositoryImpl) Create(ctx context.Context, location *entity.Location) error {
	query := `
		INSERT INTO locations (id, user_id, name, address, latitude, longitude, yandex_url, twogis_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		location.ID,
		location.UserID,
		location.Name,
		location.Address,
		location.Latitude,
		location.Longitude,
		location.YandexURL,
		location.TwoGisURL,
	).Scan(&location.CreatedAt, &location.UpdatedAt)
}

func (r *LocationRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*entity.Location, error) {
	query := `
		SELECT id, user_id, name, address, latitude, longitude, yandex_url, twogis_url, created_at, updated_at
		FROM locations WHERE id = $1`

	loc := &entity.Location{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&loc.ID, &loc.UserID, &loc.Name, &loc.Address,
		&loc.Latitude, &loc.Longitude,
		&loc.YandexURL, &loc.TwoGisURL,
		&loc.CreatedAt, &loc.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find location: %w", err)
	}
	return loc, nil
}

func (r *LocationRepositoryImpl) FindByUserID(ctx context.Context, userID uuid.UUID) ([]entity.Location, error) {
	query := `
		SELECT id, user_id, name, address, latitude, longitude, yandex_url, twogis_url, created_at, updated_at
		FROM locations WHERE user_id = $1 ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query locations: %w", err)
	}
	defer rows.Close()

	var locations []entity.Location
	for rows.Next() {
		var loc entity.Location
		if err := rows.Scan(
			&loc.ID, &loc.UserID, &loc.Name, &loc.Address,
			&loc.Latitude, &loc.Longitude,
			&loc.YandexURL, &loc.TwoGisURL,
			&loc.CreatedAt, &loc.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan location: %w", err)
		}
		locations = append(locations, loc)
	}
	return locations, nil
}

func (r *LocationRepositoryImpl) Update(ctx context.Context, location *entity.Location) error {
	query := `
		UPDATE locations SET
			name = COALESCE($1, name),
			address = COALESCE($2, address),
			latitude = COALESCE($3, latitude),
			longitude = COALESCE($4, longitude),
			yandex_url = COALESCE($5, yandex_url),
			twogis_url = COALESCE($6, twogis_url)
		WHERE id = $7
		RETURNING updated_at`

	return r.db.QueryRowContext(ctx, query,
		location.Name,
		location.Address,
		location.Latitude,
		location.Longitude,
		location.YandexURL,
		location.TwoGisURL,
		location.ID,
	).Scan(&location.UpdatedAt)
}

func (r *LocationRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM locations WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete location: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("location not found")
	}
	return nil
}

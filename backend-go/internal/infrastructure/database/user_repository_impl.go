package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"
	"time"

	"github.com/google/uuid"
)

type userRepositoryImpl struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) repository.UserRepository {
	return &userRepositoryImpl{db: db}
}

func (r *userRepositoryImpl) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (id, email, password, name, role, company, position, avatar, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.Password,
		user.Name,
		user.Role,
		user.Company,
		user.Position,
		user.Avatar,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return err
}

func (r *userRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	query := `
		SELECT id, email, password, name, role, company, position, avatar, created_at, updated_at
		FROM users WHERE id = $1
	`
	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.Name,
		&user.Role,
		&user.Company,
		&user.Position,
		&user.Avatar,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

func (r *userRepositoryImpl) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	query := `
		SELECT id, email, password, name, role, company, position, avatar, created_at, updated_at
		FROM users WHERE email = $1
	`
	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.Name,
		&user.Role,
		&user.Company,
		&user.Position,
		&user.Avatar,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

func (r *userRepositoryImpl) Update(ctx context.Context, id uuid.UUID, dto *entity.UpdateUserDTO) (*entity.User, error) {
	query := `
		UPDATE users
		SET name = COALESCE($1, name),
		    company = COALESCE($2, company),
		    position = COALESCE($3, position),
		    avatar = COALESCE($4, avatar),
		    updated_at = $5
		WHERE id = $6
		RETURNING id, email, password, name, role, company, position, avatar, created_at, updated_at
	`
	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query,
		dto.Name,
		dto.Company,
		dto.Position,
		dto.Avatar,
		time.Now(),
		id,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.Name,
		&user.Role,
		&user.Company,
		&user.Position,
		&user.Avatar,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepositoryImpl) UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error {
	query := `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, hashedPassword, id)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (r *userRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

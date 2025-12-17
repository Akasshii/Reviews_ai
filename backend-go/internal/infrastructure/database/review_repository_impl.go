package database

import (
	"context"
	"database/sql"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type reviewRepositoryImpl struct {
	db *sql.DB
}

func NewReviewRepository(db *sql.DB) repository.ReviewRepository {
	return &reviewRepositoryImpl{db: db}
}

func (r *reviewRepositoryImpl) Create(ctx context.Context, review *entity.Review) error {
	query := `
		INSERT INTO reviews (id, report_id, author, rating, text, date, source, categories, sentiment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.ExecContext(ctx, query,
		review.ID,
		review.ReportID,
		review.Author,
		review.Rating,
		review.Text,
		review.Date,
		review.Source,
		pq.Array(review.Categories),
		review.Sentiment,
		review.CreatedAt,
	)
	return err
}

func (r *reviewRepositoryImpl) CreateBatch(ctx context.Context, reviews []entity.Review) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO reviews (id, report_id, author, rating, text, date, source, categories, sentiment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, review := range reviews {
		_, err := stmt.ExecContext(ctx,
			review.ID,
			review.ReportID,
			review.Author,
			review.Rating,
			review.Text,
			review.Date,
			review.Source,
			pq.Array(review.Categories),
			review.Sentiment,
			review.CreatedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *reviewRepositoryImpl) FindByReportID(ctx context.Context, reportID uuid.UUID) ([]entity.Review, error) {
	query := `
		SELECT id, report_id, author, rating, text, date, source, categories, sentiment, created_at
		FROM reviews WHERE report_id = $1 ORDER BY date DESC
	`
	rows, err := r.db.QueryContext(ctx, query, reportID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []entity.Review
	for rows.Next() {
		var review entity.Review
		var categories pq.StringArray
		err := rows.Scan(
			&review.ID,
			&review.ReportID,
			&review.Author,
			&review.Rating,
			&review.Text,
			&review.Date,
			&review.Source,
			&categories,
			&review.Sentiment,
			&review.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		review.Categories = categories
		reviews = append(reviews, review)
	}

	return reviews, nil
}

func (r *reviewRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM reviews WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type reportRepositoryImpl struct {
	db *sql.DB
}

func NewReportRepository(db *sql.DB) repository.ReportRepository {
	return &reportRepositoryImpl{db: db}
}

func (r *reportRepositoryImpl) Create(ctx context.Context, report *entity.Report) error {
	ratingDistJSON, err := json.Marshal(report.RatingDistribution)
	if err != nil {
		return err
	}

	var sourceStatsJSON []byte
	if report.SourceStats != nil {
		sourceStatsJSON, err = json.Marshal(report.SourceStats)
		if err != nil {
			return err
		}
	}

	query := `
		INSERT INTO reports (
			id, user_id, title, period_start, period_end, source, source_stats, summary,
			insights, recommendations, total_reviews, average_rating,
			positive_reviews, neutral_reviews, negative_reviews,
			rating_distribution, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`
	_, err = r.db.ExecContext(ctx, query,
		report.ID,
		report.UserID,
		report.Title,
		report.PeriodStart,
		report.PeriodEnd,
		report.Source,
		nullableJSON(sourceStatsJSON),
		report.Summary,
		pq.Array(report.Insights),
		pq.Array(report.Recommendations),
		report.TotalReviews,
		report.AverageRating,
		report.PositiveReviews,
		report.NeutralReviews,
		report.NegativeReviews,
		ratingDistJSON,
		report.CreatedAt,
		report.UpdatedAt,
	)
	return err
}

func (r *reportRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*entity.Report, error) {
	query := `
		SELECT
			id, user_id, title, period_start, period_end, source, source_stats, summary,
			insights, recommendations, total_reviews, average_rating,
			positive_reviews, neutral_reviews, negative_reviews,
			rating_distribution, created_at, updated_at
		FROM reports WHERE id = $1
	`
	report := &entity.Report{}
	var ratingDistJSON []byte
	var sourceStatsJSON []byte
	var insights, recommendations pq.StringArray

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&report.ID,
		&report.UserID,
		&report.Title,
		&report.PeriodStart,
		&report.PeriodEnd,
		&report.Source,
		&sourceStatsJSON,
		&report.Summary,
		&insights,
		&recommendations,
		&report.TotalReviews,
		&report.AverageRating,
		&report.PositiveReviews,
		&report.NeutralReviews,
		&report.NegativeReviews,
		&ratingDistJSON,
		&report.CreatedAt,
		&report.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	report.Insights = insights
	report.Recommendations = recommendations

	if err := json.Unmarshal(ratingDistJSON, &report.RatingDistribution); err != nil {
		return nil, err
	}

	if len(sourceStatsJSON) > 0 {
		var ss entity.SourcePlatformStats
		if err := json.Unmarshal(sourceStatsJSON, &ss); err == nil {
			report.SourceStats = &ss
		}
	}

	// Load reviews
	reviewsQuery := `
		SELECT id, report_id, author, rating, text, date, source, categories, sentiment, created_at
		FROM reviews WHERE report_id = $1 ORDER BY date DESC
	`
	rows, err := r.db.QueryContext(ctx, reviewsQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []entity.Review
	for rows.Next() {
		var review entity.Review
		var categories pq.StringArray
		if err := rows.Scan(
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
		); err != nil {
			return nil, err
		}
		review.Categories = categories
		reviews = append(reviews, review)
	}
	report.Reviews = reviews

	// Load category stats
	statsQuery := `
		SELECT id, report_id, category, count, average_rating, positive, neutral, negative
		FROM category_stats WHERE report_id = $1
	`
	statsRows, err := r.db.QueryContext(ctx, statsQuery, id)
	if err != nil {
		return nil, err
	}
	defer statsRows.Close()

	var categoryStats []entity.CategoryStat
	for statsRows.Next() {
		var stat entity.CategoryStat
		if err := statsRows.Scan(
			&stat.ID,
			&stat.ReportID,
			&stat.Category,
			&stat.Count,
			&stat.AverageRating,
			&stat.Positive,
			&stat.Neutral,
			&stat.Negative,
		); err != nil {
			return nil, err
		}
		categoryStats = append(categoryStats, stat)
	}
	report.CategoryStats = categoryStats

	return report, nil
}

func (r *reportRepositoryImpl) FindByUserID(ctx context.Context, userID uuid.UUID) ([]entity.Report, error) {
	query := `
		SELECT
			id, user_id, title, period_start, period_end, source, source_stats, summary,
			insights, recommendations, total_reviews, average_rating,
			positive_reviews, neutral_reviews, negative_reviews,
			rating_distribution, created_at, updated_at
		FROM reports WHERE user_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reports := make([]entity.Report, 0)

	for rows.Next() {
		var report entity.Report
		var ratingDistJSON []byte
		var sourceStatsJSON []byte
		var insights, recommendations pq.StringArray

		if err := rows.Scan(
			&report.ID,
			&report.UserID,
			&report.Title,
			&report.PeriodStart,
			&report.PeriodEnd,
			&report.Source,
			&sourceStatsJSON,
			&report.Summary,
			&insights,
			&recommendations,
			&report.TotalReviews,
			&report.AverageRating,
			&report.PositiveReviews,
			&report.NeutralReviews,
			&report.NegativeReviews,
			&ratingDistJSON,
			&report.CreatedAt,
			&report.UpdatedAt,
		); err != nil {
			return nil, err
		}

		report.Insights = insights
		report.Recommendations = recommendations

		if err := json.Unmarshal(ratingDistJSON, &report.RatingDistribution); err != nil {
			return nil, err
		}

		if len(sourceStatsJSON) > 0 {
			var ss entity.SourcePlatformStats
			if err := json.Unmarshal(sourceStatsJSON, &ss); err == nil {
				report.SourceStats = &ss
			}
		}

		reports = append(reports, report)
	}

	return reports, nil
}

func (r *reportRepositoryImpl) Update(ctx context.Context, report *entity.Report) error {
	ratingDistJSON, err := json.Marshal(report.RatingDistribution)
	if err != nil {
		return err
	}

	query := `
		UPDATE reports SET
			title = $1, period_start = $2, period_end = $3, summary = $4,
			insights = $5, recommendations = $6, total_reviews = $7,
			average_rating = $8, positive_reviews = $9, neutral_reviews = $10,
			negative_reviews = $11, rating_distribution = $12, updated_at = $13
		WHERE id = $14
	`
	_, err = r.db.ExecContext(ctx, query,
		report.Title,
		report.PeriodStart,
		report.PeriodEnd,
		report.Summary,
		pq.Array(report.Insights),
		pq.Array(report.Recommendations),
		report.TotalReviews,
		report.AverageRating,
		report.PositiveReviews,
		report.NeutralReviews,
		report.NegativeReviews,
		ratingDistJSON,
		report.UpdatedAt,
		report.ID,
	)
	return err
}

func (r *reportRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM reports WHERE id = $1`, id)
	return err
}

func (r *reportRepositoryImpl) CreateCategoryStats(ctx context.Context, stats []entity.CategoryStat) error {
	query := `
		INSERT INTO category_stats (id, report_id, category, count, average_rating, positive, neutral, negative)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	for _, stat := range stats {
		if _, err := r.db.ExecContext(ctx, query,
			stat.ID,
			stat.ReportID,
			stat.Category,
			stat.Count,
			stat.AverageRating,
			stat.Positive,
			stat.Neutral,
			stat.Negative,
		); err != nil {
			return err
		}
	}
	return nil
}

// nullableJSON возвращает nil если срез пустой (для передачи NULL в БД).
func nullableJSON(b []byte) interface{} {
	if len(b) == 0 {
		return nil
	}
	return b
}

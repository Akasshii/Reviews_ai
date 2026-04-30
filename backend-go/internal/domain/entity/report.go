package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Report struct {
	ID                 uuid.UUID           `json:"id"`
	UserID             uuid.UUID           `json:"userId"`
	Title              string              `json:"title"`
	PeriodStart        time.Time           `json:"periodStart"`
	PeriodEnd          time.Time           `json:"periodEnd"`
	Source             string              `json:"source"`
	SourceStats        *SourcePlatformStats `json:"sourceStats,omitempty"`
	Summary            *string             `json:"summary,omitempty"`
	Insights           pq.StringArray      `json:"insights"`
	Recommendations    pq.StringArray      `json:"recommendations"`
	TotalReviews       int                 `json:"totalReviews"`
	AverageRating      float64             `json:"averageRating"`
	PositiveReviews    int                 `json:"positiveReviews"`
	NeutralReviews     int                 `json:"neutralReviews"`
	NegativeReviews    int                 `json:"negativeReviews"`
	RatingDistribution RatingDistribution  `json:"ratingDistribution"`
	CreatedAt          time.Time           `json:"createdAt"`
	UpdatedAt          time.Time           `json:"updatedAt"`
	Reviews            []Review            `json:"reviews,omitempty"`
	CategoryStats      []CategoryStat      `json:"categoryStats,omitempty"`
}

// SourcePlatformStats хранит статистику отдельно по каждой платформе для объединённых отчётов.
type SourcePlatformStats struct {
	Yandex *PlatformStats `json:"yandex,omitempty"`
	TwoGis *PlatformStats `json:"2gis,omitempty"`
}

type PlatformStats struct {
	TotalReviews       int                `json:"totalReviews"`
	AverageRating      float64            `json:"averageRating"`
	PositiveReviews    int                `json:"positiveReviews"`
	NeutralReviews     int                `json:"neutralReviews"`
	NegativeReviews    int                `json:"negativeReviews"`
	RatingDistribution RatingDistribution `json:"ratingDistribution"`
}

type RatingDistribution struct {
	One   int `json:"1"`
	Two   int `json:"2"`
	Three int `json:"3"`
	Four  int `json:"4"`
	Five  int `json:"5"`
}

type CategoryStat struct {
	ID            uuid.UUID `json:"id"`
	ReportID      uuid.UUID `json:"reportId"`
	Category      string    `json:"category"`
	Count         int       `json:"count"`
	AverageRating float64   `json:"averageRating"`
	Positive      int       `json:"positive"`
	Neutral       int       `json:"neutral"`
	Negative      int       `json:"negative"`
}

type CreateReportDTO struct {
	Title        string    `json:"title" binding:"required"`
	PeriodStart  time.Time `json:"periodStart" binding:"required"`
	PeriodEnd    time.Time `json:"periodEnd" binding:"required"`
	URL          string    `json:"url"`
	AllPlatforms bool      `json:"allPlatforms"`
	YandexURL    string    `json:"yandexUrl"`
	TwoGisURL    string    `json:"twogisUrl"`
}

type ReportStats struct {
	TotalReviews       int                `json:"totalReviews"`
	AverageRating      float64            `json:"averageRating"`
	PositiveReviews    int                `json:"positiveReviews"`
	NeutralReviews     int                `json:"neutralReviews"`
	NegativeReviews    int                `json:"negativeReviews"`
	RatingDistribution RatingDistribution `json:"ratingDistribution"`
}

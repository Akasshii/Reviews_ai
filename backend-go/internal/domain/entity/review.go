package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Review struct {
	ID         uuid.UUID      `json:"id"`
	ReportID   uuid.UUID      `json:"reportId"`
	Author     string         `json:"author"`
	Rating     int            `json:"rating"`
	Text       string         `json:"text"`
	Date       time.Time      `json:"date"`
	Source     string         `json:"source"`
	Categories pq.StringArray `json:"categories"`
	Sentiment  string         `json:"sentiment"`
	CreatedAt  time.Time      `json:"createdAt"`
}

type ReviewCategory string

const (
	CategoryQuality     ReviewCategory = "quality"
	CategoryService     ReviewCategory = "service"
	CategoryCleanliness ReviewCategory = "cleanliness"
	CategoryAtmosphere  ReviewCategory = "atmosphere"
	CategoryPrice       ReviewCategory = "price"
)

type Sentiment string

const (
	SentimentPositive Sentiment = "positive"
	SentimentNeutral  Sentiment = "neutral"
	SentimentNegative Sentiment = "negative"
)

type ReviewSource string

const (
	SourceYandex ReviewSource = "yandex"
	Source2GIS   ReviewSource = "2gis"
)

// ParsedReview represents raw review data from any review source
type ParsedReview struct {
	Author   string    `json:"author"`
	Rating   int       `json:"rating"`
	Text     string    `json:"text"`
	Date     time.Time `json:"date"`
	ReviewID string    `json:"reviewId"`
	Source   string    `json:"source"`
}

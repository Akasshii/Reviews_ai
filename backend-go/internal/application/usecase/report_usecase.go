package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"reviews-ai/internal/domain/entity"
	"reviews-ai/internal/domain/repository"
	"reviews-ai/internal/domain/service"
	"reviews-ai/internal/infrastructure/ai"
	"reviews-ai/internal/infrastructure/parser"
	"time"

	"github.com/google/uuid"
)

type ReportUseCase struct {
	reportRepo     repository.ReportRepository
	reviewRepo     repository.ReviewRepository
	aiClient       *ai.OpenRouterClient
	parserRegistry *parser.ParserRegistry
}

func NewReportUseCase(
	reportRepo repository.ReportRepository,
	reviewRepo repository.ReviewRepository,
	aiClient *ai.OpenRouterClient,
	parserRegistry *parser.ParserRegistry,
) *ReportUseCase {
	return &ReportUseCase{
		reportRepo:     reportRepo,
		reviewRepo:     reviewRepo,
		aiClient:       aiClient,
		parserRegistry: parserRegistry,
	}
}

func (uc *ReportUseCase) CreateReport(ctx context.Context, userID uuid.UUID, dto *entity.CreateReportDTO) (*entity.Report, error) {
	// 1. Find parser for URL
	p, err := uc.parserRegistry.GetParser(dto.URL)
	if err != nil {
		return nil, fmt.Errorf("unsupported URL: %w", err)
	}

	// 2. Parse reviews
	// Extend PeriodEnd to end of day (23:59:59) so the entire day is included
	periodEnd := dto.PeriodEnd
	if !periodEnd.IsZero() && periodEnd.Hour() == 0 && periodEnd.Minute() == 0 && periodEnd.Second() == 0 {
		periodEnd = periodEnd.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}
	opts := service.ParseOptions{
		PeriodStart: dto.PeriodStart,
		PeriodEnd:   periodEnd,
	}
	parsedReviews, err := p.ParseReviews(ctx, dto.URL, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to parse reviews: %w", err)
	}

	if len(parsedReviews) == 0 {
		return nil, errors.New("no reviews found")
	}

	// 3. Convert parsed reviews to domain reviews
	var reviews []entity.Review
	reportID := uuid.New()

	for _, pr := range parsedReviews {
		// Date filtering is already done in the parser, only re-check if period is set
		if !dto.PeriodStart.IsZero() && pr.Date.Before(dto.PeriodStart) {
			continue
		}
		if !periodEnd.IsZero() && pr.Date.After(periodEnd) {
			continue
		}

		review := entity.Review{
			ID:         uuid.New(),
			ReportID:   reportID,
			Author:     pr.Author,
			Rating:     pr.Rating,
			Text:       pr.Text,
			Date:       pr.Date,
			Source:     pr.Source,
			Categories: parser.ExtractCategories(pr.Text),
			Sentiment:  parser.DetermineSentiment(pr.Rating, pr.Text),
			CreatedAt:  time.Now(),
		}
		reviews = append(reviews, review)
	}

	if len(reviews) == 0 {
		return nil, errors.New("no reviews found in the specified period")
	}

	// 4. Calculate statistics
	stats := uc.calculateStats(reviews)

	// 5. Analyze with AI
	log.Printf("[ReportUseCase] Sending %d reviews to AI analysis", len(reviews))
	aiAnalysis, err := uc.aiClient.AnalyzeReviews(reviews)
	if err != nil {
		log.Printf("[ReportUseCase] AI analysis failed: %v, using fallback", err)
		aiAnalysis = &ai.AnalysisResult{
			Summary:         generateSummary(stats),
			Insights:        []string{"Автоматический анализ временно недоступен"},
			Recommendations: []string{"Продолжайте собирать отзывы"},
		}
	}

	// 6. Create report
	report := &entity.Report{
		ID:                 reportID,
		UserID:             userID,
		Title:              dto.Title,
		PeriodStart:        dto.PeriodStart,
		PeriodEnd:          dto.PeriodEnd,
		Summary:            &aiAnalysis.Summary,
		Insights:           aiAnalysis.Insights,
		Recommendations:    aiAnalysis.Recommendations,
		TotalReviews:       stats.TotalReviews,
		AverageRating:      stats.AverageRating,
		PositiveReviews:    stats.PositiveReviews,
		NeutralReviews:     stats.NeutralReviews,
		NegativeReviews:    stats.NegativeReviews,
		RatingDistribution: stats.RatingDistribution,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := uc.reportRepo.Create(ctx, report); err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	// 7. Save reviews
	if err := uc.reviewRepo.CreateBatch(ctx, reviews); err != nil {
		return nil, fmt.Errorf("failed to save reviews: %w", err)
	}

	// 8. Calculate and save category statistics
	categoryStats := uc.calculateCategoryStats(reportID, reviews)
	if len(categoryStats) > 0 {
		if err := uc.reportRepo.CreateCategoryStats(ctx, categoryStats); err != nil {
			return nil, fmt.Errorf("failed to save category stats: %w", err)
		}
	}

	// 9. Load full report with relations
	fullReport, err := uc.reportRepo.FindByID(ctx, reportID)
	if err != nil {
		return nil, err
	}

	return fullReport, nil
}

func (uc *ReportUseCase) GetReports(ctx context.Context, userID uuid.UUID) ([]entity.Report, error) {
	return uc.reportRepo.FindByUserID(ctx, userID)
}

func (uc *ReportUseCase) GetReportByID(ctx context.Context, reportID uuid.UUID, userID uuid.UUID) (*entity.Report, error) {
	report, err := uc.reportRepo.FindByID(ctx, reportID)
	if err != nil {
		return nil, err
	}
	if report == nil {
		return nil, errors.New("report not found")
	}

	if report.UserID != userID {
		return nil, errors.New("access denied")
	}

	return report, nil
}

func (uc *ReportUseCase) DeleteReport(ctx context.Context, reportID uuid.UUID, userID uuid.UUID) error {
	report, err := uc.reportRepo.FindByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report == nil {
		return errors.New("report not found")
	}

	if report.UserID != userID {
		return errors.New("access denied")
	}

	return uc.reportRepo.Delete(ctx, reportID)
}

func (uc *ReportUseCase) calculateStats(reviews []entity.Review) *entity.ReportStats {
	stats := &entity.ReportStats{
		TotalReviews: len(reviews),
		RatingDistribution: entity.RatingDistribution{
			One:   0,
			Two:   0,
			Three: 0,
			Four:  0,
			Five:  0,
		},
	}

	totalRating := 0.0

	for _, review := range reviews {
		totalRating += float64(review.Rating)

		switch review.Rating {
		case 1:
			stats.RatingDistribution.One++
		case 2:
			stats.RatingDistribution.Two++
		case 3:
			stats.RatingDistribution.Three++
		case 4:
			stats.RatingDistribution.Four++
		case 5:
			stats.RatingDistribution.Five++
		}

		switch review.Sentiment {
		case string(entity.SentimentPositive):
			stats.PositiveReviews++
		case string(entity.SentimentNeutral):
			stats.NeutralReviews++
		case string(entity.SentimentNegative):
			stats.NegativeReviews++
		}
	}

	if stats.TotalReviews > 0 {
		stats.AverageRating = totalRating / float64(stats.TotalReviews)
	}

	return stats
}

func (uc *ReportUseCase) calculateCategoryStats(reportID uuid.UUID, reviews []entity.Review) []entity.CategoryStat {
	categoryMap := make(map[string]*entity.CategoryStat)

	for _, review := range reviews {
		for _, cat := range review.Categories {
			if _, exists := categoryMap[cat]; !exists {
				categoryMap[cat] = &entity.CategoryStat{
					ID:            uuid.New(),
					ReportID:      reportID,
					Category:      cat,
					Count:         0,
					AverageRating: 0,
					Positive:      0,
					Neutral:       0,
					Negative:      0,
				}
			}

			stat := categoryMap[cat]
			stat.Count++
			stat.AverageRating += float64(review.Rating)

			switch review.Sentiment {
			case string(entity.SentimentPositive):
				stat.Positive++
			case string(entity.SentimentNeutral):
				stat.Neutral++
			case string(entity.SentimentNegative):
				stat.Negative++
			}
		}
	}

	var stats []entity.CategoryStat
	for _, stat := range categoryMap {
		if stat.Count > 0 {
			stat.AverageRating = stat.AverageRating / float64(stat.Count)
		}
		stats = append(stats, *stat)
	}

	return stats
}

func generateSummary(s *entity.ReportStats) string {
	positivePercent := 0.0
	if s.TotalReviews > 0 {
		positivePercent = float64(s.PositiveReviews) / float64(s.TotalReviews) * 100
	}

	return fmt.Sprintf("Проанализировано %d отзывов. Средняя оценка: %.1f/5. Положительных отзывов: %.0f%%.",
		s.TotalReviews, s.AverageRating, positivePercent)
}

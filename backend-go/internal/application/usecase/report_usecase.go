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
	"sync"
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
	if dto.AllPlatforms {
		return uc.createCombinedReport(ctx, userID, dto)
	}
	return uc.createSingleReport(ctx, userID, dto)
}

// createSingleReport — оригинальный flow для одной платформы.
func (uc *ReportUseCase) createSingleReport(ctx context.Context, userID uuid.UUID, dto *entity.CreateReportDTO) (*entity.Report, error) {
	if dto.URL == "" {
		return nil, errors.New("url is required")
	}

	p, err := uc.parserRegistry.GetParser(dto.URL)
	if err != nil {
		return nil, fmt.Errorf("unsupported URL: %w", err)
	}
	reportSource := p.Source()

	periodEnd := normalizePeriodEnd(dto.PeriodEnd)
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

	reviews := buildReviews(uuid.New(), parsedReviews, dto.PeriodStart, periodEnd)
	if len(reviews) == 0 {
		return nil, errors.New("no reviews found in the specified period")
	}

	reviews = uc.applyAISentiments(reviews)
	stats := uc.calculateStats(reviews)
	aiAnalysis := uc.analyzeWithAI(reviews, stats)

	reportID := reviews[0].ReportID
	report := &entity.Report{
		ID:                 reportID,
		UserID:             userID,
		Title:              dto.Title,
		PeriodStart:        dto.PeriodStart,
		PeriodEnd:          dto.PeriodEnd,
		Source:             reportSource,
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

	return uc.saveAndLoad(report, reviews)
}

// createCombinedReport — flow для объединённого отчёта по двум платформам.
func (uc *ReportUseCase) createCombinedReport(ctx context.Context, userID uuid.UUID, dto *entity.CreateReportDTO) (*entity.Report, error) {
	yandexURL := dto.YandexURL
	twogisURL := dto.TwoGisURL

	if yandexURL == "" && twogisURL == "" {
		return nil, errors.New("необходимо указать хотя бы один URL для объединённого отчёта")
	}

	periodEnd := normalizePeriodEnd(dto.PeriodEnd)
	opts := service.ParseOptions{
		PeriodStart: dto.PeriodStart,
		PeriodEnd:   periodEnd,
	}

	type parseResult struct {
		reviews []entity.ParsedReview
		source  string
		err     error
	}

	results := make(chan parseResult, 2)
	var wg sync.WaitGroup

	parseURL := func(url string) {
		defer wg.Done()
		p, err := uc.parserRegistry.GetParser(url)
		if err != nil {
			results <- parseResult{err: fmt.Errorf("unsupported URL %s: %w", url, err)}
			return
		}
		parsed, err := p.ParseReviews(ctx, url, opts)
		results <- parseResult{reviews: parsed, source: p.Source(), err: err}
	}

	if yandexURL != "" {
		wg.Add(1)
		go parseURL(yandexURL)
	}
	if twogisURL != "" {
		wg.Add(1)
		go parseURL(twogisURL)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	reportID := uuid.New()
	var allParsed []entity.ParsedReview
	var parseErrors []string

	for res := range results {
		if res.err != nil {
			log.Printf("[ReportUseCase] parse error for combined report: %v", res.err)
			parseErrors = append(parseErrors, res.err.Error())
			continue
		}
		allParsed = append(allParsed, res.reviews...)
	}

	if len(allParsed) == 0 {
		if len(parseErrors) > 0 {
			return nil, fmt.Errorf("ошибка парсинга: %s", parseErrors[0])
		}
		return nil, errors.New("отзывы не найдены")
	}

	reviews := buildReviews(reportID, allParsed, dto.PeriodStart, periodEnd)
	if len(reviews) == 0 {
		return nil, errors.New("нет отзывов за указанный период")
	}

	reviews = uc.applyAISentiments(reviews)

	// Общая статистика
	totalStats := uc.calculateStats(reviews)

	// Статистика по платформам
	var yandexReviews, twogisReviews []entity.Review
	for _, r := range reviews {
		if r.Source == "yandex" {
			yandexReviews = append(yandexReviews, r)
		} else {
			twogisReviews = append(twogisReviews, r)
		}
	}

	sourceStats := &entity.SourcePlatformStats{}
	if len(yandexReviews) > 0 {
		s := uc.calculateStats(yandexReviews)
		sourceStats.Yandex = statsToPlatform(s)
	}
	if len(twogisReviews) > 0 {
		s := uc.calculateStats(twogisReviews)
		sourceStats.TwoGis = statsToPlatform(s)
	}

	aiAnalysis := uc.analyzeWithAI(reviews, totalStats)

	report := &entity.Report{
		ID:                 reportID,
		UserID:             userID,
		Title:              dto.Title,
		PeriodStart:        dto.PeriodStart,
		PeriodEnd:          dto.PeriodEnd,
		Source:             "all",
		SourceStats:        sourceStats,
		Summary:            &aiAnalysis.Summary,
		Insights:           aiAnalysis.Insights,
		Recommendations:    aiAnalysis.Recommendations,
		TotalReviews:       totalStats.TotalReviews,
		AverageRating:      totalStats.AverageRating,
		PositiveReviews:    totalStats.PositiveReviews,
		NeutralReviews:     totalStats.NeutralReviews,
		NegativeReviews:    totalStats.NegativeReviews,
		RatingDistribution: totalStats.RatingDistribution,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	return uc.saveAndLoad(report, reviews)
}

// saveAndLoad сохраняет отчёт, отзывы и статы, затем загружает полный отчёт из БД.
func (uc *ReportUseCase) saveAndLoad(report *entity.Report, reviews []entity.Review) (*entity.Report, error) {
	dbCtx, dbCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer dbCancel()

	log.Printf("[ReportUseCase] Saving report to DB")
	if err := uc.reportRepo.Create(dbCtx, report); err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	log.Printf("[ReportUseCase] Saving %d reviews to DB", len(reviews))
	if err := uc.reviewRepo.CreateBatch(dbCtx, reviews); err != nil {
		return nil, fmt.Errorf("failed to save reviews: %w", err)
	}

	categoryStats := uc.calculateCategoryStats(report.ID, reviews)
	if len(categoryStats) > 0 {
		log.Printf("[ReportUseCase] Saving %d category stats to DB", len(categoryStats))
		if err := uc.reportRepo.CreateCategoryStats(dbCtx, categoryStats); err != nil {
			return nil, fmt.Errorf("failed to save category stats: %w", err)
		}
	}

	fullReport, err := uc.reportRepo.FindByID(dbCtx, report.ID)
	if err != nil {
		return nil, err
	}
	return fullReport, nil
}

// applyAISentiments запрашивает у ИИ тональность и применяет к отзывам.
func (uc *ReportUseCase) applyAISentiments(reviews []entity.Review) []entity.Review {
	log.Printf("[ReportUseCase] Classifying sentiments for %d reviews via AI", len(reviews))
	aiSentiments, err := uc.aiClient.ClassifyReviewSentiments(reviews)
	if err != nil {
		log.Printf("[ReportUseCase] AI sentiment classification failed: %v — keeping keyword-based sentiment", err)
		return reviews
	}
	for i := range reviews {
		if i < len(aiSentiments) && aiSentiments[i] != "" {
			reviews[i].Sentiment = aiSentiments[i]
		}
	}
	log.Printf("[ReportUseCase] AI sentiment classification applied to %d reviews", len(reviews))
	return reviews
}

// analyzeWithAI возвращает summary/insights/recommendations от ИИ (с fallback).
func (uc *ReportUseCase) analyzeWithAI(reviews []entity.Review, stats *entity.ReportStats) *ai.AnalysisResult {
	log.Printf("[ReportUseCase] Sending %d reviews to AI analysis", len(reviews))
	result, err := uc.aiClient.AnalyzeReviews(reviews)
	if err != nil {
		log.Printf("[ReportUseCase] AI analysis failed: %v, using fallback", err)
		return &ai.AnalysisResult{
			Summary:         generateSummary(stats),
			Insights:        []string{"Автоматический анализ временно недоступен"},
			Recommendations: []string{"Продолжайте собирать отзывы"},
		}
	}
	return result
}

// buildReviews конвертирует ParsedReview в Review с фильтрацией по периоду.
func buildReviews(reportID uuid.UUID, parsed []entity.ParsedReview, periodStart, periodEnd time.Time) []entity.Review {
	var reviews []entity.Review
	for _, pr := range parsed {
		if !pr.Date.IsZero() {
			if !periodStart.IsZero() && pr.Date.Before(periodStart) {
				continue
			}
			if !periodEnd.IsZero() && pr.Date.After(periodEnd) {
				continue
			}
		}
		reviews = append(reviews, entity.Review{
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
		})
	}
	return reviews
}

func normalizePeriodEnd(t time.Time) time.Time {
	if !t.IsZero() && t.Hour() == 0 && t.Minute() == 0 && t.Second() == 0 {
		return t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}
	return t
}

func statsToPlatform(s *entity.ReportStats) *entity.PlatformStats {
	return &entity.PlatformStats{
		TotalReviews:       s.TotalReviews,
		AverageRating:      s.AverageRating,
		PositiveReviews:    s.PositiveReviews,
		NeutralReviews:     s.NeutralReviews,
		NegativeReviews:    s.NegativeReviews,
		RatingDistribution: s.RatingDistribution,
	}
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
			One: 0, Two: 0, Three: 0, Four: 0, Five: 0,
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
					ID:       uuid.New(),
					ReportID: reportID,
					Category: cat,
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

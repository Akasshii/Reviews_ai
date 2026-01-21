import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Report, Review, CategoryStats, ReviewCategory } from '../../../domain/entities/Report';
import { YandexParser } from '../../../infrastructure/parser/YandexParser';
import { OpenRouterClient } from '../../../infrastructure/ai/OpenRouterClient';
import { v4 as uuidv4 } from 'uuid';

export interface CreateReportInput {
  userId: string;
  title: string;
  yandexUrl: string;
  periodStart: string;
  periodEnd: string;
}

export class CreateReportUseCase {
  private parser: YandexParser;
  private aiClient: OpenRouterClient;

  constructor(private reportRepository: IReportRepository) {
    this.parser = new YandexParser();
    this.aiClient = new OpenRouterClient();
  }

  async execute(input: CreateReportInput): Promise<Report> {
    // Validate input
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (!input.yandexUrl || !this.parser.validateYandexURL(input.yandexUrl)) {
      throw new Error('Valid Yandex Maps URL is required');
    }

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new Error('Invalid date format');
    }

    if (periodStart > periodEnd) {
      throw new Error('Period start must be before period end');
    }

    // 1. Parse reviews from Yandex Maps
    const yandexReviews = await this.parser.parseReviews(input.yandexUrl);

    if (yandexReviews.length === 0) {
      throw new Error('No reviews found');
    }

    // 2. Convert to domain reviews and filter by period
    const reportId = uuidv4();
    const reviews: Review[] = [];

    for (const yr of yandexReviews) {
      // Skip reviews outside the period
      if (yr.date < periodStart || yr.date > periodEnd) {
        continue;
      }

      const review: Review = {
        id: uuidv4(),
        reportId,
        author: yr.author,
        rating: yr.rating,
        text: yr.text,
        date: yr.date,
        source: 'yandex',
        categories: this.parser.extractCategories(yr.text),
        sentiment: this.parser.determineSentiment(yr.rating, yr.text),
      };
      reviews.push(review);
    }

    if (reviews.length === 0) {
      throw new Error('No reviews found in the specified period');
    }

    // 3. Calculate statistics
    const stats = this.calculateStats(reviews);

    // 4. Analyze with AI
    const aiAnalysis = await this.aiClient.analyzeReviews(reviews);

    // 5. Calculate category statistics
    const categoryStats = this.calculateCategoryStats(reviews);

    // 6. Create full report
    const report = await this.reportRepository.createFull({
      id: reportId,
      userId: input.userId,
      title: input.title.trim(),
      periodStart,
      periodEnd,
      summary: aiAnalysis.summary,
      insights: aiAnalysis.insights,
      recommendations: aiAnalysis.recommendations,
      totalReviews: stats.totalReviews,
      averageRating: stats.averageRating,
      positiveReviews: stats.positiveReviews,
      neutralReviews: stats.neutralReviews,
      negativeReviews: stats.negativeReviews,
      ratingDistribution: stats.ratingDistribution,
      reviews,
      categoryStats,
    });

    return report;
  }

  private calculateStats(reviews: Review[]): {
    totalReviews: number;
    averageRating: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  } {
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let positiveReviews = 0;
    let neutralReviews = 0;
    let negativeReviews = 0;

    for (const review of reviews) {
      totalRating += review.rating;

      // Count rating distribution
      if (review.rating >= 1 && review.rating <= 5) {
        ratingDistribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
      }

      // Count sentiment
      switch (review.sentiment) {
        case 'positive':
          positiveReviews++;
          break;
        case 'neutral':
          neutralReviews++;
          break;
        case 'negative':
          negativeReviews++;
          break;
      }
    }

    return {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      positiveReviews,
      neutralReviews,
      negativeReviews,
      ratingDistribution,
    };
  }

  private calculateCategoryStats(reviews: Review[]): CategoryStats[] {
    const categoryMap = new Map<ReviewCategory, {
      count: number;
      totalRating: number;
      positive: number;
      neutral: number;
      negative: number;
    }>();

    for (const review of reviews) {
      for (const category of review.categories) {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            count: 0,
            totalRating: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
          });
        }

        const stat = categoryMap.get(category)!;
        stat.count++;
        stat.totalRating += review.rating;

        switch (review.sentiment) {
          case 'positive':
            stat.positive++;
            break;
          case 'neutral':
            stat.neutral++;
            break;
          case 'negative':
            stat.negative++;
            break;
        }
      }
    }

    const categoryStats: CategoryStats[] = [];
    for (const [category, stat] of categoryMap) {
      categoryStats.push({
        category,
        count: stat.count,
        averageRating: stat.count > 0 ? stat.totalRating / stat.count : 0,
        sentiment: {
          positive: stat.positive,
          neutral: stat.neutral,
          negative: stat.negative,
        },
      });
    }

    return categoryStats;
  }
}

import { IReportRepository, CreateFullReportDTO } from '../../domain/repositories/IReportRepository';
import { Report, CreateReportDTO, Review, CategoryStats } from '../../domain/entities/Report';
import { pool } from '../database/db';

export class ReportRepository implements IReportRepository {
  async findById(id: string): Promise<Report | null> {
    const reportResult = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return null;
    }

    const report = this.mapToEntity(reportResult.rows[0]);

    // Load reviews
    const reviewsResult = await pool.query(
      'SELECT * FROM reviews WHERE report_id = $1 ORDER BY date DESC',
      [id]
    );
    report.reviews = reviewsResult.rows.map(this.mapReviewToEntity);

    // Load category stats
    const categoryResult = await pool.query(
      'SELECT * FROM category_stats WHERE report_id = $1',
      [id]
    );
    report.categoryStats = categoryResult.rows.map(this.mapCategoryStatsToEntity);

    return report;
  }

  async findByUserId(userId: string): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map((row) => this.mapToEntity(row));
  }

  async findAll(): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports ORDER BY created_at DESC'
    );

    return result.rows.map((row) => this.mapToEntity(row));
  }

  async create(data: CreateReportDTO): Promise<Report> {
    const result = await pool.query(
      `INSERT INTO reports (user_id, title, period_start, period_end)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.title, data.periodStart, data.periodEnd]
    );

    return this.mapToEntity(result.rows[0]);
  }

  async createFull(data: CreateFullReportDTO): Promise<Report> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create report
      const reportResult = await client.query(
        `INSERT INTO reports (
          id, user_id, title, period_start, period_end,
          summary, insights, recommendations,
          total_reviews, average_rating,
          positive_reviews, neutral_reviews, negative_reviews,
          rating_distribution
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          data.id,
          data.userId,
          data.title,
          data.periodStart,
          data.periodEnd,
          data.summary,
          data.insights,
          data.recommendations,
          data.totalReviews,
          data.averageRating,
          data.positiveReviews,
          data.neutralReviews,
          data.negativeReviews,
          JSON.stringify(data.ratingDistribution),
        ]
      );

      // 2. Create reviews
      for (const review of data.reviews) {
        await client.query(
          `INSERT INTO reviews (
            id, report_id, author, rating, text, date, source, categories, sentiment
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            review.id,
            data.id,
            review.author,
            review.rating,
            review.text,
            review.date,
            review.source,
            review.categories,
            review.sentiment,
          ]
        );
      }

      // 3. Create category stats
      for (const stat of data.categoryStats) {
        await client.query(
          `INSERT INTO category_stats (
            report_id, category, count, average_rating, positive, neutral, negative
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            data.id,
            stat.category,
            stat.count,
            stat.averageRating,
            stat.sentiment.positive,
            stat.sentiment.neutral,
            stat.sentiment.negative,
          ]
        );
      }

      await client.query('COMMIT');

      // Return full report
      const report = this.mapToEntity(reportResult.rows[0]);
      report.reviews = data.reviews;
      report.categoryStats = data.categoryStats;

      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1',
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  private mapToEntity(row: any): Report {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      period: {
        start: new Date(row.period_start),
        end: new Date(row.period_end),
      },
      stats: {
        totalReviews: row.total_reviews || 0,
        averageRating: parseFloat(row.average_rating) || 0,
        positiveReviews: row.positive_reviews || 0,
        neutralReviews: row.neutral_reviews || 0,
        negativeReviews: row.negative_reviews || 0,
        ratingDistribution: row.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      summary: row.summary,
      insights: row.insights || [],
      recommendations: row.recommendations || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapReviewToEntity(row: any): Review {
    return {
      id: row.id,
      reportId: row.report_id,
      author: row.author,
      rating: row.rating,
      text: row.text,
      date: new Date(row.date),
      source: row.source,
      categories: row.categories || [],
      sentiment: row.sentiment,
    };
  }

  private mapCategoryStatsToEntity(row: any): CategoryStats {
    return {
      category: row.category,
      count: row.count || 0,
      averageRating: parseFloat(row.average_rating) || 0,
      sentiment: {
        positive: row.positive || 0,
        neutral: row.neutral || 0,
        negative: row.negative || 0,
      },
    };
  }
}

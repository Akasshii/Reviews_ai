import { Report, CreateReportDTO, Review, CategoryStats } from '../entities/Report';

export interface CreateFullReportDTO {
  id: string;
  userId: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  summary: string;
  insights: string[];
  recommendations: string[];
  totalReviews: number;
  averageRating: number;
  positiveReviews: number;
  neutralReviews: number;
  negativeReviews: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  reviews: Review[];
  categoryStats: CategoryStats[];
}

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findByUserId(userId: string): Promise<Report[]>;
  findAll(): Promise<Report[]>;
  create(data: CreateReportDTO): Promise<Report>;
  createFull(data: CreateFullReportDTO): Promise<Report>;
  delete(id: string): Promise<boolean>;
}

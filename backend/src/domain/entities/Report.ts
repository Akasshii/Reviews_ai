export type ReviewCategory = 'quality' | 'service' | 'cleanliness' | 'atmosphere' | 'price';

export interface Review {
  id: string;
  reportId: string;
  author: string;
  rating: number;
  text: string;
  date: Date;
  source: 'yandex' | '2gis';
  categories: ReviewCategory[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface CategoryStats {
  category: ReviewCategory;
  count: number;
  averageRating: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface ReportStats {
  totalReviews: number;
  averageRating: number;
  positiveReviews: number;
  neutralReviews: number;
  negativeReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  stats: ReportStats;
  summary?: string;
  insights: string[];
  recommendations: string[];
  categoryStats?: CategoryStats[];
  reviews?: Review[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportDTO {
  userId: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  avatar?: string;
  createdAt: Date;
}

export type ReviewCategory = 'quality' | 'service' | 'cleanliness' | 'atmosphere' | 'price';

export interface Review {
  id: string;
  platform: 'yandex' | '2gis';
  author: string;
  rating: number;
  text: string;
  date: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  categories?: ReviewCategory[];
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

export interface Report {
  id: string;
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  platform: 'yandex' | '2gis' | 'all';
  status: 'generating' | 'ready' | 'error';
  createdAt: Date;
  stats: {
    totalReviews: number;
    averageRating: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
  };
  insights: string[];
  recommendations: string[];
  summary?: string;
  categoryStats?: CategoryStats[];
  reviews?: Review[];
}

export interface DashboardStats {
  totalReviews: number;
  averageRating: number;
  reviewsTrend: number;
  ratingTrend: number;
  recentReviews: Review[];
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
}

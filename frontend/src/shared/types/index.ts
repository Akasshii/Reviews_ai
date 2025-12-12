export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  avatar?: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  platform: 'yandex' | '2gis';
  author: string;
  rating: number;
  text: string;
  date: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
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

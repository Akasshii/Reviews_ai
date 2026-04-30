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

export interface PlatformStats {
  totalReviews: number;
  averageRating: number;
  positiveReviews: number;
  neutralReviews: number;
  negativeReviews: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface SourcePlatformStats {
  yandex?: PlatformStats;
  '2gis'?: PlatformStats;
}

export interface Report {
  id: string;
  title: string;
  period?: {
    start: Date;
    end: Date;
  };
  periodStart?: Date;
  periodEnd?: Date;
  platform?: 'yandex' | '2gis' | 'all';
  status?: 'generating' | 'ready' | 'error';
  createdAt: Date;
  totalReviews: number;
  averageRating: number;
  positiveReviews: number;
  neutralReviews: number;
  negativeReviews: number;
  ratingDistribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  stats?: {
    totalReviews: number;
    averageRating: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
  };
  sourceStats?: SourcePlatformStats;
  insights: string[];
  recommendations: string[];
  summary?: string;
  categoryStats?: CategoryStats[];
  reviews?: Review[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  position?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDTO {
  name?: string;
  company?: string;
  position?: string;
  avatar?: string;
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

export interface Location {
  id: string;
  userId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  yandexUrl?: string;
  twogisUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationDTO {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  yandexUrl?: string;
  twogisUrl?: string;
}

export interface UpdateLocationDTO {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  yandexUrl?: string;
  twogisUrl?: string;
}

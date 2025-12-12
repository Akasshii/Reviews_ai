import type { User, Review, Report, DashboardStats } from '../types';

export const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  name: 'Иван Петров',
  company: 'Кофейня "Аромат"',
  createdAt: new Date('2024-01-15'),
};

export const mockReviews: Review[] = [
  {
    id: '1',
    platform: 'yandex',
    author: 'Анна К.',
    rating: 5,
    text: 'Отличное место! Прекрасный кофе и приятная атмосфера. Персонал очень вежливый.',
    date: new Date('2024-12-10'),
    sentiment: 'positive',
  },
  {
    id: '2',
    platform: '2gis',
    author: 'Михаил С.',
    rating: 4,
    text: 'Хороший кофе, но иногда приходится долго ждать в очереди.',
    date: new Date('2024-12-09'),
    sentiment: 'positive',
  },
  {
    id: '3',
    platform: 'yandex',
    author: 'Елена Д.',
    rating: 3,
    text: 'Средне. Цены завышены, качество обычное.',
    date: new Date('2024-12-08'),
    sentiment: 'neutral',
  },
  {
    id: '4',
    platform: '2gis',
    author: 'Дмитрий В.',
    rating: 2,
    text: 'Разочарован. Кофе был холодным, обслуживание медленное.',
    date: new Date('2024-12-07'),
    sentiment: 'negative',
  },
  {
    id: '5',
    platform: 'yandex',
    author: 'Ольга М.',
    rating: 5,
    text: 'Лучший кофе в городе! Всегда захожу сюда. Рекомендую всем!',
    date: new Date('2024-12-06'),
    sentiment: 'positive',
  },
];

export const mockReports: Report[] = [
  {
    id: '1',
    title: 'Отчет за ноябрь 2024',
    period: {
      start: new Date('2024-11-01'),
      end: new Date('2024-11-30'),
    },
    platform: 'all',
    status: 'ready',
    createdAt: new Date('2024-12-01'),
    stats: {
      totalReviews: 156,
      averageRating: 4.2,
      positiveReviews: 98,
      neutralReviews: 42,
      negativeReviews: 16,
    },
    insights: [
      'Основные жалобы связаны с долгим ожиданием в часы пик',
      'Клиенты высоко оценивают качество кофе',
      'Атмосфера заведения получает положительные отзывы',
    ],
    recommendations: [
      'Увеличить количество персонала в часы пик (12:00-14:00)',
      'Внедрить систему предварительного заказа через приложение',
      'Добавить больше посадочных мест',
    ],
  },
  {
    id: '2',
    title: 'Отчет за октябрь 2024',
    period: {
      start: new Date('2024-10-01'),
      end: new Date('2024-10-31'),
    },
    platform: 'yandex',
    status: 'ready',
    createdAt: new Date('2024-11-01'),
    stats: {
      totalReviews: 142,
      averageRating: 4.1,
      positiveReviews: 89,
      neutralReviews: 38,
      negativeReviews: 15,
    },
    insights: [
      'Увеличение количества отзывов на 12% по сравнению с сентябрем',
      'Позитивные отзывы о новом меню',
    ],
    recommendations: [
      'Продолжить развитие меню с учетом отзывов клиентов',
      'Улучшить скорость обслуживания',
    ],
  },
  {
    id: '3',
    title: 'Отчет за сентябрь 2024',
    period: {
      start: new Date('2024-09-01'),
      end: new Date('2024-09-30'),
    },
    platform: '2gis',
    status: 'ready',
    createdAt: new Date('2024-10-01'),
    stats: {
      totalReviews: 127,
      averageRating: 4.0,
      positiveReviews: 81,
      neutralReviews: 32,
      negativeReviews: 14,
    },
    insights: [
      'Стабильные показатели качества обслуживания',
      'Клиенты ценят уютную атмосферу',
    ],
    recommendations: [
      'Поддерживать текущий уровень сервиса',
      'Расширить ассортимент десертов',
    ],
  },
];

export const mockDashboardStats: DashboardStats = {
  totalReviews: 425,
  averageRating: 4.1,
  reviewsTrend: 8.5,
  ratingTrend: 2.3,
  recentReviews: mockReviews.slice(0, 5),
  ratingDistribution: [
    { rating: 5, count: 198 },
    { rating: 4, count: 134 },
    { rating: 3, count: 62 },
    { rating: 2, count: 21 },
    { rating: 1, count: 10 },
  ],
};

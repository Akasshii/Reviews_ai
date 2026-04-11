import type { Report } from '../types';

export const normalizeReport = (report: any): Report => {
  // Адаптация данных из Go backend под frontend типы
  const normalized: any = {
    ...report,
    createdAt: new Date(report.createdAt),
    platform: report.source || report.platform || 'yandex',
    status: report.status || ('ready' as const),
  };

  // Создаём period из periodStart/periodEnd если он отсутствует
  if (!normalized.period && report.periodStart && report.periodEnd) {
    normalized.period = {
      start: new Date(report.periodStart),
      end: new Date(report.periodEnd),
    };
  } else if (normalized.period) {
    // Конвертируем даты если period уже есть
    normalized.period = {
      start: new Date(normalized.period.start),
      end: new Date(normalized.period.end),
    };
  }

  // Создаём stats из полей верхнего уровня (Go backend возвращает их на верхнем уровне)
  normalized.stats = {
    totalReviews: report.totalReviews || 0,
    averageRating: report.averageRating || 0,
    positiveReviews: report.positiveReviews || 0,
    neutralReviews: report.neutralReviews || 0,
    negativeReviews: report.negativeReviews || 0,
  };

  // Убедимся что insights и recommendations это массивы
  if (!Array.isArray(normalized.insights)) {
    normalized.insights = [];
  }
  if (!Array.isArray(normalized.recommendations)) {
    normalized.recommendations = [];
  }

  // Трансформируем categoryStats из Go формата в frontend формат
  // Go: {positive: 5, neutral: 2, negative: 1}
  // Frontend: {sentiment: {positive: 5, neutral: 2, negative: 1}}
  if (Array.isArray(report.categoryStats)) {
    normalized.categoryStats = report.categoryStats.map((cat: any) => ({
      category: cat.category,
      count: cat.count || 0,
      averageRating: cat.averageRating || 0,
      sentiment: {
        positive: cat.positive || 0,
        neutral: cat.neutral || 0,
        negative: cat.negative || 0,
      },
    }));
  } else {
    normalized.categoryStats = [];
  }

  // Трансформируем reviews (конвертируем даты)
  if (Array.isArray(report.reviews)) {
    normalized.reviews = report.reviews.map((review: any) => ({
      ...review,
      date: new Date(review.date),
      platform: review.source === 'yandex' ? 'yandex' : review.source === 'google' ? 'google' : '2gis',
    }));
  }

  return normalized as Report;
};

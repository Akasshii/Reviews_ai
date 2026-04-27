import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { StarIcon, CalendarIcon, DownloadIcon, BarChartIcon } from '../../shared/ui';
import { reportApi } from '../../shared/api/reportApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ReviewCategory, Report } from '../../shared/types';
import './ReportDetailPage.css';

const categoryLabels: Record<ReviewCategory, string> = {
  quality: 'Качество',
  service: 'Обслуживание',
  cleanliness: 'Чистота',
  atmosphere: 'Атмосфера',
  price: 'Цены',
};

const categoryColors: Record<ReviewCategory, string> = {
  quality: '#6366f1',
  service: '#8b5cf6',
  cleanliness: '#10b981',
  atmosphere: '#f59e0b',
  price: '#ef4444',
};


export const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ReviewCategory | null>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadReport(id);
    }
  }, [id]);

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportApi.getReportById(reportId);
      const normalized = normalizeReport(data);
      setReport(normalized);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки отчёта');
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToReviews = () => {
    setTimeout(() => {
      reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleStatCardClick = (filter: 'all' | 'positive' | 'neutral' | 'negative') => {
    setSentimentFilter(filter);
    setCategoryFilter(null);
    scrollToReviews();
  };

  const handleCategoryClick = (category: ReviewCategory) => {
    setCategoryFilter(category);
    setSentimentFilter(null);
    scrollToReviews();
  };

  const clearFilters = () => {
    setSentimentFilter(null);
    setCategoryFilter(null);
  };

  if (loading) {
    return (
      <div className="report-detail-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>Загрузка отчёта...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-detail-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</p>
          <Button onClick={() => navigate('/reports')}>Вернуться к отчетам</Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-detail-page">
        <div className="report-not-found">
          <h2>Отчет не найден</h2>
          <Button onClick={() => navigate('/reports')}>Вернуться к отчетам</Button>
        </div>
      </div>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#10b981';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    if (rating >= 3.0) return '#fb923c';
    return '#ef4444';
  };

  const activeFilter = sentimentFilter || (categoryFilter ? `category:${categoryFilter}` : null);

  const filteredReviews = (report?.reviews ?? []).filter((review) => {
    if (sentimentFilter && sentimentFilter !== 'all') {
      if (review.sentiment !== sentimentFilter) return false;
    }
    if (categoryFilter) {
      if (!review.categories?.includes(categoryFilter)) return false;
    }
    return true;
  });

  return (
    <div className="report-detail-page">
      <div className="report-detail-header">
        <Button variant="ghost" onClick={() => navigate('/reports')}>
          ← Назад к отчетам
        </Button>
        <div className="report-detail-actions">
          <Button variant="outline" icon={<DownloadIcon size={18} />}>
            Экспорт PDF
          </Button>
        </div>
      </div>

      <div className="report-detail-title-section">
        <div className="report-detail-title-content">
          <h1 className="report-detail-title">{report.title}</h1>
          <div className="report-detail-meta">
            <div className="report-meta-item">
              <CalendarIcon size={18} />
              <span>
                {format(report.period!.start, 'd MMMM', { locale: ru })} -{' '}
                {format(report.period!.end, 'd MMMM yyyy', { locale: ru })}
              </span>
            </div>
            <span className="platform-badge">
              {report.platform === 'all' ? 'Все платформы' : report.platform === 'yandex' ? 'Яндекс' : '2ГИС'}
            </span>
          </div>
        </div>
        <div
          className="report-rating-badge"
          style={{ backgroundColor: `${getRatingColor(report.stats!.averageRating)}15`, color: getRatingColor(report.stats!.averageRating) }}
        >
          <span className="rating-value">{report.stats!.averageRating.toFixed(1)}</span>
          <StarIcon size={24} color={getRatingColor(report.stats!.averageRating)} />
        </div>
      </div>

      {report.summary && (
        <Card padding="lg" className="report-summary-card">
          <CardHeader>
            <div className="card-header-with-action">
              <CardTitle>{viewMode === 'summary' ? 'Краткая сводка' : 'Подробная сводка'}</CardTitle>
              <div className="view-mode-toggle">
                <Button
                  variant={viewMode === 'summary' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('summary')}
                >
                  Кратко
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                >
                  Подробно
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'summary' ? (
              <p className="report-summary-text">{report.summary}</p>
            ) : (
              <div className="detailed-summary">
                <div className="summary-section">
                  <h4 className="summary-section-title">Общий анализ</h4>
                  <p className="report-summary-text">{report.summary}</p>
                </div>

                <div className="summary-section">
                  <h4 className="summary-section-title">Анализ тональности</h4>
                  <p className="report-summary-text">
                    За анализируемый период получено {report.stats!.totalReviews} отзывов.
                    Большая часть отзывов ({Math.round((report.stats!.positiveReviews / report.stats!.totalReviews) * 100)}%)
                    имеют позитивную окраску, что свидетельствует о высоком уровне удовлетворенности клиентов.
                    {report.stats!.negativeReviews > 0 && ` Количество негативных отзывов составляет ${report.stats!.negativeReviews} (${Math.round((report.stats!.negativeReviews / report.stats!.totalReviews) * 100)}%),
                    что требует внимания к выявленным проблемам.`}
                  </p>
                </div>

                {report.categoryStats && report.categoryStats.length > 0 && (
                  <div className="summary-section">
                    <h4 className="summary-section-title">Ключевые категории</h4>
                    <p className="report-summary-text">
                      Наиболее часто упоминаемые категории: {report.categoryStats
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map((cat) => categoryLabels[cat.category])
                        .join(', ')}.
                      Высокие оценки получили категории {report.categoryStats
                        .sort((a, b) => b.averageRating - a.averageRating)
                        .slice(0, 2)
                        .map((cat) => `${categoryLabels[cat.category]} (${cat.averageRating.toFixed(1)})`)
                        .join(' и ')}.
                      {report.categoryStats.some(cat => cat.averageRating < 4) && ` Требуют улучшения: ${report.categoryStats
                        .filter(cat => cat.averageRating < 4)
                        .map((cat) => `${categoryLabels[cat.category]} (${cat.averageRating.toFixed(1)})`)
                        .join(', ')}.`}
                    </p>
                  </div>
                )}

                <div className="summary-section">
                  <h4 className="summary-section-title">Динамика и рекомендации</h4>
                  <p className="report-summary-text">
                    Средний рейтинг {report.stats!.averageRating.toFixed(1)} демонстрирует
                    {report.stats!.averageRating >= 4.5 ? ' отличные показатели работы' :
                     report.stats!.averageRating >= 4 ? ' хорошие показатели с потенциалом улучшения' :
                     ' необходимость принятия мер по повышению качества обслуживания'}.
                    Основные рекомендации включают: {report.recommendations.slice(0, 2).join('; ').toLowerCase()}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="report-stats-grid">
        <Card
          padding="md"
          hoverable
          onClick={() => handleStatCardClick('all')}
          className={`stat-card-clickable${sentimentFilter === 'all' ? ' stat-card-active' : ''}`}
        >
          <div className="stat-item">
            <span className="stat-label">Всего отзывов</span>
            <span className="stat-value">{report.stats!.totalReviews}</span>
          </div>
        </Card>
        <Card
          padding="md"
          hoverable
          onClick={() => handleStatCardClick('positive')}
          className={`stat-card-clickable${sentimentFilter === 'positive' ? ' stat-card-active stat-card-active--positive' : ''}`}
        >
          <div className="stat-item stat-item--positive">
            <span className="stat-label">Позитивные</span>
            <span className="stat-value">{report.stats!.positiveReviews}</span>
          </div>
        </Card>
        <Card
          padding="md"
          hoverable
          onClick={() => handleStatCardClick('neutral')}
          className={`stat-card-clickable${sentimentFilter === 'neutral' ? ' stat-card-active stat-card-active--neutral' : ''}`}
        >
          <div className="stat-item stat-item--neutral">
            <span className="stat-label">Нейтральные</span>
            <span className="stat-value">{report.stats!.neutralReviews}</span>
          </div>
        </Card>
        <Card
          padding="md"
          hoverable
          onClick={() => handleStatCardClick('negative')}
          className={`stat-card-clickable${sentimentFilter === 'negative' ? ' stat-card-active stat-card-active--negative' : ''}`}
        >
          <div className="stat-item stat-item--negative">
            <span className="stat-label">Негативные</span>
            <span className="stat-value">{report.stats!.negativeReviews}</span>
          </div>
        </Card>
      </div>

      {report.categoryStats && report.categoryStats.length > 0 && (
        <Card padding="lg">
          <CardHeader>
            <div className="card-header-with-action">
              <CardTitle>Анализ по категориям</CardTitle>
              <BarChartIcon size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="categories-grid">
              {report.categoryStats.map((cat) => {
                const ratingColor = getRatingColor(cat.averageRating);
                const isActive = categoryFilter === cat.category;
                return (
                  <div
                    key={cat.category}
                    className={`category-card category-card-clickable${isActive ? ' category-card-active' : ''}`}
                    onClick={() => handleCategoryClick(cat.category)}
                    title="Нажмите, чтобы посмотреть отзывы"
                    style={{
                      border: `2px solid ${isActive ? ratingColor : ratingColor}`,
                      borderRadius: '12px',
                      padding: '16px',
                      backgroundColor: isActive ? `${ratingColor}20` : `${ratingColor}0d`,
                      cursor: 'pointer',
                      outline: isActive ? `2px solid ${ratingColor}` : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    <div className="category-header">
                      <div
                        className="category-icon"
                        style={{ backgroundColor: `${ratingColor}20`, color: ratingColor }}
                      >
                        {categoryLabels[cat.category]}
                      </div>
                      <div
                        className="category-rating"
                        style={{ color: ratingColor }}
                      >
                        {cat.averageRating.toFixed(1)}
                      </div>
                    </div>
                    <div className="category-count">{cat.count} упоминаний</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'summary' ? (
        <div className="report-content-grid">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Ключевые инсайты</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="insights-list">
                {report.insights.slice(0, 3).map((insight, index) => (
                  <li key={index} className="insight-item">
                    {insight}
                  </li>
                ))}
              </ul>
              {report.insights.length > 3 && (
                <p className="show-more-hint">
                  +{report.insights.length - 3} дополнительных инсайтов в расширенной версии
                </p>
              )}
            </CardContent>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="recommendations-list">
                {report.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    {rec}
                  </li>
                ))}
              </ul>
              {report.recommendations.length > 3 && (
                <p className="show-more-hint">
                  +{report.recommendations.length - 3} дополнительных рекомендаций в расширенной версии
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="report-content-grid">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Все ключевые инсайты</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="insights-list">
                {report.insights.map((insight, index) => (
                  <li key={index} className="insight-item">
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Все рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="recommendations-list">
                {report.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {report.reviews && report.reviews.length > 0 && (
        <div ref={reviewsSectionRef}>
        <Card padding="lg">
          <CardHeader>
            <div className="card-header-with-action">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <CardTitle>
                  Отзывы ({activeFilter ? filteredReviews.length : (viewMode === 'summary' ? Math.min(5, report.reviews.length) : report.reviews.length)})
                </CardTitle>
                {activeFilter && (
                  <div className="reviews-filter-badge">
                    <span>
                      {sentimentFilter === 'all' && 'Все отзывы'}
                      {sentimentFilter === 'positive' && 'Позитивные отзывы'}
                      {sentimentFilter === 'neutral' && 'Нейтральные отзывы'}
                      {sentimentFilter === 'negative' && 'Негативные отзывы'}
                      {categoryFilter && `Категория: ${categoryLabels[categoryFilter]}`}
                    </span>
                    <button className="reviews-filter-clear" onClick={clearFilters} title="Сбросить фильтр">✕</button>
                  </div>
                )}
              </div>
              {!activeFilter && viewMode === 'summary' && report.reviews.length > 5 && (
                <span className="hint-text">Показаны первые 5 из {report.reviews.length}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeFilter && filteredReviews.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px 0' }}>
                Отзывов по выбранному фильтру не найдено
              </p>
            ) : null}
            <div className="reviews-list-detail">
              {(activeFilter ? filteredReviews : (viewMode === 'summary' ? report.reviews.slice(0, 5) : report.reviews)).map((review) => (
                <div key={review.id} className="review-card-detail">
                  <div className="review-card-header">
                    <div className="review-author-section">
                      <span className="review-author">{review.author}</span>
                      <span className={`review-platform-badge review-platform--${review.platform}`}>
                        {review.platform === 'yandex' ? 'Яндекс' : '2ГИС'}
                      </span>
                    </div>
                    <div className="review-rating-section">
                      <div className="review-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon
                            key={i}
                            size={16}
                            color={i < review.rating ? '#f59e0b' : '#e2e8f0'}
                          />
                        ))}
                      </div>
                      <span className="review-rating-value">{review.rating}.0</span>
                    </div>
                  </div>

                  <p className="review-text">{review.text}</p>

                  {review.categories && review.categories.length > 0 && (
                    <div className="review-categories">
                      {review.categories.map((cat) => (
                        <span
                          key={cat}
                          className="review-category-badge"
                          style={{ backgroundColor: `${categoryColors[cat]}15`, color: categoryColors[cat] }}
                        >
                          {categoryLabels[cat]}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="review-footer">
                    <span className="review-date">
                      {format(review.date, 'd MMMM yyyy', { locale: ru })}
                    </span>
                    {review.sentiment && (
                      <span className={`review-sentiment review-sentiment--${review.sentiment}`}>
                        {review.sentiment === 'positive' ? 'Позитивный' : review.sentiment === 'negative' ? 'Негативный' : 'Нейтральный'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { StarIcon, CalendarIcon, DownloadIcon, BarChartIcon } from '../../shared/ui';
import { reportApi } from '../../shared/api/reportApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import { PdfExportModal } from './PdfExportModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ReviewCategory, Report, CategoryStats } from '../../shared/types';
import './ReportDetailPage.css';

const categoryLabels: Record<ReviewCategory, string> = {
  quality: 'Качество',
  service: 'Обслуживание',
  cleanliness: 'Чистота',
  atmosphere: 'Атмосфера',
  price: 'Цены',
};

const categoryColors: Record<ReviewCategory, string> = {
  quality: '#818cf8',
  service: '#a78bfa',
  cleanliness: '#34d399',
  atmosphere: '#fbbf24',
  price: '#f87171',
};

const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return '#34d399';
  if (rating >= 4.0) return '#60a5fa';
  if (rating >= 3.5) return '#fbbf24';
  if (rating >= 3.0) return '#fb923c';
  return '#f87171';
};

// Вычисляет CategoryStats из массива отзывов (для фильтрации по платформе)
function computeCategoryStats(reviews: NonNullable<Report['reviews']>): CategoryStats[] {
  const map: Record<string, CategoryStats> = {};
  for (const review of reviews) {
    for (const cat of review.categories ?? []) {
      if (!map[cat]) {
        map[cat] = { category: cat as ReviewCategory, count: 0, averageRating: 0, sentiment: { positive: 0, neutral: 0, negative: 0 } };
      }
      map[cat].count++;
      map[cat].averageRating += review.rating;
      if (review.sentiment === 'positive') map[cat].sentiment.positive++;
      else if (review.sentiment === 'neutral') map[cat].sentiment.neutral++;
      else if (review.sentiment === 'negative') map[cat].sentiment.negative++;
    }
  }
  return Object.values(map).map(s => ({
    ...s,
    averageRating: s.count > 0 ? s.averageRating / s.count : 0,
  }));
}

export const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ReviewCategory | null>(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'yandex' | '2gis'>('all');
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [reviewPlatformFilter, setReviewPlatformFilter] = useState<'all' | 'yandex' | '2gis'>('all');
  const [reviewSortOrder, setReviewSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [reviewDateFrom, setReviewDateFrom] = useState<string>('');
  const [reviewDateTo, setReviewDateTo] = useState<string>('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => { if (id) loadReport(id); }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportApi.getReportById(reportId);
      setReport(normalizeReport(data));
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки отчёта');
    } finally {
      setLoading(false);
    }
  };

  const scrollToReviews = () => {
    setTimeout(() => reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
    setReviewPlatformFilter('all');
    setReviewDateFrom('');
    setReviewDateTo('');
  };

  const handlePlatformChange = (p: 'all' | 'yandex' | '2gis') => {
    setPlatformFilter(p);
    setSentimentFilter(null);
    setCategoryFilter(null);
  };

  const isCombined = report?.platform === 'all';

  // Отзывы, отфильтрованные только по платформе — база для категорий и статистики
  const platformReviews = useMemo(() => {
    const all = report?.reviews ?? [];
    if (!isCombined || platformFilter === 'all') return all;
    return all.filter(r => r.platform === platformFilter);
  }, [report?.reviews, isCombined, platformFilter]);

  // Категории, актуальные для выбранной платформы
  const currentCategoryStats = useMemo<CategoryStats[]>(() => {
    if (!isCombined || platformFilter === 'all') return report?.categoryStats ?? [];
    return computeCategoryStats(platformReviews);
  }, [isCombined, platformFilter, platformReviews, report?.categoryStats]);

  // Числа для stat-карточек
  const currentStats = useMemo(() => {
    if (!isCombined || platformFilter === 'all') return report?.stats;
    const ps = platformFilter === 'yandex' ? report?.sourceStats?.yandex : report?.sourceStats?.['2gis'];
    if (!ps) return report?.stats;
    return {
      totalReviews: ps.totalReviews,
      averageRating: ps.averageRating,
      positiveReviews: ps.positiveReviews,
      neutralReviews: ps.neutralReviews,
      negativeReviews: ps.negativeReviews,
    };
  }, [isCombined, platformFilter, report]);

  // Итоговый список отзывов (все фильтры + сортировка)
  const filteredReviews = useMemo(() => {
    const all = report?.reviews ?? [];
    const result = all.filter(review => {
      if (reviewPlatformFilter !== 'all' && review.platform !== reviewPlatformFilter) return false;
      if (sentimentFilter && sentimentFilter !== 'all' && review.sentiment !== sentimentFilter) return false;
      if (categoryFilter && !review.categories?.includes(categoryFilter)) return false;
      if (reviewDateFrom) {
        const from = new Date(reviewDateFrom);
        if (review.date < from) return false;
      }
      if (reviewDateTo) {
        const to = new Date(reviewDateTo);
        to.setHours(23, 59, 59, 999);
        if (review.date > to) return false;
      }
      return true;
    });
    result.sort((a, b) =>
      reviewSortOrder === 'newest' ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()
    );
    return result;
  }, [report?.reviews, reviewPlatformFilter, sentimentFilter, categoryFilter, reviewSortOrder, reviewDateFrom, reviewDateTo]);

  const hasActiveQuickFilter = !!(sentimentFilter && sentimentFilter !== 'all') || !!categoryFilter;

  if (loading) return (
    <div className="report-detail-page">
      <div style={{ textAlign: 'center', padding: '60px 20px' }}><p>Загрузка отчёта...</p></div>
    </div>
  );

  if (error) return (
    <div className="report-detail-page">
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</p>
        <Button onClick={() => navigate('/reports')}>Вернуться к отчетам</Button>
      </div>
    </div>
  );

  if (!report) return (
    <div className="report-detail-page">
      <div className="report-not-found">
        <h2>Отчет не найден</h2>
        <Button onClick={() => navigate('/reports')}>Вернуться к отчетам</Button>
      </div>
    </div>
  );

  return (
    <div className="report-detail-page">
      {/* Шапка */}
      <div className="report-detail-header">
        <Button variant="ghost" onClick={() => navigate('/reports')}>← Назад к отчетам</Button>
        <div className="report-detail-actions">
          <Button variant="outline" icon={<DownloadIcon size={18} />} onClick={() => setShowPdfModal(true)}>Экспорт PDF</Button>
        </div>
      </div>

      {/* Заголовок отчёта */}
      <div className="report-detail-title-section">
        <div className="report-detail-title-content">
          <h1 className="report-detail-title">{report.title}</h1>
          <div className="report-detail-meta">
            <div className="report-meta-item">
              <CalendarIcon size={18} />
              <span>
                {format(report.period!.start, 'd MMMM', { locale: ru })} —{' '}
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

      {/* Сводка */}
      {report.summary && (
        <Card padding="lg" className="report-summary-card">
          <CardHeader>
            <div className="card-header-with-action">
              <CardTitle>{viewMode === 'summary' ? 'Краткая сводка' : 'Подробная сводка'}</CardTitle>
              <div className="view-mode-toggle">
                <Button variant={viewMode === 'summary' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('summary')}>Кратко</Button>
                <Button variant={viewMode === 'detailed' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('detailed')}>Подробно</Button>
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
                    имеют позитивную окраску.
                    {report.stats!.negativeReviews > 0 && ` Негативных: ${report.stats!.negativeReviews} (${Math.round((report.stats!.negativeReviews / report.stats!.totalReviews) * 100)}%).`}
                  </p>
                </div>
                {report.categoryStats && report.categoryStats.length > 0 && (
                  <div className="summary-section">
                    <h4 className="summary-section-title">Ключевые категории</h4>
                    <p className="report-summary-text">
                      Чаще всего упоминаются: {report.categoryStats.sort((a, b) => b.count - a.count).slice(0, 3).map(c => categoryLabels[c.category]).join(', ')}.
                      {report.categoryStats.some(c => c.averageRating < 4) && ` Требуют улучшения: ${report.categoryStats.filter(c => c.averageRating < 4).map(c => `${categoryLabels[c.category]} (${c.averageRating.toFixed(1)})`).join(', ')}.`}
                    </p>
                  </div>
                )}
                <div className="summary-section">
                  <h4 className="summary-section-title">Динамика и рекомендации</h4>
                  <p className="report-summary-text">
                    Средний рейтинг {report.stats!.averageRating.toFixed(1)}{' '}
                    {report.stats!.averageRating >= 4.5 ? 'демонстрирует отличные показатели.' :
                     report.stats!.averageRating >= 4 ? 'показывает хорошие результаты с потенциалом роста.' :
                     'указывает на необходимость улучшений.'}{' '}
                    Рекомендации: {report.recommendations.slice(0, 2).join('; ').toLowerCase()}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Статистика по платформам (только для объединённых отчётов) */}
      {isCombined && report.sourceStats && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Статистика по платформам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="platform-stats-grid">
              {report.sourceStats.yandex && (() => {
                const s = report.sourceStats!.yandex!;
                return (
                  <div className="psc psc--yandex">
                    <div className="psc-header">
                      <span className="psc-platform-name psc-platform-name--yandex">Яндекс.Карты</span>
                      <div className="psc-rating" style={{ color: getRatingColor(s.averageRating) }}>
                        {s.averageRating.toFixed(1)}
                        <StarIcon size={18} color={getRatingColor(s.averageRating)} />
                      </div>
                    </div>
                    <div className="psc-divider" />
                    <div className="psc-total"><strong>{s.totalReviews}</strong> отзывов</div>
                    <div className="psc-sentiments">
                      <div className="psc-sent psc-sent--positive">
                        <span className="psc-sent-count">{s.positiveReviews}</span>
                        <span className="psc-sent-label">позитивных</span>
                      </div>
                      <div className="psc-sent psc-sent--neutral">
                        <span className="psc-sent-count">{s.neutralReviews}</span>
                        <span className="psc-sent-label">нейтральных</span>
                      </div>
                      <div className="psc-sent psc-sent--negative">
                        <span className="psc-sent-count">{s.negativeReviews}</span>
                        <span className="psc-sent-label">негативных</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {report.sourceStats['2gis'] && (() => {
                const s = report.sourceStats!['2gis']!;
                return (
                  <div className="psc psc--twogis">
                    <div className="psc-header">
                      <span className="psc-platform-name psc-platform-name--twogis">2ГИС</span>
                      <div className="psc-rating" style={{ color: getRatingColor(s.averageRating) }}>
                        {s.averageRating.toFixed(1)}
                        <StarIcon size={18} color={getRatingColor(s.averageRating)} />
                      </div>
                    </div>
                    <div className="psc-divider" />
                    <div className="psc-total"><strong>{s.totalReviews}</strong> отзывов</div>
                    <div className="psc-sentiments">
                      <div className="psc-sent psc-sent--positive">
                        <span className="psc-sent-count">{s.positiveReviews}</span>
                        <span className="psc-sent-label">позитивных</span>
                      </div>
                      <div className="psc-sent psc-sent--neutral">
                        <span className="psc-sent-count">{s.neutralReviews}</span>
                        <span className="psc-sent-label">нейтральных</span>
                      </div>
                      <div className="psc-sent psc-sent--negative">
                        <span className="psc-sent-count">{s.negativeReviews}</span>
                        <span className="psc-sent-label">негативных</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Переключатель платформ (только для объединённых отчётов) */}
      {isCombined && (
        <div className="platform-filter-bar">
          <span className="platform-filter-label">Платформа:</span>
          <div className="view-mode-toggle">
            <Button
              variant={platformFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePlatformChange('all')}
            >
              Все
            </Button>
            <Button
              variant={platformFilter === 'yandex' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePlatformChange('yandex')}
            >
              Яндекс.Карты
            </Button>
            <Button
              variant={platformFilter === '2gis' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePlatformChange('2gis')}
            >
              2ГИС
            </Button>
          </div>
        </div>
      )}

      {/* Карточки статистики */}
      <div className="report-stats-grid">
        <Card padding="md" hoverable onClick={() => handleStatCardClick('all')}
          className={`stat-card-clickable${sentimentFilter === 'all' ? ' stat-card-active' : ''}`}>
          <div className="stat-item">
            <span className="stat-label">Всего отзывов</span>
            <span className="stat-value">{currentStats?.totalReviews ?? 0}</span>
          </div>
        </Card>
        <Card padding="md" hoverable onClick={() => handleStatCardClick('positive')}
          className={`stat-card-clickable${sentimentFilter === 'positive' ? ' stat-card-active stat-card-active--positive' : ''}`}>
          <div className="stat-item stat-item--positive">
            <span className="stat-label">Позитивные</span>
            <span className="stat-value">{currentStats?.positiveReviews ?? 0}</span>
          </div>
        </Card>
        <Card padding="md" hoverable onClick={() => handleStatCardClick('neutral')}
          className={`stat-card-clickable${sentimentFilter === 'neutral' ? ' stat-card-active stat-card-active--neutral' : ''}`}>
          <div className="stat-item stat-item--neutral">
            <span className="stat-label">Нейтральные</span>
            <span className="stat-value">{currentStats?.neutralReviews ?? 0}</span>
          </div>
        </Card>
        <Card padding="md" hoverable onClick={() => handleStatCardClick('negative')}
          className={`stat-card-clickable${sentimentFilter === 'negative' ? ' stat-card-active stat-card-active--negative' : ''}`}>
          <div className="stat-item stat-item--negative">
            <span className="stat-label">Негативные</span>
            <span className="stat-value">{currentStats?.negativeReviews ?? 0}</span>
          </div>
        </Card>
      </div>

      {/* Анализ по категориям */}
      {currentCategoryStats.length > 0 && (
        <Card padding="lg">
          <CardHeader>
            <div className="card-header-with-action">
              <CardTitle>Анализ по категориям</CardTitle>
              <BarChartIcon size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="categories-grid">
              {currentCategoryStats.map((cat) => {
                const ratingColor = getRatingColor(cat.averageRating);
                const isActive = categoryFilter === cat.category;
                return (
                  <div
                    key={cat.category}
                    className={`category-card category-card-clickable${isActive ? ' category-card-active' : ''}`}
                    onClick={() => handleCategoryClick(cat.category)}
                    title="Нажмите, чтобы посмотреть отзывы"
                    style={{
                      border: `2px solid ${ratingColor}`,
                      borderRadius: '12px',
                      padding: '16px',
                      backgroundColor: isActive ? `${ratingColor}20` : `${ratingColor}0d`,
                      cursor: 'pointer',
                      outline: isActive ? `2px solid ${ratingColor}` : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    <div className="category-header">
                      <div className="category-icon" style={{ backgroundColor: `${ratingColor}20`, color: ratingColor }}>
                        {categoryLabels[cat.category]}
                      </div>
                      <div className="category-rating" style={{ color: ratingColor }}>
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

      {/* Инсайты и рекомендации */}
      {viewMode === 'summary' ? (
        <div className="report-content-grid">
          <Card padding="lg">
            <CardHeader><CardTitle>Ключевые инсайты</CardTitle></CardHeader>
            <CardContent>
              <ul className="report-items-list">
                {report.insights.slice(0, 3).map((insight, i) => (
                  <li key={i} className="report-items-list__item report-items-list__item--insight">{insight}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card padding="lg">
            <CardHeader><CardTitle>Рекомендации</CardTitle></CardHeader>
            <CardContent>
              <ul className="report-items-list">
                {report.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="report-items-list__item report-items-list__item--rec">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="report-content-grid">
          <Card padding="lg">
            <CardHeader><CardTitle>Все ключевые инсайты</CardTitle></CardHeader>
            <CardContent>
              <ul className="report-items-list">
                {report.insights.map((insight, i) => (
                  <li key={i} className="report-items-list__item report-items-list__item--insight">{insight}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card padding="lg">
            <CardHeader><CardTitle>Все рекомендации</CardTitle></CardHeader>
            <CardContent>
              <ul className="report-items-list">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="report-items-list__item report-items-list__item--rec">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Отзывы */}
      {report.reviews && report.reviews.length > 0 && (
        <div ref={reviewsSectionRef}>
          <Card padding="lg">
            <CardHeader>
              <div className="card-header-with-action">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <CardTitle>
                    Отзывы ({filteredReviews.length}{filteredReviews.length !== report.reviews.length ? ` из ${report.reviews.length}` : ''})
                  </CardTitle>
                  {hasActiveQuickFilter && (
                    <div className="reviews-filter-badge">
                      <span>
                        {sentimentFilter === 'positive' && 'Позитивные отзывы'}
                        {sentimentFilter === 'neutral' && 'Нейтральные отзывы'}
                        {sentimentFilter === 'negative' && 'Негативные отзывы'}
                        {categoryFilter && `Категория: ${categoryLabels[categoryFilter]}`}
                      </span>
                      <button className="reviews-filter-clear" onClick={clearFilters} title="Сбросить фильтры">✕</button>
                    </div>
                  )}
                </div>
                <div className="rff-sort-trigger" ref={sortDropdownRef}>
                  <button
                    className={`rff-sort-btn${showSortDropdown ? ' rff-sort-btn--open' : ''}${reviewDateFrom || reviewDateTo ? ' rff-sort-btn--dated' : ''}`}
                    onClick={() => setShowSortDropdown(v => !v)}
                  >
                    <span className="rff-sort-icon">⇅</span>
                    <span>{reviewSortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
                    {(reviewDateFrom || reviewDateTo) && <span className="rff-sort-dot" />}
                    <span className={`rff-sort-chevron${showSortDropdown ? ' rff-sort-chevron--up' : ''}`}>▾</span>
                  </button>
                  {showSortDropdown && (
                    <div className="rff-sort-dropdown">
                      <div className="rff-group">
                        <span className="rff-label">Сортировка</span>
                        <div className="rff-buttons">
                          <button
                            className={`rff-btn${reviewSortOrder === 'newest' ? ' rff-btn--active' : ''}`}
                            onClick={() => setReviewSortOrder('newest')}
                          >Сначала новые</button>
                          <button
                            className={`rff-btn${reviewSortOrder === 'oldest' ? ' rff-btn--active' : ''}`}
                            onClick={() => setReviewSortOrder('oldest')}
                          >Сначала старые</button>
                        </div>
                      </div>
                      <div className="rff-group">
                        <span className="rff-label">Период</span>
                        <div className="rff-date-range">
                          <input type="date" value={reviewDateFrom} onChange={e => setReviewDateFrom(e.target.value)} className="rff-date-input" />
                          <span className="rff-date-sep">—</span>
                          <input type="date" value={reviewDateTo} onChange={e => setReviewDateTo(e.target.value)} className="rff-date-input" />
                          {(reviewDateFrom || reviewDateTo) && (
                            <button className="rff-date-clear" onClick={() => { setReviewDateFrom(''); setReviewDateTo(''); }}>✕</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="reviews-filters-panel">
                <div className="rff-group">
                  <span className="rff-label">Тональность</span>
                  <div className="rff-buttons">
                    <button className={`rff-btn${!sentimentFilter || sentimentFilter === 'all' ? ' rff-btn--active' : ''}`} onClick={() => setSentimentFilter(null)}>Все</button>
                    <button className={`rff-btn rff-btn--positive${sentimentFilter === 'positive' ? ' rff-btn--active' : ''}`} onClick={() => setSentimentFilter('positive')}>Позитивные</button>
                    <button className={`rff-btn rff-btn--neutral${sentimentFilter === 'neutral' ? ' rff-btn--active' : ''}`} onClick={() => setSentimentFilter('neutral')}>Нейтральные</button>
                    <button className={`rff-btn rff-btn--negative${sentimentFilter === 'negative' ? ' rff-btn--active' : ''}`} onClick={() => setSentimentFilter('negative')}>Негативные</button>
                  </div>
                </div>
                {isCombined && (
                  <div className="rff-group">
                    <span className="rff-label">Платформа</span>
                    <div className="rff-buttons">
                      <button className={`rff-btn${reviewPlatformFilter === 'all' ? ' rff-btn--active' : ''}`} onClick={() => setReviewPlatformFilter('all')}>Все</button>
                      <button className={`rff-btn${reviewPlatformFilter === 'yandex' ? ' rff-btn--active' : ''}`} onClick={() => setReviewPlatformFilter('yandex')}>Яндекс</button>
                      <button className={`rff-btn${reviewPlatformFilter === '2gis' ? ' rff-btn--active' : ''}`} onClick={() => setReviewPlatformFilter('2gis')}>2ГИС</button>
                    </div>
                  </div>
                )}
              </div>

              {filteredReviews.length === 0 && (
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px 0' }}>
                  Отзывов по выбранным фильтрам не найдено
                </p>
              )}
              <div className="reviews-list-detail">
                {filteredReviews.map((review) => (
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
                            <StarIcon key={i} size={16} color={i < review.rating ? '#fbbf24' : '#e2e8f0'} />
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
                            style={{ backgroundColor: `${categoryColors[cat]}18`, color: categoryColors[cat] }}
                          >
                            {categoryLabels[cat]}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="review-footer">
                      <span className="review-date">{format(review.date, 'd MMMM yyyy', { locale: ru })}</span>
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

      {showPdfModal && (
        <PdfExportModal report={report} onClose={() => setShowPdfModal(false)} />
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { FileTextIcon, PlusIcon, MapPinIcon, StarIcon } from '../../shared/ui';
import { reportApi } from '../../shared/api/reportApi';
import { authApi } from '../../shared/api/authApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import type { Report } from '../../shared/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './DashboardPage.css';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(' ')[0];
}

const SENTIMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const RatingTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__date">{label}</span>
      <span className="chart-tooltip__val">{payload[0].value} ★</span>
    </div>
  );
};

interface PlatformAgg {
  reviews: number;
  ratingSum: number;
  ratingCount: number;
  positive: number;
}

const initAgg = (): PlatformAgg => ({ reviews: 0, ratingSum: 0, ratingCount: 0, positive: 0 });

const addStats = (
  agg: PlatformAgg,
  stats: { totalReviews?: number; averageRating?: number; positiveReviews?: number },
) => {
  const n = stats.totalReviews || 0;
  if (n > 0) {
    agg.reviews += n;
    agg.ratingSum += (stats.averageRating || 0) * n;
    agg.ratingCount += n;
    agg.positive += stats.positiveReviews || 0;
  }
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const currentUser = authApi.getCurrentUser();

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await reportApi.getReports();
      const normalized = (Array.isArray(data) ? data : []).map(normalizeReport);
      setAllReports(normalized);
      setRecentReports(normalized.slice(0, 3));
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Rating trend ---
  const trendData = [...allReports]
    .filter(r => r.period?.end)
    .sort((a, b) => new Date(a.period!.end).getTime() - new Date(b.period!.end).getTime())
    .map(r => ({
      date: format(new Date(r.period!.end), 'd MMM', { locale: ru }),
      rating: parseFloat((r.stats?.averageRating || 0).toFixed(2)),
    }));

  // --- Sentiment ---
  const totalPos = allReports.reduce((s, r) => s + (r.stats?.positiveReviews || 0), 0);
  const totalNeu = allReports.reduce((s, r) => s + (r.stats?.neutralReviews || 0), 0);
  const totalNeg = allReports.reduce((s, r) => s + (r.stats?.negativeReviews || 0), 0);
  const totalAll = totalPos + totalNeu + totalNeg;

  const sentimentData = [
    { name: 'Позитивные', value: totalPos },
    { name: 'Нейтральные', value: totalNeu },
    { name: 'Негативные', value: totalNeg },
  ].filter(d => d.value > 0);

  // --- Platform comparison ---
  const yandexAgg = initAgg();
  const twogisAgg = initAgg();

  allReports.forEach(r => {
    if (r.platform === 'yandex') {
      addStats(yandexAgg, r.stats || {});
    } else if (r.platform === '2gis') {
      addStats(twogisAgg, r.stats || {});
    } else if (r.platform === 'all' && r.sourceStats) {
      if (r.sourceStats.yandex) addStats(yandexAgg, r.sourceStats.yandex);
      if (r.sourceStats['2gis']) addStats(twogisAgg, r.sourceStats['2gis']);
    }
  });

  const platforms = [
    {
      key: 'yandex',
      label: 'Яндекс Карты',
      color: '#f59e0b',
      agg: yandexAgg,
      rating: yandexAgg.ratingCount > 0 ? yandexAgg.ratingSum / yandexAgg.ratingCount : null,
    },
    {
      key: '2gis',
      label: '2ГИС',
      color: '#10b981',
      agg: twogisAgg,
      rating: twogisAgg.ratingCount > 0 ? twogisAgg.ratingSum / twogisAgg.ratingCount : null,
    },
  ];

  // --- Rating distribution ---
  type StarKey = 1 | 2 | 3 | 4 | 5;
  const ratingDist: Record<StarKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allReports.forEach(r => {
    if (r.ratingDistribution) {
      ([1, 2, 3, 4, 5] as StarKey[]).forEach(s => {
        ratingDist[s] += (r.ratingDistribution as any)[s] || 0;
      });
    }
  });
  const totalRated = Object.values(ratingDist).reduce((a, b) => a + b, 0);
  const starColors: Record<StarKey, string> = {
    5: '#10b981',
    4: '#6366f1',
    3: '#f59e0b',
    2: '#f97316',
    1: '#ef4444',
  };

  const hasData = allReports.length > 0;

  return (
    <div className="dashboard-page">

      {/* Welcome */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1 className="dashboard-title">
            {getGreeting()}, {getFirstName(currentUser?.name || 'пользователь')}!
          </h1>
          <p className="dashboard-subtitle">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="dashboard-quick-actions">
          <Button variant="primary" size="sm" icon={<PlusIcon size={16} />} onClick={() => navigate('/reports')}>
            Новый отчёт
          </Button>
          <Button variant="outline" size="sm" icon={<MapPinIcon size={16} />} onClick={() => navigate('/locations')}>
            Мои филиалы
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileTextIcon size={16} />}
            onClick={() => recentReports.length > 0 && navigate(`/reports/${recentReports[0].id}`)}
            disabled={recentReports.length === 0}
          >
            Последний отчёт
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && !hasData ? (
        <div className="dashboard-empty">
          <div className="dashboard-empty__icon">📊</div>
          <h3 className="dashboard-empty__title">Пока нет данных для анализа</h3>
          <p className="dashboard-empty__sub">Создайте первый отчёт, чтобы увидеть аналитику</p>
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => navigate('/reports')}>
            Создать отчёт
          </Button>
        </div>
      ) : (
        <>
          {/* Row 1: trend + donut */}
          <div className="dashboard-charts">

            {/* Area chart – rating trend */}
            <Card padding="lg" className="chart-card">
              <CardHeader>
                <CardTitle>Динамика рейтинга</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="chart-placeholder" />
                ) : trendData.length < 2 ? (
                  <div className="chart-hint">
                    Недостаточно отчётов для отображения тренда.<br />
                    Создайте ещё один отчёт — и тренд появится здесь.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<RatingTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="rating"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#ratingGrad)"
                        dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Donut – sentiment */}
            <Card padding="lg" className="chart-card">
              <CardHeader>
                <CardTitle>Тональность отзывов</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="chart-placeholder" />
                ) : totalAll === 0 ? (
                  <div className="chart-hint">Нет данных о тональности</div>
                ) : (
                  <div className="sentiment-layout">
                    <div className="sentiment-donut-wrap">
                      <PieChart width={156} height={156}>
                        <Pie
                          data={sentimentData}
                          cx={74}
                          cy={74}
                          innerRadius={46}
                          outerRadius={70}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          strokeWidth={2}
                          stroke="var(--color-surface)"
                        >
                          {sentimentData.map((_, i) => (
                            <Cell key={i} fill={SENTIMENT_COLORS[i]} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div className="sentiment-donut-center">
                        <span className="sentiment-donut-total">{totalAll.toLocaleString('ru-RU')}</span>
                        <span className="sentiment-donut-label">отзывов</span>
                      </div>
                    </div>
                    <div className="sentiment-legend">
                      {sentimentData.map((item, i) => (
                        <div key={item.name} className="sentiment-row">
                          <span className="sentiment-dot" style={{ background: SENTIMENT_COLORS[i] }} />
                          <span className="sentiment-name">{item.name}</span>
                          <span className="sentiment-pct">
                            {Math.round((item.value / totalAll) * 100)}%
                          </span>
                          <span className="sentiment-cnt">({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: platforms + attention */}
          <div className="dashboard-insights">

            {/* Platform comparison */}
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Платформы</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="chart-placeholder" style={{ height: 120 }} />
                ) : (
                  <div className="platforms-grid">
                    {platforms.map(p => (
                      <div
                        key={p.key}
                        className="platform-tile"
                        style={{ '--pc': p.color } as React.CSSProperties}
                      >
                        <div className="platform-tile__name">{p.label}</div>
                        {p.rating !== null ? (
                          <>
                            <div className="platform-tile__rating">{p.rating.toFixed(1)}</div>
                            <div className="platform-tile__stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  size={12}
                                  color={i < Math.round(p.rating!) ? p.color : 'var(--color-border)'}
                                />
                              ))}
                            </div>
                            <div className="platform-tile__meta">
                              {p.agg.reviews.toLocaleString('ru-RU')} отзывов
                            </div>
                            <div className="platform-tile__bar-track">
                              <div
                                className="platform-tile__bar-fill"
                                style={{
                                  width: `${p.agg.reviews > 0 ? Math.round((p.agg.positive / p.agg.reviews) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <div className="platform-tile__bar-label">
                              {p.agg.reviews > 0
                                ? Math.round((p.agg.positive / p.agg.reviews) * 100)
                                : 0}% позитивных
                            </div>
                          </>
                        ) : (
                          <div className="platform-tile__empty">Нет отчётов</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating distribution */}
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Распределение оценок</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="chart-placeholder" style={{ height: 160 }} />
                ) : totalRated === 0 ? (
                  <div className="chart-hint">Нет данных о распределении оценок</div>
                ) : (
                  <div className="rating-dist">
                    {([5, 4, 3, 2, 1] as StarKey[]).map(star => {
                      const count = ratingDist[star];
                      const pct = Math.round((count / totalRated) * 100);
                      return (
                        <div key={star} className="rating-dist-row">
                          <span className="rating-dist-label">
                            {star} <span style={{ color: starColors[star] }}>★</span>
                          </span>
                          <div className="rating-dist-track">
                            <div
                              className="rating-dist-fill"
                              style={{ width: `${pct}%`, background: starColors[star] }}
                            />
                          </div>
                          <span className="rating-dist-pct">{pct}%</span>
                          <span className="rating-dist-count">{count.toLocaleString('ru-RU')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Recent reports */}
          <Card padding="lg">
            <CardHeader>
              <div className="card-header-with-action">
                <CardTitle>Последние отчёты</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                  Смотреть все
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="chart-placeholder" style={{ height: 80 }} />
              ) : recentReports.length === 0 ? (
                <div className="chart-hint">Создайте первый отчёт!</div>
              ) : (
                <div className="reports-list">
                  {recentReports.map(report => (
                    <div key={report.id} className="report-item">
                      <div className="report-icon">
                        <FileTextIcon size={20} />
                      </div>
                      <div className="report-info">
                        <h4 className="report-title">{report.title}</h4>
                        <p className="report-period">
                          {report.period && format(report.period.start, 'd MMM', { locale: ru })}
                          {' — '}
                          {report.period && format(report.period.end, 'd MMM yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div className="report-stats-mini">
                        <div className="stat-mini">
                          <span className="stat-mini-value">{report.stats?.totalReviews || 0}</span>
                          <span className="stat-mini-label">отзывов</span>
                        </div>
                        <div className="stat-mini">
                          <span className="stat-mini-value">
                            {(report.stats?.averageRating || 0).toFixed(1)}
                          </span>
                          <span className="stat-mini-label">рейтинг</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}`)}>
                        Открыть
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { BarChartIcon, TrendingUpIcon, StarIcon, FileTextIcon } from '../../shared/ui';
import { StatsCard } from '../../widgets/stats-card';
import { reportApi } from '../../shared/api/reportApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import type { Report } from '../../shared/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './DashboardPage.css';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReports, setTotalReports] = useState(0);

  useEffect(() => {
    loadRecentReports();
  }, []);

  const loadRecentReports = async () => {
    try {
      setLoading(true);
      const data = await reportApi.getReports();
      const safeData = Array.isArray(data) ? data : [];
      const normalized = safeData.map(normalizeReport);

      // Берём 3 последних отчёта
      setRecentReports(normalized.slice(0, 3));
      setTotalReports(normalized.length);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setRecentReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Собираем 10 последних отзывов из всех отчётов или используем демо-данные
  const actualReviews = recentReports
    .flatMap(report => (report.reviews || []).map(review => ({ ...review, reportTitle: report.title })))
    .slice(0, 10);

  // Демо-отзывы для красивого отображения
  const demoReviews = [
    {
      id: 'demo-1',
      author: 'Анна К.',
      rating: 5,
      text: 'Отличный парк! Очень чисто, много зелени. Детские площадки в отличном состоянии. Приятно проводить время с семьёй.',
      date: new Date('2025-12-15'),
      platform: 'yandex' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-2',
      author: 'Михаил С.',
      rating: 4,
      text: 'Хорошее место для прогулок. Единственный минус - мало лавочек в тенистых местах летом.',
      date: new Date('2025-12-14'),
      platform: 'yandex' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-3',
      author: 'Елена В.',
      rating: 5,
      text: 'Новогоднее оформление просто волшебное! Иллюминация, каток, праздничная атмосфера. Спасибо!',
      date: new Date('2025-12-13'),
      platform: '2gis' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-4',
      author: 'Дмитрий П.',
      rating: 3,
      text: 'В целом неплохо, но в выходные слишком много людей. Парковка переполнена.',
      date: new Date('2025-12-12'),
      platform: 'yandex' as const,
      sentiment: 'neutral' as const,
    },
    {
      id: 'demo-5',
      author: 'Ольга Н.',
      rating: 5,
      text: 'Прекрасное место для утренних пробежек! Удобные дорожки, свежий воздух.',
      date: new Date('2025-12-11'),
      platform: '2gis' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-6',
      author: 'Александр Б.',
      rating: 4,
      text: 'Хороший парк, но хотелось бы больше кафе и точек с едой.',
      date: new Date('2025-12-10'),
      platform: 'yandex' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-7',
      author: 'Мария Л.',
      rating: 2,
      text: 'Разочарована состоянием туалетов. Очень грязно, требуется срочная уборка.',
      date: new Date('2025-12-09'),
      platform: 'yandex' as const,
      sentiment: 'negative' as const,
    },
    {
      id: 'demo-8',
      author: 'Сергей Т.',
      rating: 5,
      text: 'Отличная инфраструктура! Есть всё необходимое. Особенно понравился новый спортивный городок.',
      date: new Date('2025-12-08'),
      platform: '2gis' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-9',
      author: 'Наталья Ф.',
      rating: 4,
      text: 'Красивый парк с ухоженными клумбами. Приятно гулять в любое время года.',
      date: new Date('2025-12-07'),
      platform: 'yandex' as const,
      sentiment: 'positive' as const,
    },
    {
      id: 'demo-10',
      author: 'Игорь К.',
      rating: 5,
      text: 'Отлично провели корпоратив! Организация на высшем уровне, красивые локации для фото.',
      date: new Date('2025-12-06'),
      platform: '2gis' as const,
      sentiment: 'positive' as const,
    },
  ];

  const recentReviews = actualReviews.length > 0 ? actualReviews : demoReviews;

  // Рассчитываем статистику из последних отчётов
  const stats = {
    totalReviews: recentReports.reduce((acc, r) => acc + (r.stats?.totalReviews || 0), 0),
    averageRating: recentReports.length > 0
      ? recentReports.reduce((acc, r) => acc + (r.stats?.averageRating || 0), 0) / recentReports.length
      : 0,
    positivePercentage: recentReports.length > 0
      ? Math.round(
          (recentReports.reduce((acc, r) => acc + (r.stats?.positiveReviews || 0), 0) /
          recentReports.reduce((acc, r) => acc + (r.stats?.totalReviews || 0), 0)) * 100
        )
      : 0,
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Панель управления</h1>
          <p className="dashboard-subtitle">Обзор аналитики и последних отчетов</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <StatsCard
          title="Всего отзывов"
          value={stats.totalReviews}
          icon={<BarChartIcon size={28} />}
          color="primary"
        />
        <StatsCard
          title="Средний рейтинг"
          value={stats.averageRating.toFixed(1)}
          icon={<StarIcon size={28} />}
          color="success"
        />
        <StatsCard
          title="Позитивные отзывы"
          value={`${stats.positivePercentage}%`}
          icon={<TrendingUpIcon size={28} />}
          color="info"
        />
        <StatsCard
          title="Отчетов создано"
          value={totalReports}
          icon={<FileTextIcon size={28} />}
          color="warning"
        />
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section dashboard-section--full">
          <Card padding="lg">
            <CardHeader>
              <div className="card-header-with-action">
                <CardTitle>Последние отчеты</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                  Смотреть все
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Загрузка...
                </div>
              ) : recentReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Отчётов пока нет. Создайте первый отчёт!
                </div>
              ) : (
                <div className="reports-list">
                  {recentReports.map((report) => (
                    <div key={report.id} className="report-item">
                      <div className="report-icon">
                        <FileTextIcon size={20} />
                      </div>
                      <div className="report-info">
                        <h4 className="report-title">{report.title}</h4>
                        <p className="report-period">
                          {report.period && format(report.period.start, 'd MMM', { locale: ru })} - {report.period && format(report.period.end, 'd MMM yyyy', { locale: ru })}
                        </p>
                      </div>
                      <div className="report-stats-mini">
                        <div className="stat-mini">
                          <span className="stat-mini-value">{report.stats?.totalReviews || 0}</span>
                          <span className="stat-mini-label">отзывов</span>
                        </div>
                        <div className="stat-mini">
                          <span className="stat-mini-value">{(report.stats?.averageRating || 0).toFixed(1)}</span>
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
        </div>

        <div className="dashboard-section dashboard-section--full">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Последние отзывы</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Загрузка...
                </div>
              ) : recentReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  Отзывов пока нет
                </div>
              ) : (
                <div className="reviews-list">
                  {recentReviews.map((review, index) => (
                    <div key={`${review.id}-${index}`} className="review-item">
                      <div className="review-header">
                        <div className="review-author-info">
                          <span className="review-author">{review.author}</span>
                          <span className={`review-platform-badge review-platform-badge--${review.platform}`}>
                            {review.platform === 'yandex' ? 'Яндекс' : '2ГИС'}
                          </span>
                        </div>
                        <div className="review-rating">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon
                              key={i}
                              size={14}
                              color={i < review.rating ? 'var(--color-warning)' : 'var(--color-border)'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="review-text">{review.text}</p>
                      <div className="review-footer">
                        <span className="review-date">
                          {review.date && format(new Date(review.date), 'd MMM yyyy', { locale: ru })}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

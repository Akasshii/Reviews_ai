import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { BarChartIcon, TrendingUpIcon, StarIcon, FileTextIcon } from '../../shared/ui';
import { StatsCard } from '../../widgets/stats-card';
import { mockDashboardStats, mockReports } from '../../shared/lib/mockData';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './DashboardPage.css';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const stats = mockDashboardStats;
  const recentReports = mockReports.slice(0, 3);

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
          trend={{ value: stats.reviewsTrend, isPositive: true }}
          color="primary"
        />
        <StatsCard
          title="Средний рейтинг"
          value={stats.averageRating.toFixed(1)}
          icon={<StarIcon size={28} />}
          trend={{ value: stats.ratingTrend, isPositive: stats.ratingTrend > 0 }}
          color="success"
        />
        <StatsCard
          title="Позитивные отзывы"
          value={`${Math.round((stats.ratingDistribution.filter(r => r.rating >= 4).reduce((acc, r) => acc + r.count, 0) / stats.totalReviews) * 100)}%`}
          icon={<TrendingUpIcon size={28} />}
          color="info"
        />
        <StatsCard
          title="Отчетов создано"
          value={mockReports.length}
          icon={<FileTextIcon size={28} />}
          color="warning"
        />
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <Card padding="lg">
            <CardHeader>
              <div className="card-header-with-action">
                <CardTitle>Распределение рейтингов</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rating-distribution">
                {stats.ratingDistribution.reverse().map((item) => {
                  const percentage = (item.count / stats.totalReviews) * 100;
                  return (
                    <div key={item.rating} className="rating-row">
                      <div className="rating-label">
                        <StarIcon size={16} />
                        <span>{item.rating}</span>
                      </div>
                      <div className="rating-bar-container">
                        <div
                          className="rating-bar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.rating >= 4 ? 'var(--color-success)' : item.rating === 3 ? 'var(--color-warning)' : 'var(--color-error)',
                          }}
                        />
                      </div>
                      <div className="rating-count">{item.count}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="dashboard-section">
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
              <div className="reports-list">
                {recentReports.map((report) => (
                  <div key={report.id} className="report-item">
                    <div className="report-icon">
                      <FileTextIcon size={20} />
                    </div>
                    <div className="report-info">
                      <h4 className="report-title">{report.title}</h4>
                      <p className="report-period">
                        {format(report.period.start, 'd MMM', { locale: ru })} - {format(report.period.end, 'd MMM yyyy', { locale: ru })}
                      </p>
                    </div>
                    <div className="report-stats-mini">
                      <div className="stat-mini">
                        <span className="stat-mini-value">{report.stats.totalReviews}</span>
                        <span className="stat-mini-label">отзывов</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-mini-value">{report.stats.averageRating.toFixed(1)}</span>
                        <span className="stat-mini-label">рейтинг</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}`)}>
                      Открыть
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="dashboard-section dashboard-section--full">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Последние отзывы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="reviews-list">
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <div className="review-author-info">
                        <span className="review-author">{review.author}</span>
                        <span className="review-platform-badge review-platform-badge--{review.platform}">
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
                        {format(review.date, 'd MMM yyyy', { locale: ru })}
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
      </div>
    </div>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { PlusIcon, FilterIcon, DownloadIcon, FileTextIcon, CalendarIcon, StarIcon } from '../../shared/ui';
import { mockReports } from '../../shared/lib/mockData';
import type { Report } from '../../shared/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './ReportsPage.css';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reports] = useState<Report[]>(mockReports);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'yandex' | '2gis'>('all');

  const filteredReports = reports.filter(
    (report) => selectedPlatform === 'all' || report.platform === selectedPlatform
  );

  const groupedReports = filteredReports.reduce((acc, report) => {
    const monthKey = format(report.createdAt, 'LLLL yyyy', { locale: ru });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#10b981';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    if (rating >= 3.0) return '#fb923c';
    return '#ef4444';
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Отчеты</h1>
          <p className="reports-subtitle">История анализа отзывов и рекомендации</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<PlusIcon size={20} />}
          onClick={() => setShowGenerateModal(true)}
        >
          Создать отчет
        </Button>
      </div>

      <div className="reports-filters">
        <div className="filter-group">
          <FilterIcon size={20} />
          <span className="filter-label">Платформа:</span>
          <div className="filter-buttons">
            <Button
              variant={selectedPlatform === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('all')}
            >
              Все
            </Button>
            <Button
              variant={selectedPlatform === 'yandex' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('yandex')}
            >
              Яндекс.Карты
            </Button>
            <Button
              variant={selectedPlatform === '2gis' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('2gis')}
            >
              2ГИС
            </Button>
          </div>
        </div>
      </div>

      <div className="reports-content">
        {Object.entries(groupedReports).map(([month, monthReports]) => (
          <div key={month} className="reports-month-group">
            <h2 className="month-title">{month}</h2>
            <div className="reports-list">
              {monthReports.map((report) => (
                <Card key={report.id} hoverable padding="none" className="report-card-wrapper">
                  <div className="report-card-new" onClick={() => navigate(`/reports/${report.id}`)}>
                    <div className="report-card-left">
                      <div
                        className="report-rating-circle"
                        style={{
                          backgroundColor: `${getRatingColor(report.stats.averageRating)}15`,
                          color: getRatingColor(report.stats.averageRating),
                        }}
                      >
                        <span className="report-rating-value">{report.stats.averageRating.toFixed(1)}</span>
                        <StarIcon size={18} color={getRatingColor(report.stats.averageRating)} />
                      </div>
                    </div>

                    <div className="report-card-main">
                      <div className="report-card-header-new">
                        <div className="report-card-title-section">
                          <h3 className="report-card-title-new">{report.title}</h3>
                          <span className={`report-status-badge report-status-badge--${report.status}`}>
                            {report.status === 'ready' ? 'Готов' : report.status === 'generating' ? 'Генерируется...' : 'Ошибка'}
                          </span>
                        </div>
                        <div className="report-card-meta-new">
                          <CalendarIcon size={14} />
                          <span>
                            {format(report.period.start, 'd MMM', { locale: ru })} - {format(report.period.end, 'd MMM yyyy', { locale: ru })}
                          </span>
                          <span className="meta-separator">•</span>
                          <span className="platform-tag">
                            {report.platform === 'all' ? 'Все платформы' : report.platform === 'yandex' ? 'Яндекс' : '2ГИС'}
                          </span>
                        </div>
                      </div>

                      <div className="report-card-stats-row">
                        <div className="report-stat-inline">
                          <span className="stat-inline-label">Отзывов:</span>
                          <span className="stat-inline-value">{report.stats.totalReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--positive">
                          <span className="stat-inline-label">Позитивные:</span>
                          <span className="stat-inline-value">{report.stats.positiveReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--neutral">
                          <span className="stat-inline-label">Нейтральные:</span>
                          <span className="stat-inline-value">{report.stats.neutralReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--negative">
                          <span className="stat-inline-label">Негативные:</span>
                          <span className="stat-inline-value">{report.stats.negativeReviews}</span>
                        </div>
                      </div>

                      <div className="report-card-insights-preview">
                        <p className="insights-preview-text">{report.insights[0]}</p>
                      </div>
                    </div>

                    <div className="report-card-actions-new">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${report.id}`);
                        }}
                      >
                        Открыть
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<DownloadIcon size={16} />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        PDF
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showGenerateModal && (
        <GenerateReportModal onClose={() => setShowGenerateModal(false)} />
      )}
    </div>
  );
};

const GenerateReportModal = ({ onClose }: { onClose: () => void }) => {
  const [platform, setPlatform] = useState<'all' | 'yandex' | '2gis'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerate = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Создать новый отчет</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Платформа</label>
                <div className="platform-selector">
                  <Button
                    variant={platform === 'all' ? 'primary' : 'outline'}
                    onClick={() => setPlatform('all')}
                    fullWidth
                  >
                    Все платформы
                  </Button>
                  <Button
                    variant={platform === 'yandex' ? 'primary' : 'outline'}
                    onClick={() => setPlatform('yandex')}
                    fullWidth
                  >
                    Яндекс.Карты
                  </Button>
                  <Button
                    variant={platform === '2gis' ? 'primary' : 'outline'}
                    onClick={() => setPlatform('2gis')}
                    fullWidth
                  >
                    2ГИС
                  </Button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Период</label>
                <div className="date-inputs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                  />
                  <span>—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <Button variant="outline" onClick={onClose} fullWidth>
                  Отмена
                </Button>
                <Button variant="primary" onClick={handleGenerate} fullWidth>
                  Создать отчет
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

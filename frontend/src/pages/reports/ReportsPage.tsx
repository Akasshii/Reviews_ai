import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { PlusIcon, FilterIcon, DownloadIcon, FileTextIcon, CalendarIcon, StarIcon, TrashIcon } from '../../shared/ui';
import { reportApi } from '../../shared/api/reportApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import type { Report } from '../../shared/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './ReportsPage.css';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'yandex' | '2gis'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportApi.getReports();
      // Защита от null - если backend вернул null, используем пустой массив
      const safeData = Array.isArray(data) ? data : [];
      const normalized = safeData.map(normalizeReport);
      setReports(normalized);
    } catch (err) {
      setError('Ошибка загрузки отчётов');
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Вы уверены, что хотите удалить этот отчёт?')) {
      return;
    }

    try {
      setDeletingId(reportId);
      await reportApi.deleteReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
    } catch (err: any) {
      alert('Ошибка при удалении отчёта: ' + (err.message || 'Неизвестная ошибка'));
      console.error('Failed to delete report:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReports = reports.filter(
    (report) => selectedPlatform === 'all' || report.platform === selectedPlatform
  );

  const groupedReports = filteredReports.reduce((acc, report) => {
    const createdAt = new Date(report.createdAt);
    const monthKey = format(createdAt, 'LLLL yyyy', { locale: ru });
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

  if (loading) {
    return (
      <div className="reports-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>Загрузка отчётов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-page">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <Button onClick={loadReports} style={{ marginTop: '20px' }}>Попробовать снова</Button>
        </div>
      </div>
    );
  }

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
        {filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
              У вас пока нет отчётов
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={<PlusIcon size={20} />}
              onClick={() => setShowGenerateModal(true)}
            >
              Создать первый отчёт
            </Button>
          </div>
        ) : (
          Object.entries(groupedReports).map(([month, monthReports]) => (
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
                        icon={<TrashIcon size={16} />}
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        disabled={deletingId === report.id}
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        {deletingId === report.id ? 'Удаление...' : 'Удалить'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
        )}
      </div>

      {showGenerateModal && (
        <GenerateReportModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={loadReports}
        />
      )}
    </div>
  );
};

const GenerateReportModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [title, setTitle] = useState('');
  const [yandexUrl, setYandexUrl] = useState('https://yandex.com/maps/org/chaykovsky_park_kultury_i_otdykha/204693811778/reviews/');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate] = useState('2025-12-20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!title || !yandexUrl || !startDate || !endDate) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await reportApi.createReport({
        title,
        yandexUrl,
        periodStart: new Date(startDate).toISOString(),
        periodEnd: new Date(endDate).toISOString(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания отчёта');
    } finally {
      setLoading(false);
    }
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
              {error && (
                <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Название отчёта</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Анализ за декабрь 2024"
                  className="date-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL Яндекс.Карт</label>
                <input
                  type="text"
                  value={yandexUrl}
                  onChange={(e) => setYandexUrl(e.target.value)}
                  placeholder="https://yandex.com/maps/org/..."
                  className="date-input"
                  style={{ width: '100%' }}
                />
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
                <Button variant="outline" onClick={onClose} fullWidth disabled={loading}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={handleGenerate} fullWidth disabled={loading}>
                  {loading ? 'Создание...' : 'Создать отчет'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

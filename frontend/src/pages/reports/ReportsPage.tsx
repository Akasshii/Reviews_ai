import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { PlusIcon, FilterIcon, CalendarIcon, StarIcon, TrashIcon } from '../../shared/ui';
import { reportApi } from '../../shared/api/reportApi';
import { locationApi } from '../../shared/api/locationApi';
import { normalizeReport } from '../../shared/lib/reportHelpers';
import type { Report, Location } from '../../shared/types';
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
                          backgroundColor: `${getRatingColor(report.stats!.averageRating)}15`,
                          color: getRatingColor(report.stats!.averageRating),
                        }}
                      >
                        <span className="report-rating-value">{report.stats!.averageRating.toFixed(1)}</span>
                        <StarIcon size={18} color={getRatingColor(report.stats!.averageRating)} />
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
                            {format(report.period!.start, 'd MMM', { locale: ru })} - {format(report.period!.end, 'd MMM yyyy', { locale: ru })}
                          </span>
                          <span className="meta-separator">•</span>
                          <span className="platform-tag">
                            {report.platform === 'all' ? 'Все платформы'
                            : report.platform === 'yandex' ? 'Яндекс.Карты'
                            : report.platform === '2gis' ? '2ГИС'
                            : report.platform}
                          </span>
                        </div>
                      </div>

                      <div className="report-card-stats-row">
                        <div className="report-stat-inline">
                          <span className="stat-inline-label">Отзывов:</span>
                          <span className="stat-inline-value">{report.stats!.totalReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--positive">
                          <span className="stat-inline-label">Позитивные:</span>
                          <span className="stat-inline-value">{report.stats!.positiveReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--neutral">
                          <span className="stat-inline-label">Нейтральные:</span>
                          <span className="stat-inline-value">{report.stats!.neutralReviews}</span>
                        </div>
                        <div className="report-stat-inline stat-inline--negative">
                          <span className="stat-inline-label">Негативные:</span>
                          <span className="stat-inline-value">{report.stats!.negativeReviews}</span>
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
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'yandex' | '2gis' | 'all'>('yandex');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    locationApi.getLocations()
      .then(data => {
        setLocations(Array.isArray(data) ? data : []);
      })
      .catch(() => setLocations([]))
      .finally(() => setLocationsLoading(false));
  }, []);

  const selectedLocation = locations.find(l => l.id === selectedLocationId);

  const derivedUrl =
    selectedPlatform === 'yandex' ? selectedLocation?.yandexUrl :
    selectedPlatform === '2gis' ? selectedLocation?.twogisUrl :
    undefined; // 'all' — обрабатывается отдельно в handleGenerate

  const locationMissingUrl = selectedLocation && (
    selectedPlatform === 'all'
      ? !selectedLocation.yandexUrl && !selectedLocation.twogisUrl
      : !derivedUrl
  );

  const platformLabel = (p: string) =>
    p === 'yandex' ? 'Яндекс.Карты' : p === '2gis' ? '2ГИС' : p;

  const handleGenerate = async () => {
    if (!title.trim()) { setError('Укажите название отчёта'); return; }
    if (!selectedLocationId) { setError('Выберите филиал'); return; }
    if (!startDate || !endDate) { setError('Укажите период'); return; }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Дата начала не может быть позже даты окончания');
      return;
    }

    if (selectedPlatform === 'all') {
      if (!selectedLocation?.yandexUrl && !selectedLocation?.twogisUrl) {
        setError(`У филиала "${selectedLocation?.name}" нет ни одной ссылки. Добавьте их в разделе Филиалы.`);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await reportApi.createReport({
          title: title.trim(),
          allPlatforms: true,
          yandexUrl: selectedLocation?.yandexUrl || undefined,
          twogisUrl: selectedLocation?.twogisUrl || undefined,
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
      return;
    }

    if (!derivedUrl) {
      setError(`У филиала "${selectedLocation?.name}" нет ссылки на ${platformLabel(selectedPlatform)}. Добавьте её в разделе Филиалы.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await reportApi.createReport({
        title: title.trim(),
        url: derivedUrl,
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
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Создать новый отчёт</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div className="spinner" />
                <p style={{ marginTop: '16px', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                  {selectedPlatform === 'all'
                    ? 'Собираем отзывы со всех платформ параллельно... Это может занять несколько минут'
                    : 'Собираем отзывы... Это может занять до 30 секунд'}
                </p>
              </div>
            ) : (
              <div className="modal-form">
                {error && (
                  <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px' }}>
                    {error}
                  </div>
                )}

                {/* Название */}
                <div className="form-group">
                  <label className="form-label">Название отчёта</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Анализ за апрель 2025"
                    className="date-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Платформа */}
                <div className="form-group">
                  <label className="form-label">Платформа</label>
                  <div className="filter-buttons">
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
                    <Button
                      variant={selectedPlatform === 'all' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPlatform('all')}
                    >
                      Все
                    </Button>
                  </div>
                </div>

                {/* Филиал */}
                <div className="form-group">
                  <label className="form-label">Филиал</label>
                  {locationsLoading ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      Загрузка филиалов...
                    </p>
                  ) : locations.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      Нет сохранённых филиалов.{' '}
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                        onClick={() => { onClose(); navigate('/locations'); }}
                      >
                        Перейти в Филиалы
                      </button>
                    </p>
                  ) : (
                    <>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => { setSelectedLocationId(e.target.value); setError(null); }}
                        className="date-input"
                        style={{ width: '100%' }}
                      >
                        <option value="">— Выберите филиал —</option>
                        {locations.map(loc => {
                          const hasUrl =
                            selectedPlatform === 'yandex' ? !!loc.yandexUrl :
                            selectedPlatform === '2gis' ? !!loc.twogisUrl :
                            !!(loc.yandexUrl || loc.twogisUrl);
                          return (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}{!hasUrl ? ' (нет ссылки)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {locationMissingUrl && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', marginTop: '4px' }}>
                          {selectedPlatform === 'all'
                            ? 'У этого филиала нет ни одной ссылки.'
                            : `У этого филиала нет ссылки на ${platformLabel(selectedPlatform)}.`}
                          {' '}Добавьте{selectedPlatform === 'all' ? ' их' : ' её'} в{' '}
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                            onClick={() => { onClose(); navigate('/locations'); }}
                          >
                            разделе Филиалы
                          </button>
                          .
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Период */}
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
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    fullWidth
                    disabled={locationsLoading || locations.length === 0}
                  >
                    Создать отчёт
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

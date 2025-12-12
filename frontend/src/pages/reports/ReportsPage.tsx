import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../shared/ui';
import { PlusIcon, FilterIcon, DownloadIcon, FileTextIcon, CalendarIcon } from '../../shared/ui';
import { mockReports } from '../../shared/lib/mockData';
import type { Report } from '../../shared/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './ReportsPage.css';

export const ReportsPage = () => {
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
            <div className="reports-grid">
              {monthReports.map((report) => (
                <Card key={report.id} hoverable padding="lg">
                  <div className="report-card">
                    <div className="report-card-header">
                      <div className="report-card-icon">
                        <FileTextIcon size={24} />
                      </div>
                      <span className={`report-status report-status--${report.status}`}>
                        {report.status === 'ready' ? 'Готов' : report.status === 'generating' ? 'Генерируется...' : 'Ошибка'}
                      </span>
                    </div>

                    <h3 className="report-card-title">{report.title}</h3>

                    <div className="report-card-meta">
                      <div className="report-meta-item">
                        <CalendarIcon size={16} />
                        <span>
                          {format(report.period.start, 'd MMM', { locale: ru })} - {format(report.period.end, 'd MMM', { locale: ru })}
                        </span>
                      </div>
                      <div className="report-meta-item">
                        <span className="platform-badge">
                          {report.platform === 'all' ? 'Все платформы' : report.platform === 'yandex' ? 'Яндекс' : '2ГИС'}
                        </span>
                      </div>
                    </div>

                    <div className="report-card-stats">
                      <div className="report-stat">
                        <span className="report-stat-value">{report.stats.totalReviews}</span>
                        <span className="report-stat-label">отзывов</span>
                      </div>
                      <div className="report-stat">
                        <span className="report-stat-value">{report.stats.averageRating.toFixed(1)}</span>
                        <span className="report-stat-label">средний балл</span>
                      </div>
                      <div className="report-stat">
                        <span className="report-stat-value">{report.stats.positiveReviews}</span>
                        <span className="report-stat-label">позитивных</span>
                      </div>
                    </div>

                    <div className="report-card-insights">
                      <h4 className="insights-title">Ключевые инсайты:</h4>
                      <ul className="insights-list">
                        {report.insights.slice(0, 2).map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="report-card-actions">
                      <Button variant="primary" fullWidth>
                        Открыть отчет
                      </Button>
                      <Button variant="outline" icon={<DownloadIcon size={18} />}>
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

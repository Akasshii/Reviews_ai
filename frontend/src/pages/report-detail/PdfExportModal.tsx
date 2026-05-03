import { useState } from 'react';
import { Button } from '../../shared/ui';
import { DownloadIcon } from '../../shared/ui';
import { exportReportPdf, type PdfSummaryMode, type PdfReviewsFilter } from '../../shared/lib/exportPdf';
import type { Report } from '../../shared/types';
import './PdfExportModal.css';

interface Props {
  report: Report;
  onClose: () => void;
}

const summaryOptions: { value: PdfSummaryMode; label: string; desc: string }[] = [
  { value: 'brief', label: 'Краткая', desc: 'Общее резюме отчёта' },
  { value: 'detailed', label: 'Подробная', desc: 'Анализ тональности, категорий и рекомендаций' },
];

const reviewsOptions: { value: PdfReviewsFilter; label: string }[] = [
  { value: 'none', label: 'Не включать' },
  { value: 'all', label: 'Все отзывы' },
  { value: 'positive', label: 'Только позитивные' },
  { value: 'neutral', label: 'Только нейтральные' },
  { value: 'negative', label: 'Только негативные' },
];

export const PdfExportModal = ({ report, onClose }: Props) => {
  const [summaryMode, setSummaryMode] = useState<PdfSummaryMode>('brief');
  const [reviewsFilter, setReviewsFilter] = useState<PdfReviewsFilter>('all');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = progress !== null;

  const handleExport = async () => {
    setError(null);
    setProgress('Подготовка...');
    try {
      await exportReportPdf(report, summaryMode, reviewsFilter, setProgress);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка при генерации PDF');
      setProgress(null);
    }
  };

  const reviewsCount = (filter: PdfReviewsFilter) => {
    if (!report.reviews) return 0;
    if (filter === 'all') return report.reviews.length;
    if (filter === 'none') return 0;
    return report.reviews.filter(r => r.sentiment === filter).length;
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal-content pdf-export-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <DownloadIcon size={20} />
            <h2>Экспорт PDF</h2>
          </div>
          {!loading && (
            <button className="pdf-modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
          )}
        </div>

        <div className="pdf-modal-body">
          {/* Summary mode */}
          <div className="pdf-option-group">
            <span className="pdf-option-label">Сводка</span>
            <div className="pdf-option-buttons">
              {summaryOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`pdf-opt-btn${summaryMode === opt.value ? ' pdf-opt-btn--active' : ''}`}
                  onClick={() => setSummaryMode(opt.value)}
                  disabled={loading}
                >
                  <span className="pdf-opt-btn__title">{opt.label}</span>
                  <span className="pdf-opt-btn__desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reviews filter */}
          <div className="pdf-option-group">
            <span className="pdf-option-label">Отзывы</span>
            <div className="pdf-reviews-options">
              {reviewsOptions.map(opt => {
                const count = reviewsCount(opt.value);
                const disabled = opt.value !== 'none' && count === 0;
                return (
                  <button
                    key={opt.value}
                    className={`pdf-rev-btn${reviewsFilter === opt.value ? ' pdf-rev-btn--active' : ''}${opt.value === 'none' ? ' pdf-rev-btn--none' : ''}${opt.value === 'negative' ? ' pdf-rev-btn--negative' : ''}${opt.value === 'positive' ? ' pdf-rev-btn--positive' : ''}${opt.value === 'neutral' ? ' pdf-rev-btn--neutral' : ''}`}
                    onClick={() => setReviewsFilter(opt.value)}
                    disabled={loading || disabled}
                    title={disabled ? 'Нет отзывов этой тональности' : undefined}
                  >
                    {opt.label}
                    {opt.value !== 'none' && (
                      <span className="pdf-rev-btn__count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress / error */}
          {loading && (
            <div className="pdf-progress">
              <span className="pdf-progress__spinner" />
              <span>{progress}</span>
            </div>
          )}
          {error && (
            <p className="pdf-error">{error}</p>
          )}
        </div>

        <div className="modal-actions">
          <Button variant="outline" onClick={onClose} disabled={loading}>Отмена</Button>
          <Button
            variant="primary"
            icon={<DownloadIcon size={16} />}
            onClick={handleExport}
            loading={loading}
          >
            Скачать PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

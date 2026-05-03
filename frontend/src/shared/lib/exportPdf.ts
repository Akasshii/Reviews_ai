import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Report, ReviewCategory } from '../types';

export type PdfSummaryMode = 'brief' | 'detailed';
export type PdfReviewsFilter = 'none' | 'all' | 'positive' | 'neutral' | 'negative';

const categoryLabels: Record<ReviewCategory, string> = {
  quality: 'Качество',
  service: 'Обслуживание',
  cleanliness: 'Чистота',
  atmosphere: 'Атмосфера',
  price: 'Цены',
};

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#16a34a';
  if (rating >= 4.0) return '#2563eb';
  if (rating >= 3.5) return '#d97706';
  if (rating >= 3.0) return '#ea580c';
  return '#dc2626';
}

function fmt(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

const H2 = 'font-size:15px;font-weight:600;margin:0 0 12px;border-bottom:1.5px solid #e5e7eb;padding-bottom:7px;color:#111827;';

// Returns body-level HTML (no <html>/<head>/<body> wrappers) — safe for innerHTML
function buildBodyHtml(report: Report, summaryMode: PdfSummaryMode, reviewsFilter: PdfReviewsFilter): string {
  const stats = report.stats!;
  const platformLabel =
    report.platform === 'all' ? 'Все платформы' :
    report.platform === 'yandex' ? 'Яндекс.Карты' : '2ГИС';
  const ratingColor = getRatingColor(stats.averageRating);
  const period = report.period
    ? `${fmtShort(report.period.start)} — ${fmt(report.period.end)}`
    : '';
  const pct = (n: number) => stats.totalReviews ? Math.round((n / stats.totalReviews) * 100) : 0;

  // ── Summary ───────────────────────────────────────────────────────
  let summaryHtml = '';
  if (report.summary) {
    if (summaryMode === 'brief') {
      summaryHtml = `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <h2 style="${H2}">Краткая сводка</h2>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">${report.summary}</p>
        </div>`;
    } else {
      const topCats = [...(report.categoryStats ?? [])].sort((a, b) => b.count - a.count).slice(0, 3)
        .map(c => categoryLabels[c.category] ?? c.category).join(', ');
      const badCats = (report.categoryStats ?? []).filter(c => c.averageRating < 4)
        .map(c => `${categoryLabels[c.category]} (${c.averageRating.toFixed(1)})`).join(', ');
      const ratingNote = stats.averageRating >= 4.5
        ? 'демонстрирует отличные показатели.'
        : stats.averageRating >= 4 ? 'показывает хорошие результаты с потенциалом роста.'
        : 'указывает на необходимость улучшений.';
      summaryHtml = `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <h2 style="${H2}">Подробная сводка</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 5px;">Общий анализ</h3>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">${report.summary}</p>
            </div>
            <div>
              <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 5px;">Анализ тональности</h3>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">
                За анализируемый период получено ${stats.totalReviews} отзывов.
                Большая часть (${pct(stats.positiveReviews)}%) — позитивные.
                ${stats.negativeReviews > 0 ? `Негативных: ${stats.negativeReviews} (${pct(stats.negativeReviews)}%).` : ''}
              </p>
            </div>
            ${topCats ? `<div>
              <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 5px;">Ключевые категории</h3>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">
                Чаще всего упоминаются: ${topCats}.${badCats ? ` Требуют улучшения: ${badCats}.` : ''}
              </p>
            </div>` : ''}
            <div>
              <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 5px;">Динамика и рекомендации</h3>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#374151;">
                Средний рейтинг ${stats.averageRating.toFixed(1)} ${ratingNote}
                Рекомендации: ${report.recommendations.slice(0, 2).join('; ').toLowerCase()}.
              </p>
            </div>
          </div>
        </div>`;
    }
  }

  // ── Platform stats ────────────────────────────────────────────────
  let platformStatsHtml = '';
  if (report.platform === 'all' && report.sourceStats) {
    const platforms = [
      { label: 'Яндекс.Карты', data: report.sourceStats.yandex },
      { label: '2ГИС', data: report.sourceStats['2gis'] },
    ].filter(p => p.data);
    if (platforms.length) {
      const cards = platforms.map(p => {
        const s = p.data!;
        const c = getRatingColor(s.averageRating);
        return `<div style="flex:1;border:1.5px solid #e5e7eb;border-radius:8px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
            <strong style="font-size:13px;">${p.label}</strong>
            <span style="font-size:16px;font-weight:700;color:${c};">${s.averageRating.toFixed(1)} ★</span>
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">${s.totalReviews} отзывов</div>
          <div style="font-size:12px;display:flex;gap:10px;">
            <span style="color:#16a34a;">+${s.positiveReviews} позит.</span>
            <span style="color:#6b7280;">=${s.neutralReviews} нейтр.</span>
            <span style="color:#dc2626;">-${s.negativeReviews} негат.</span>
          </div>
        </div>`;
      }).join('');
      platformStatsHtml = `
        <div style="margin-bottom:20px;">
          <h2 style="${H2}">Статистика по платформам</h2>
          <div style="display:flex;gap:14px;">${cards}</div>
        </div>`;
    }
  }

  // ── Categories ────────────────────────────────────────────────────
  let categoriesHtml = '';
  if (report.categoryStats && report.categoryStats.length > 0) {
    const rows = [...report.categoryStats].sort((a, b) => b.count - a.count).map(cat => {
      const c = getRatingColor(cat.averageRating);
      return `<tr>
        <td style="padding:7px 10px;font-weight:500;">${categoryLabels[cat.category] ?? cat.category}</td>
        <td style="padding:7px 10px;text-align:center;">${cat.count}</td>
        <td style="padding:7px 10px;text-align:center;color:${c};font-weight:600;">${cat.averageRating.toFixed(1)}</td>
        <td style="padding:7px 10px;text-align:center;color:#16a34a;">${cat.sentiment.positive}</td>
        <td style="padding:7px 10px;text-align:center;color:#6b7280;">${cat.sentiment.neutral}</td>
        <td style="padding:7px 10px;text-align:center;color:#dc2626;">${cat.sentiment.negative}</td>
      </tr>`;
    }).join('');
    categoriesHtml = `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <h2 style="${H2}">Анализ по категориям</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:7px 10px;text-align:left;border-bottom:1.5px solid #e5e7eb;">Категория</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1.5px solid #e5e7eb;">Упоминаний</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1.5px solid #e5e7eb;">Рейтинг</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1.5px solid #e5e7eb;color:#16a34a;">Позит.</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1.5px solid #e5e7eb;color:#6b7280;">Нейтр.</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1.5px solid #e5e7eb;color:#dc2626;">Негат.</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Insights + recommendations ────────────────────────────────────
  const insightItems = report.insights.map(i => `<li style="margin-bottom:5px;">${i}</li>`).join('');
  const recItems = report.recommendations.map(r => `<li style="margin-bottom:5px;">${r}</li>`).join('');
  const insightsRecsHtml = `
    <div style="margin-bottom:20px;display:flex;gap:20px;page-break-inside:avoid;">
      <div style="flex:1;">
        <h2 style="${H2}">Ключевые инсайты</h2>
        <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#374151;">${insightItems || '<li>Нет данных</li>'}</ul>
      </div>
      <div style="flex:1;">
        <h2 style="${H2}">Рекомендации</h2>
        <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#374151;">${recItems || '<li>Нет данных</li>'}</ul>
      </div>
    </div>`;

  // ── Reviews ───────────────────────────────────────────────────────
  let reviewsHtml = '';
  if (reviewsFilter !== 'none' && report.reviews && report.reviews.length > 0) {
    const filtered = [...report.reviews]
      .filter(r => reviewsFilter === 'all' || r.sentiment === reviewsFilter)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    if (filtered.length > 0) {
      const filterLabel: Record<string, string> = { all: 'все', positive: 'позитивные', neutral: 'нейтральные', negative: 'негативные' };
      const cards = filtered.map(review => {
        const sc = review.sentiment === 'positive' ? '#16a34a' : review.sentiment === 'negative' ? '#dc2626' : '#6b7280';
        const sl = review.sentiment === 'positive' ? 'Позитивный' : review.sentiment === 'negative' ? 'Негативный' : 'Нейтральный';
        const pl = review.platform === 'yandex' ? 'Яндекс' : '2ГИС';
        const cats = (review.categories ?? []).map(cat =>
          `<span style="font-size:11px;background:#f3f4f6;color:#374151;padding:2px 7px;border-radius:10px;margin-right:3px;">${categoryLabels[cat] ?? cat}</span>`
        ).join('');
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div>
              <strong style="font-size:13px;">${review.author}</strong>
              <span style="font-size:11px;background:#f3f4f6;color:#374151;padding:2px 6px;border-radius:10px;margin-left:7px;">${pl}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:#f59e0b;font-size:12px;">${stars(review.rating)}</span>
              <span style="font-size:12px;color:#6b7280;">${review.rating}.0</span>
            </div>
          </div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#374151;">${review.text}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:5px;">
            <div>${cats}</div>
            <div style="display:flex;gap:10px;align-items:center;">
              <span style="font-size:11px;color:#9ca3af;">${fmt(review.date)}</span>
              ${review.sentiment ? `<span style="font-size:11px;color:${sc};font-weight:600;">${sl}</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
      reviewsHtml = `
        <div style="margin-bottom:20px;">
          <h2 style="${H2}">Отзывы — ${filterLabel[reviewsFilter]} (${filtered.length})</h2>
          ${cards}
        </div>`;
    }
  }

  // 165mm content area (A4 210 − 30 left − 15 right) at 96 dpi ≈ 624px
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#111827;padding:0;width:624px;background:#fff;">

      <!-- Header -->
      <div style="margin-bottom:24px;border-bottom:2px solid #e5e7eb;padding-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${report.title}</h1>
          <div style="display:flex;gap:12px;align-items:center;font-size:13px;color:#6b7280;">
            ${period ? `<span>📅 ${period}</span>` : ''}
            <span style="background:#f3f4f6;padding:3px 10px;border-radius:12px;color:#374151;font-weight:500;">${platformLabel}</span>
          </div>
        </div>
        <div style="text-align:center;background:#f9fafb;border:2px solid ${ratingColor};border-radius:12px;padding:12px 18px;">
          <div style="font-size:26px;font-weight:700;color:${ratingColor};line-height:1;">${stats.averageRating.toFixed(1)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">средний рейтинг</div>
        </div>
      </div>

      <!-- Stats -->
      <div style="margin-bottom:20px;">
        <h2 style="${H2}">Общая статистика</h2>
        <div style="display:flex;gap:10px;">
          <div style="flex:1;border:1.5px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${stats.totalReviews}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Всего</div>
          </div>
          <div style="flex:1;border:1.5px solid #dcfce7;border-radius:8px;padding:12px;text-align:center;background:#f0fdf4;">
            <div style="font-size:22px;font-weight:700;color:#16a34a;">${stats.positiveReviews}</div>
            <div style="font-size:11px;color:#16a34a;margin-top:2px;">Позитивные (${pct(stats.positiveReviews)}%)</div>
          </div>
          <div style="flex:1;border:1.5px solid #f3f4f6;border-radius:8px;padding:12px;text-align:center;background:#f9fafb;">
            <div style="font-size:22px;font-weight:700;color:#6b7280;">${stats.neutralReviews}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Нейтральные (${pct(stats.neutralReviews)}%)</div>
          </div>
          <div style="flex:1;border:1.5px solid #fee2e2;border-radius:8px;padding:12px;text-align:center;background:#fef2f2;">
            <div style="font-size:22px;font-weight:700;color:#dc2626;">${stats.negativeReviews}</div>
            <div style="font-size:11px;color:#dc2626;margin-top:2px;">Негативные (${pct(stats.negativeReviews)}%)</div>
          </div>
        </div>
      </div>

      ${summaryHtml}
      ${platformStatsHtml}
      ${categoriesHtml}
      ${insightsRecsHtml}
      ${reviewsHtml}

      <!-- Footer -->
      <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
        Отчёт сгенерирован Reviews AI · ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>`;
}

export async function exportReportPdf(
  report: Report,
  summaryMode: PdfSummaryMode,
  reviewsFilter: PdfReviewsFilter,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Подготовка...');

  const bodyHtml = buildBodyHtml(report, summaryMode, reviewsFilter);

  // Page margins (mm)
  const ML = 30; // left
  const MR = 15; // right
  const MT = 20; // top
  const MB = 20; // bottom

  const CONTENT_W = 210 - ML - MR; // 165 mm
  const CONTENT_H = 297 - MT - MB; // 257 mm
  const RENDER_PX  = 624;           // 165 mm × (96 / 25.4) ≈ 624 px

  // Mount in the DOM — must be visible (not off-screen) for html2canvas to render
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    `width:${RENDER_PX}px`,
    'background:#fff',
    'z-index:-9999',
    'pointer-events:none',
    'overflow:visible',
  ].join(';');
  wrapper.innerHTML = bodyHtml;
  document.body.appendChild(wrapper);

  // Wait one frame so the browser paints the element before html2canvas grabs it
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    onProgress?.('Рендеринг...');

    const canvas = await (html2canvas as any)(wrapper, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: RENDER_PX,
      windowWidth: RENDER_PX,
    });

    onProgress?.('Сборка страниц...');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // px per mm for slicing the canvas
    const pxPerMm = canvas.width / CONTENT_W;
    // Full content height in mm
    const totalHeightMm = (canvas.height / canvas.width) * CONTENT_W;

    let remaining = totalHeightMm;
    let srcYmm = 0;

    while (remaining > 0) {
      const sliceH = Math.min(remaining, CONTENT_H);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = Math.round(sliceH * pxPerMm);
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(
        canvas,
        0, Math.round(srcYmm * pxPerMm),
        canvas.width, sliceCanvas.height,
        0, 0,
        canvas.width, sliceCanvas.height,
      );

      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', ML, MT, CONTENT_W, sliceH);

      remaining -= sliceH;
      srcYmm   += sliceH;
      if (remaining > 0) pdf.addPage();
    }

    onProgress?.('Сохранение...');
    const safeName = report.title.replace(/[<>:"/\\|?*]/g, '').trim() || 'report';
    pdf.save(`${safeName}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}

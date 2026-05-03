import type { Report, ReviewCategory } from '../types';

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

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function buildHtml(report: Report): string {
  const stats = report.stats!;
  const platformLabel =
    report.platform === 'all' ? 'Все платформы' :
    report.platform === 'yandex' ? 'Яндекс.Карты' : '2ГИС';
  const ratingColor = getRatingColor(stats.averageRating);
  const period = report.period
    ? `${formatDateShort(report.period.start)} — ${formatDate(report.period.end)}`
    : '';

  const positivePercent = stats.totalReviews
    ? Math.round((stats.positiveReviews / stats.totalReviews) * 100) : 0;
  const neutralPercent = stats.totalReviews
    ? Math.round((stats.neutralReviews / stats.totalReviews) * 100) : 0;
  const negativePercent = stats.totalReviews
    ? Math.round((stats.negativeReviews / stats.totalReviews) * 100) : 0;

  // Platform stats section (combined reports)
  let platformStatsHtml = '';
  if (report.platform === 'all' && report.sourceStats) {
    const platforms = [
      { key: 'yandex', label: 'Яндекс.Карты', data: report.sourceStats.yandex },
      { key: '2gis', label: '2ГИС', data: report.sourceStats['2gis'] },
    ].filter(p => p.data);

    if (platforms.length > 0) {
      const cards = platforms.map(p => {
        const s = p.data!;
        const c = getRatingColor(s.averageRating);
        return `
          <div style="flex:1; border:1.5px solid #e5e7eb; border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <strong style="font-size:15px;">${p.label}</strong>
              <span style="font-size:18px; font-weight:700; color:${c};">${s.averageRating.toFixed(1)} ★</span>
            </div>
            <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">${s.totalReviews} отзывов</div>
            <div style="display:flex; gap:10px; font-size:13px;">
              <span style="color:#16a34a;">+${s.positiveReviews} позит.</span>
              <span style="color:#6b7280;">=${s.neutralReviews} нейтр.</span>
              <span style="color:#dc2626;">-${s.negativeReviews} негат.</span>
            </div>
          </div>`;
      }).join('');
      platformStatsHtml = `
        <section style="margin-bottom:24px;">
          <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Статистика по платформам</h2>
          <div style="display:flex; gap:16px;">${cards}</div>
        </section>`;
    }
  }

  // Category stats
  let categoriesHtml = '';
  if (report.categoryStats && report.categoryStats.length > 0) {
    const sorted = [...report.categoryStats].sort((a, b) => b.count - a.count);
    const rows = sorted.map(cat => {
      const c = getRatingColor(cat.averageRating);
      return `
        <tr>
          <td style="padding:8px 10px; font-weight:500;">${categoryLabels[cat.category] ?? cat.category}</td>
          <td style="padding:8px 10px; text-align:center;">${cat.count}</td>
          <td style="padding:8px 10px; text-align:center; color:${c}; font-weight:600;">${cat.averageRating.toFixed(1)}</td>
          <td style="padding:8px 10px; text-align:center; color:#16a34a;">${cat.sentiment.positive}</td>
          <td style="padding:8px 10px; text-align:center; color:#6b7280;">${cat.sentiment.neutral}</td>
          <td style="padding:8px 10px; text-align:center; color:#dc2626;">${cat.sentiment.negative}</td>
        </tr>`;
    }).join('');

    categoriesHtml = `
      <section style="margin-bottom:24px; page-break-inside:avoid;">
        <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Анализ по категориям</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 10px; text-align:left; border-bottom:1.5px solid #e5e7eb;">Категория</th>
              <th style="padding:8px 10px; text-align:center; border-bottom:1.5px solid #e5e7eb;">Упоминаний</th>
              <th style="padding:8px 10px; text-align:center; border-bottom:1.5px solid #e5e7eb;">Рейтинг</th>
              <th style="padding:8px 10px; text-align:center; border-bottom:1.5px solid #e5e7eb; color:#16a34a;">Позит.</th>
              <th style="padding:8px 10px; text-align:center; border-bottom:1.5px solid #e5e7eb; color:#6b7280;">Нейтр.</th>
              <th style="padding:8px 10px; text-align:center; border-bottom:1.5px solid #e5e7eb; color:#dc2626;">Негат.</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
  }

  // Insights & recommendations
  const insightItems = report.insights.map(i => `<li style="margin-bottom:6px; padding-left:4px;">${i}</li>`).join('');
  const recItems = report.recommendations.map(r => `<li style="margin-bottom:6px; padding-left:4px;">${r}</li>`).join('');

  const insightsRecsHtml = `
    <section style="margin-bottom:24px; display:flex; gap:24px; page-break-inside:avoid;">
      <div style="flex:1;">
        <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Ключевые инсайты</h2>
        <ul style="margin:0; padding-left:18px; font-size:13px; line-height:1.7; color:#374151;">${insightItems || '<li>Нет данных</li>'}</ul>
      </div>
      <div style="flex:1;">
        <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Рекомендации</h2>
        <ul style="margin:0; padding-left:18px; font-size:13px; line-height:1.7; color:#374151;">${recItems || '<li>Нет данных</li>'}</ul>
      </div>
    </section>`;

  // Reviews
  let reviewsHtml = '';
  if (report.reviews && report.reviews.length > 0) {
    const sorted = [...report.reviews].sort((a, b) => b.date.getTime() - a.date.getTime());
    const reviewCards = sorted.map(review => {
      const sentimentColor =
        review.sentiment === 'positive' ? '#16a34a' :
        review.sentiment === 'negative' ? '#dc2626' : '#6b7280';
      const sentimentLabel =
        review.sentiment === 'positive' ? 'Позитивный' :
        review.sentiment === 'negative' ? 'Негативный' : 'Нейтральный';
      const platformLabel = review.platform === 'yandex' ? 'Яндекс' : '2ГИС';
      const catBadges = (review.categories ?? []).map(cat =>
        `<span style="font-size:11px; background:#f3f4f6; color:#374151; padding:2px 7px; border-radius:10px; margin-right:4px;">${categoryLabels[cat] ?? cat}</span>`
      ).join('');

      return `
        <div style="border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:12px; page-break-inside:avoid;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <strong style="font-size:13px;">${review.author}</strong>
              <span style="font-size:11px; background:#f3f4f6; color:#374151; padding:2px 7px; border-radius:10px; margin-left:8px;">${platformLabel}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#f59e0b; font-size:14px;">${stars(review.rating)}</span>
              <span style="font-size:12px; color:#6b7280;">${review.rating}.0</span>
            </div>
          </div>
          <p style="margin:0 0 10px; font-size:13px; line-height:1.6; color:#374151;">${review.text}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div>${catBadges}</div>
            <div style="display:flex; gap:12px; align-items:center;">
              <span style="font-size:11px; color:#9ca3af;">${formatDate(review.date)}</span>
              ${review.sentiment ? `<span style="font-size:11px; color:${sentimentColor}; font-weight:600;">${sentimentLabel}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    reviewsHtml = `
      <section style="margin-bottom:24px;">
        <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Отзывы (${sorted.length})</h2>
        ${reviewCards}
      </section>`;
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 18mm 18mm; size: A4; }
    }
    @media screen {
      body { padding: 32px; max-width: 900px; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <!-- Шапка -->
  <header style="margin-bottom:28px; border-bottom:2px solid #e5e7eb; padding-bottom:20px;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#111827;">${report.title}</h1>
        <div style="display:flex; gap:14px; align-items:center; font-size:13px; color:#6b7280;">
          ${period ? `<span>📅 ${period}</span>` : ''}
          <span style="background:#f3f4f6; padding:3px 10px; border-radius:12px; color:#374151; font-weight:500;">${platformLabel}</span>
        </div>
      </div>
      <div style="text-align:center; background:#f9fafb; border:2px solid ${ratingColor}; border-radius:12px; padding:12px 20px;">
        <div style="font-size:28px; font-weight:700; color:${ratingColor}; line-height:1;">${stats.averageRating.toFixed(1)}</div>
        <div style="font-size:13px; color:#6b7280; margin-top:2px;">средний рейтинг</div>
      </div>
    </div>
  </header>

  <!-- Статистика -->
  <section style="margin-bottom:24px;">
    <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Общая статистика</h2>
    <div style="display:flex; gap:14px;">
      <div style="flex:1; border:1.5px solid #e5e7eb; border-radius:10px; padding:14px; text-align:center;">
        <div style="font-size:24px; font-weight:700; color:#111827;">${stats.totalReviews}</div>
        <div style="font-size:12px; color:#6b7280; margin-top:2px;">Всего отзывов</div>
      </div>
      <div style="flex:1; border:1.5px solid #dcfce7; border-radius:10px; padding:14px; text-align:center; background:#f0fdf4;">
        <div style="font-size:24px; font-weight:700; color:#16a34a;">${stats.positiveReviews}</div>
        <div style="font-size:12px; color:#16a34a; margin-top:2px;">Позитивные (${positivePercent}%)</div>
      </div>
      <div style="flex:1; border:1.5px solid #f3f4f6; border-radius:10px; padding:14px; text-align:center; background:#f9fafb;">
        <div style="font-size:24px; font-weight:700; color:#6b7280;">${stats.neutralReviews}</div>
        <div style="font-size:12px; color:#6b7280; margin-top:2px;">Нейтральные (${neutralPercent}%)</div>
      </div>
      <div style="flex:1; border:1.5px solid #fee2e2; border-radius:10px; padding:14px; text-align:center; background:#fef2f2;">
        <div style="font-size:24px; font-weight:700; color:#dc2626;">${stats.negativeReviews}</div>
        <div style="font-size:12px; color:#dc2626; margin-top:2px;">Негативные (${negativePercent}%)</div>
      </div>
    </div>
  </section>

  ${report.summary ? `
  <section style="margin-bottom:24px; page-break-inside:avoid;">
    <h2 style="font-size:16px; font-weight:600; margin-bottom:14px; border-bottom:1.5px solid #e5e7eb; padding-bottom:8px;">Краткая сводка</h2>
    <p style="margin:0; font-size:13px; line-height:1.7; color:#374151;">${report.summary}</p>
  </section>` : ''}

  ${platformStatsHtml}
  ${categoriesHtml}
  ${insightsRecsHtml}
  ${reviewsHtml}

  <footer style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center;">
    Отчёт сгенерирован Reviews AI · ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
  </footer>
</body>
</html>`;
}

export function exportReportPdf(report: Report): void {
  const html = buildHtml(report);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => {
    win.focus();
    win.print();
  });
}

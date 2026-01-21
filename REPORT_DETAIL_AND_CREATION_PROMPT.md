# Детальная спецификация экрана отчёта и создания нового отчёта

## Часть 1: Экран детального просмотра отчёта (ReportDetailScreen)

### Общее описание

Экран отображает полную информацию об отчёте: сводку, статистику, анализ по категориям, инсайты, рекомендации и список отзывов. Есть переключатель между кратким и подробным режимом просмотра.

---

### Визуальная схема экрана

```
┌─────────────────────────────────────────┐
│ [←] Назад                [Экспорт PDF]  │  <- TopAppBar
├─────────────────────────────────────────┤
│                                         │
│  Анализ за декабрь 2024      ┌────────┐ │
│  📅 1 дек - 31 дек 2024      │  4.5   │ │  <- Title + Rating Badge
│  Яндекс.Карты                │   ⭐   │ │
│                              └────────┘ │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Краткая сводка     [Кратко][Подробно]│ │  <- Summary Card
│ │                                     │ │
│ │ "Анализ показывает высокий уровень  │ │
│ │ удовлетворённости клиентов..."      │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ┌────────┐┌────────┐┌────────┐┌────────┐│
│ │  156   ││  120   ││   25   ││   11   ││  <- Stats Grid (4 cards)
│ │ Всего  ││Позитив.││Нейтр.  ││Негатив.││
│ └────────┘└────────┘└────────┘└────────┘│
├─────────────────────────────────────────┤
│ ══════ Анализ по категориям ══════════ │
│ ┌───────────────┐ ┌───────────────┐     │
│ │ Качество  4.7 │ │ Сервис    4.3 │     │  <- Category Cards Grid
│ │ 45 упоминаний │ │ 38 упоминаний │     │
│ │ [████░░░░░░░] │ │ [███░░░░░░░░] │     │
│ └───────────────┘ └───────────────┘     │
│ ┌───────────────┐ ┌───────────────┐     │
│ │ Атмосфера 4.5 │ │ Цены      3.8 │     │
│ │ 32 упоминания │ │ 28 упоминаний │     │
│ │ [████░░░░░░░] │ │ [██░░░░░░░░░] │     │
│ └───────────────┘ └───────────────┘     │
├─────────────────────────────────────────┤
│ ┌─────────────────┐┌─────────────────┐  │
│ │ Ключевые инсайты││  Рекомендации   │  │  <- Two columns
│ │                 ││                 │  │
│ │ • Инсайт 1      ││ • Рекомендация 1│  │
│ │ • Инсайт 2      ││ • Рекомендация 2│  │
│ │ • Инсайт 3      ││ • Рекомендация 3│  │
│ │                 ││                 │  │
│ │ +2 ещё...       ││ +1 ещё...       │  │
│ └─────────────────┘└─────────────────┘  │
├─────────────────────────────────────────┤
│ ══════ Отзывы (5 из 156) ═════════════ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Иван П.        Яндекс    ⭐⭐⭐⭐⭐  │ │  <- Review Card
│ │                                     │ │
│ │ "Отличное место! Качество блюд      │ │
│ │ на высоте, обслуживание быстрое..." │ │
│ │                                     │ │
│ │ [Качество] [Сервис]                 │ │
│ │ ─────────────────────────────────── │ │
│ │ 15 декабря 2024        🟢 Позитивный│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ... ещё отзывы ...                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

### Секция 1: TopAppBar (Шапка)

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportDetailTopBar(
    onBackClick: () -> Unit,
    onExportClick: () -> Unit
) {
    TopAppBar(
        title = { },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Назад"
                )
            }
        },
        actions = {
            OutlinedButton(
                onClick = onExportClick,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Icon(
                    Icons.Outlined.Download,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("PDF")
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color.White
        )
    )
}
```

---

### Секция 2: Заголовок + Рейтинг Badge

**Layout:** Row с заголовком слева и рейтингом справа

**Заголовок (левая часть):**
- Название отчёта: 28sp, Bold, TextPrimary
- Мета-информация (Row):
  - Иконка Calendar (18dp) + Период дат
  - Platform badge (Яндекс / 2ГИС / Все платформы)
- Цвет текста мета: TextSecondary (#64748B)

**Рейтинг Badge (правая часть):**
- Размер: ~90dp x ~60dp
- Форма: RoundedCornerShape(16.dp)
- Фон: цвет рейтинга с alpha 0.1
- Содержимое (Row):
  - Число рейтинга (40sp, Bold)
  - Иконка Star (24dp)
- Цвет: зависит от значения рейтинга

```kotlin
@Composable
fun ReportTitleSection(report: Report) {
    val ratingColor = getRatingColor(report.stats.averageRating)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        // Left: Title and meta
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = report.title,
                style = TextStyle(
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Period
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = Color(0xFF64748B)
                    )
                    Text(
                        text = formatPeriod(report.period),
                        style = TextStyle(
                            fontSize = 15.sp,
                            color = Color(0xFF64748B)
                        )
                    )
                }

                // Platform
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFFF8FAFC)
                ) {
                    Text(
                        text = getPlatformName(report.platform),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = TextStyle(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF64748B)
                        )
                    )
                }
            }
        }

        // Right: Rating badge
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = ratingColor.copy(alpha = 0.15f)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = String.format("%.1f", report.stats.averageRating),
                    style = TextStyle(
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = ratingColor
                    )
                )
                Icon(
                    Icons.Filled.Star,
                    contentDescription = null,
                    tint = ratingColor,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

fun getPlatformName(platform: String?): String = when (platform) {
    "yandex" -> "Яндекс.Карты"
    "2gis" -> "2ГИС"
    "all" -> "Все платформы"
    else -> "Все платформы"
}
```

---

### Секция 3: Сводка (Summary Card)

**Переключатель режимов:**
- Два toggle buttons: "Кратко" и "Подробно"
- Активная кнопка: Primary цвет
- Неактивная: Outline

**Режим "Кратко":**
- Один абзац текста summary
- Размер: 16sp, line-height: 1.7
- Цвет: TextSecondary

**Режим "Подробно":**
4 секции с заголовками:
1. **Общий анализ** — report.summary
2. **Анализ тональности** — автогенерируемый текст на основе stats
3. **Ключевые категории** — топ категорий по упоминаниям
4. **Динамика и рекомендации** — оценка рейтинга + топ рекомендаций

```kotlin
@Composable
fun SummaryCard(
    report: Report,
    viewMode: ViewMode,
    onViewModeChange: (ViewMode) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Header with toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (viewMode == ViewMode.SUMMARY) "Краткая сводка" else "Подробная сводка",
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF1E293B)
                    )
                )

                ViewModeToggle(
                    viewMode = viewMode,
                    onViewModeChange = onViewModeChange
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Content
            if (viewMode == ViewMode.SUMMARY) {
                Text(
                    text = report.summary ?: "",
                    style = TextStyle(
                        fontSize = 16.sp,
                        lineHeight = 27.sp,
                        color = Color(0xFF64748B)
                    )
                )
            } else {
                DetailedSummary(report = report)
            }
        }
    }
}

@Composable
fun ViewModeToggle(
    viewMode: ViewMode,
    onViewModeChange: (ViewMode) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFF8FAFC)
    ) {
        Row(modifier = Modifier.padding(4.dp)) {
            Button(
                onClick = { onViewModeChange(ViewMode.SUMMARY) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (viewMode == ViewMode.SUMMARY)
                        Color(0xFF6366F1) else Color.Transparent,
                    contentColor = if (viewMode == ViewMode.SUMMARY)
                        Color.White else Color(0xFF64748B)
                ),
                shape = RoundedCornerShape(6.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                elevation = null
            ) {
                Text("Кратко", fontSize = 14.sp)
            }

            Button(
                onClick = { onViewModeChange(ViewMode.DETAILED) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (viewMode == ViewMode.DETAILED)
                        Color(0xFF6366F1) else Color.Transparent,
                    contentColor = if (viewMode == ViewMode.DETAILED)
                        Color.White else Color(0xFF64748B)
                ),
                shape = RoundedCornerShape(6.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                elevation = null
            ) {
                Text("Подробно", fontSize = 14.sp)
            }
        }
    }
}

enum class ViewMode { SUMMARY, DETAILED }
```

---

### Секция 4: Статистика (Stats Grid)

**Layout:** LazyVerticalGrid или Row с 4 карточками

| Карточка | Метка | Цвет значения |
|----------|-------|---------------|
| 1 | Всего отзывов | TextPrimary (#1E293B) |
| 2 | Позитивные | Success (#10B981) |
| 3 | Нейтральные | Warning (#F59E0B) |
| 4 | Негативные | Error (#EF4444) |

**Стиль карточки:**
- Фон: White
- Padding: 16dp
- Метка: 14sp, TextSecondary
- Значение: 32sp, Bold, цветное

```kotlin
@Composable
fun StatsGrid(stats: ReportStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            label = "Всего отзывов",
            value = stats.totalReviews.toString(),
            valueColor = Color(0xFF1E293B),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            label = "Позитивные",
            value = stats.positiveReviews.toString(),
            valueColor = Color(0xFF10B981),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            label = "Нейтральные",
            value = stats.neutralReviews.toString(),
            valueColor = Color(0xFFF59E0B),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            label = "Негативные",
            value = stats.negativeReviews.toString(),
            valueColor = Color(0xFFEF4444),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun StatCard(
    label: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 14.sp,
                    color = Color(0xFF64748B)
                )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = TextStyle(
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = valueColor
                )
            )
        }
    }
}
```

**Адаптивность для мобильных:**
На узких экранах (< 400dp) показывать 2x2 grid вместо 4 в ряд.

---

### Секция 5: Анализ по категориям

**Заголовок секции:** "Анализ по категориям" с иконкой BarChart

**Grid:** 2 колонки, авто-заполнение

**Категории и их цвета:**
```kotlin
val categoryLabels = mapOf(
    "quality" to "Качество",
    "service" to "Обслуживание",
    "cleanliness" to "Чистота",
    "atmosphere" to "Атмосфера",
    "price" to "Цены"
)

val categoryColors = mapOf(
    "quality" to Color(0xFF6366F1),     // Индиго
    "service" to Color(0xFF8B5CF6),     // Фиолетовый
    "cleanliness" to Color(0xFF10B981), // Зелёный
    "atmosphere" to Color(0xFFF59E0B),  // Оранжевый
    "price" to Color(0xFFEF4444)        // Красный
)
```

**Карточка категории:**

```
┌─────────────────────────────┐
│ ┌──────────┐           4.7  │  <- Header: badge + rating
│ │ Качество │                │
│ └──────────┘                │
│ 45 упоминаний               │  <- Count
│ [██████████░░░░░░░░░░]      │  <- Sentiment bar
└─────────────────────────────┘
```

```kotlin
@Composable
fun CategoryCard(categoryStats: CategoryStats) {
    val color = categoryColors[categoryStats.category] ?: Color(0xFF6366F1)
    val label = categoryLabels[categoryStats.category] ?: categoryStats.category

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Category badge
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.15f)
            ) {
                Text(
                    text = label,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = color
                    )
                )
            }

            // Rating
            Text(
                text = String.format("%.1f", categoryStats.averageRating),
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = getRatingColor(categoryStats.averageRating)
                )
            )
        }

        // Count
        Text(
            text = "${categoryStats.count} упоминаний",
            style = TextStyle(
                fontSize = 14.sp,
                color = Color(0xFF64748B)
            )
        )

        // Sentiment bar
        SentimentBar(
            positive = categoryStats.sentiment.positive,
            neutral = categoryStats.sentiment.neutral,
            negative = categoryStats.sentiment.negative,
            total = categoryStats.count
        )
    }
}

@Composable
fun SentimentBar(
    positive: Int,
    neutral: Int,
    negative: Int,
    total: Int
) {
    val positivePercent = if (total > 0) positive.toFloat() / total else 0f
    val neutralPercent = if (total > 0) neutral.toFloat() / total else 0f
    val negativePercent = if (total > 0) negative.toFloat() / total else 0f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(8.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(Color(0xFFF8FAFC))
    ) {
        // Positive segment
        if (positivePercent > 0) {
            Box(
                modifier = Modifier
                    .weight(positivePercent)
                    .fillMaxHeight()
                    .background(Color(0xFF10B981))
            )
        }
        // Neutral segment
        if (neutralPercent > 0) {
            Box(
                modifier = Modifier
                    .weight(neutralPercent)
                    .fillMaxHeight()
                    .background(Color(0xFFF59E0B))
            )
        }
        // Negative segment
        if (negativePercent > 0) {
            Box(
                modifier = Modifier
                    .weight(negativePercent)
                    .fillMaxHeight()
                    .background(Color(0xFFEF4444))
            )
        }
    }
}
```

---

### Секция 6: Инсайты и Рекомендации

**Layout:** 2 карточки рядом (на мобильном — вертикально)

**Карточка инсайтов:**
- Заголовок: "Ключевые инсайты"
- Список элементов
- Стиль элемента:
  - Фон: rgba(59, 130, 246, 0.05) — голубой
  - Border-left: 3dp solid #3B82F6 (Info)
  - Padding: 12dp слева 20dp
  - Border radius: 8dp

**Карточка рекомендаций:**
- Заголовок: "Рекомендации"
- Стиль элемента:
  - Фон: rgba(16, 185, 129, 0.05) — зелёный
  - Border-left: 3dp solid #10B981 (Success)

```kotlin
@Composable
fun InsightItem(text: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF3B82F6).copy(alpha = 0.05f)
    ) {
        Box(
            modifier = Modifier
                .drawBehind {
                    drawRect(
                        color = Color(0xFF3B82F6),
                        topLeft = Offset(0f, 0f),
                        size = Size(3.dp.toPx(), size.height)
                    )
                }
        ) {
            Text(
                text = text,
                modifier = Modifier.padding(
                    start = 20.dp,
                    end = 12.dp,
                    top = 12.dp,
                    bottom = 12.dp
                ),
                style = TextStyle(
                    fontSize = 15.sp,
                    lineHeight = 24.sp,
                    color = Color(0xFF1E293B)
                )
            )
        }
    }
}

@Composable
fun RecommendationItem(text: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF10B981).copy(alpha = 0.05f)
    ) {
        Box(
            modifier = Modifier
                .drawBehind {
                    drawRect(
                        color = Color(0xFF10B981),
                        topLeft = Offset(0f, 0f),
                        size = Size(3.dp.toPx(), size.height)
                    )
                }
        ) {
            Text(
                text = text,
                modifier = Modifier.padding(
                    start = 20.dp,
                    end = 12.dp,
                    top = 12.dp,
                    bottom = 12.dp
                ),
                style = TextStyle(
                    fontSize = 15.sp,
                    lineHeight = 24.sp,
                    color = Color(0xFF1E293B)
                )
            )
        }
    }
}
```

**Подсказка "+N ещё":**
В режиме "Кратко" показываем 3 элемента, если больше — показываем hint:

```kotlin
if (items.size > 3 && viewMode == ViewMode.SUMMARY) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF6366F1).copy(alpha = 0.05f)
    ) {
        Text(
            text = "+${items.size - 3} дополнительных в расширенной версии",
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            style = TextStyle(
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF6366F1),
                textAlign = TextAlign.Center
            )
        )
    }
}
```

---

### Секция 7: Список отзывов

**Заголовок:** "Отзывы (5 из 156)" — в режиме Кратко показываем 5

**Карточка отзыва:**

```
┌───────────────────────────────────────────┐
│ Иван П.        [Яндекс]    ⭐⭐⭐⭐⭐  4.0 │  <- Header
│                                           │
│ "Отличное место для семейного отдыха.     │
│ Еда вкусная, персонал приветливый,        │  <- Text
│ атмосфера уютная..."                      │
│                                           │
│ [Качество] [Сервис] [Атмосфера]           │  <- Category badges
│ ───────────────────────────────────────── │
│ 15 декабря 2024              🟢 Позитивный│  <- Footer
└───────────────────────────────────────────┘
```

```kotlin
@Composable
fun ReviewDetailCard(review: Review) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8FAFC)
        ),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Author + Platform
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = review.author,
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF1E293B)
                        )
                    )
                    PlatformBadge(platform = review.source)
                }

                // Rating
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    RatingStars(rating = review.rating)
                    Text(
                        text = "${review.rating}.0",
                        style = TextStyle(
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF64748B)
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Review text
            Text(
                text = review.text,
                style = TextStyle(
                    fontSize = 15.sp,
                    lineHeight = 24.sp,
                    color = Color(0xFF1E293B)
                )
            )

            // Category badges (if present)
            if (review.categories.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    review.categories.forEach { category ->
                        CategoryBadge(category = category)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Divider
            Divider(color = Color(0xFFE2E8F0))

            Spacer(modifier = Modifier.height(12.dp))

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatDate(review.date),
                    style = TextStyle(
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )
                )
                SentimentBadge(sentiment = review.sentiment)
            }
        }
    }
}

@Composable
fun CategoryBadge(category: String) {
    val color = categoryColors[category] ?: Color(0xFF6366F1)
    val label = categoryLabels[category] ?: category

    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.15f)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = TextStyle(
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = color
            )
        )
    }
}
```

---

## Часть 2: Создание нового отчёта (CreateReportScreen / Modal)

### Визуальная схема модального окна

```
┌─────────────────────────────────────────┐
│                                    [✕]  │
│         Создать новый отчёт             │
│                                         │
│  Название отчёта                        │
│  ┌─────────────────────────────────────┐│
│  │ Анализ за январь 2025              ││
│  └─────────────────────────────────────┘│
│                                         │
│  URL Яндекс.Карт                        │
│  ┌─────────────────────────────────────┐│
│  │ https://yandex.ru/maps/org/...     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Период анализа                         │
│  ┌───────────────┐    ┌───────────────┐│
│  │ 01.01.2025    │ —  │ 31.01.2025    ││
│  └───────────────┘    └───────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │            Отмена                   ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │         Создать отчёт               ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### API для создания отчёта

**Endpoint:** `POST /api/reports`

**Request Body:**
```kotlin
data class CreateReportRequest(
    val title: String,
    val yandexUrl: String,
    val periodStart: String,  // ISO date: "2025-01-01T00:00:00.000Z"
    val periodEnd: String     // ISO date: "2025-01-31T23:59:59.999Z"
)
```

**Response:** Созданный Report объект

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

### Полный код CreateReportSheet (Bottom Sheet)

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateReportBottomSheet(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: CreateReportViewModel = koinViewModel()
) {
    val state by viewModel.state.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .navigationBarsPadding()
        ) {
            // Header
            Text(
                text = "Создать новый отчёт",
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                ),
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Error message
            if (state.error != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFEF4444).copy(alpha = 0.1f)
                ) {
                    Text(
                        text = state.error!!,
                        modifier = Modifier.padding(12.dp),
                        style = TextStyle(
                            fontSize = 14.sp,
                            color = Color(0xFFEF4444)
                        )
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Title field
            OutlinedTextField(
                value = state.title,
                onValueChange = { viewModel.updateTitle(it) },
                label = { Text("Название отчёта") },
                placeholder = { Text("Например: Анализ за январь 2025") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF6366F1),
                    focusedLabelColor = Color(0xFF6366F1)
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // URL field
            OutlinedTextField(
                value = state.yandexUrl,
                onValueChange = { viewModel.updateUrl(it) },
                label = { Text("URL Яндекс.Карт") },
                placeholder = { Text("https://yandex.ru/maps/org/...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF6366F1),
                    focusedLabelColor = Color(0xFF6366F1)
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Period
            Text(
                text = "Период анализа",
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1E293B)
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                DatePickerField(
                    value = state.startDate,
                    onValueChange = { viewModel.updateStartDate(it) },
                    label = "Начало",
                    modifier = Modifier.weight(1f)
                )

                Text(
                    text = "—",
                    style = TextStyle(
                        fontSize = 20.sp,
                        color = Color(0xFF64748B)
                    )
                )

                DatePickerField(
                    value = state.endDate,
                    onValueChange = { viewModel.updateEndDate(it) },
                    label = "Конец",
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Buttons
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color(0xFF64748B)
                ),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Text(
                    text = "Отмена",
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    viewModel.createReport(
                        onSuccess = {
                            onSuccess()
                            onDismiss()
                        }
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isLoading && state.isValid,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF6366F1)
                )
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Создание...")
                } else {
                    Text(
                        text = "Создать отчёт",
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    }
}
```

---

### ViewModel для создания отчёта

```kotlin
data class CreateReportState(
    val title: String = "",
    val yandexUrl: String = "",
    val startDate: LocalDate = LocalDate.now().minusMonths(1),
    val endDate: LocalDate = LocalDate.now(),
    val isLoading: Boolean = false,
    val error: String? = null
) {
    val isValid: Boolean
        get() = title.isNotBlank() &&
                yandexUrl.isNotBlank() &&
                yandexUrl.contains("yandex") &&
                startDate <= endDate
}

class CreateReportViewModel(
    private val reportRepository: ReportRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CreateReportState())
    val state: StateFlow<CreateReportState> = _state.asStateFlow()

    fun updateTitle(title: String) {
        _state.update { it.copy(title = title, error = null) }
    }

    fun updateUrl(url: String) {
        _state.update { it.copy(yandexUrl = url, error = null) }
    }

    fun updateStartDate(date: LocalDate) {
        _state.update { it.copy(startDate = date, error = null) }
    }

    fun updateEndDate(date: LocalDate) {
        _state.update { it.copy(endDate = date, error = null) }
    }

    fun createReport(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                val request = CreateReportRequest(
                    title = _state.value.title,
                    yandexUrl = _state.value.yandexUrl,
                    periodStart = _state.value.startDate
                        .atStartOfDay()
                        .toInstant(ZoneOffset.UTC)
                        .toString(),
                    periodEnd = _state.value.endDate
                        .atTime(23, 59, 59)
                        .toInstant(ZoneOffset.UTC)
                        .toString()
                )

                reportRepository.createReport(request)
                onSuccess()

            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Ошибка создания отчёта"
                    )
                }
            }
        }
    }
}
```

---

### DatePickerField компонент

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatePickerField(
    value: LocalDate,
    onValueChange: (LocalDate) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    var showPicker by remember { mutableStateOf(false) }
    val dateFormatter = remember { DateTimeFormatter.ofPattern("dd.MM.yyyy") }

    OutlinedTextField(
        value = value.format(dateFormatter),
        onValueChange = { },
        label = { Text(label) },
        modifier = modifier,
        readOnly = true,
        trailingIcon = {
            IconButton(onClick = { showPicker = true }) {
                Icon(
                    Icons.Outlined.CalendarToday,
                    contentDescription = "Выбрать дату"
                )
            }
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color(0xFF6366F1),
            focusedLabelColor = Color(0xFF6366F1)
        ),
        shape = RoundedCornerShape(12.dp)
    )

    if (showPicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = value
                .atStartOfDay()
                .toInstant(ZoneOffset.UTC)
                .toEpochMilli()
        )

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val newDate = Instant.ofEpochMilli(millis)
                                .atZone(ZoneOffset.UTC)
                                .toLocalDate()
                            onValueChange(newDate)
                        }
                        showPicker = false
                    }
                ) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text("Отмена")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}
```

---

### API Service для создания отчёта

```kotlin
interface ApiService {
    // ... existing endpoints ...

    @POST("api/reports")
    suspend fun createReport(
        @Body request: CreateReportRequest
    ): Response<Report>
}

// Repository
class ReportRepositoryImpl(
    private val apiService: ApiService
) : ReportRepository {

    override suspend fun createReport(request: CreateReportRequest): Report {
        val response = apiService.createReport(request)
        if (response.isSuccessful) {
            return response.body() ?: throw Exception("Empty response")
        } else {
            val errorBody = response.errorBody()?.string()
            throw Exception(errorBody ?: "Failed to create report")
        }
    }
}
```

---

## Часть 3: Интеграция с экраном списка отчётов

### FAB для создания отчёта

```kotlin
@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel = koinViewModel(),
    onReportClick: (String) -> Unit
) {
    val state by viewModel.state.collectAsState()
    var showCreateSheet by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateSheet = true },
                containerColor = Color(0xFF6366F1)
            ) {
                Icon(
                    Icons.Default.Add,
                    contentDescription = "Создать отчёт",
                    tint = Color.White
                )
            }
        }
    ) { paddingValues ->
        // Reports list content...

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ... reports list ...
        }
    }

    // Create report bottom sheet
    if (showCreateSheet) {
        CreateReportBottomSheet(
            onDismiss = { showCreateSheet = false },
            onSuccess = {
                viewModel.loadReports() // Refresh list
            }
        )
    }
}
```

---

## Модели данных (полные)

```kotlin
// Report.kt
data class Report(
    val id: String,
    val userId: String,
    val title: String,
    val period: Period,
    val platform: String? = "all",
    val status: String? = "ready",
    val stats: ReportStats,
    val summary: String? = null,
    val insights: List<String>,
    val recommendations: List<String>,
    val categoryStats: List<CategoryStats>? = null,
    val reviews: List<Review>? = null,
    val createdAt: String,
    val updatedAt: String
)

data class Period(
    val start: String,
    val end: String
)

data class ReportStats(
    val totalReviews: Int,
    val averageRating: Double,
    val positiveReviews: Int,
    val neutralReviews: Int,
    val negativeReviews: Int,
    val ratingDistribution: Map<String, Int>? = null
)

data class CategoryStats(
    val category: String,
    val count: Int,
    val averageRating: Double,
    val sentiment: SentimentStats
)

data class SentimentStats(
    val positive: Int,
    val neutral: Int,
    val negative: Int
)

data class Review(
    val id: String,
    val reportId: String,
    val author: String,
    val rating: Int,
    val text: String,
    val date: String,
    val source: String,
    val categories: List<String>,
    val sentiment: String
)

// Request
data class CreateReportRequest(
    val title: String,
    val yandexUrl: String,
    val periodStart: String,
    val periodEnd: String
)
```

---

## Чеклист реализации

### Экран деталей отчёта:
- [ ] TopAppBar с кнопкой назад и экспорта
- [ ] Секция заголовка с рейтингом
- [ ] Summary Card с toggle Кратко/Подробно
- [ ] Stats Grid (4 карточки)
- [ ] Анализ по категориям (если есть categoryStats)
- [ ] Карточки инсайтов и рекомендаций
- [ ] Список отзывов с ограничением в режиме Кратко
- [ ] Полноэкранный просмотр в режиме Подробно

### Создание отчёта:
- [ ] Bottom Sheet / Modal
- [ ] Поле названия
- [ ] Поле URL
- [ ] Date Pickers для периода
- [ ] Валидация полей
- [ ] API вызов создания
- [ ] Loading состояние
- [ ] Error handling
- [ ] Refresh списка после создания

### Общее:
- [ ] Адаптивные layouts для разных размеров экрана
- [ ] Pull-to-refresh на экране деталей
- [ ] Loading skeleton при загрузке
- [ ] Empty state если нет данных

# Детальная спецификация карточки отчёта для мобильного приложения

## Общее описание

Карточка отчёта (ReportCard) — это основной компонент для отображения информации об отчёте в списке отчётов. Она должна быть информативной, кликабельной и визуально привлекательной.

---

## Визуальная схема карточки

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌────────┐   НАЗВАНИЕ ОТЧЁТА                      ┌─────────────┐ │
│  │        │   ┌────────┐                           │             │ │
│  │  4.5   │   │ ГОТОВ  │                           │   Открыть   │ │
│  │   ⭐   │   └────────┘                           │             │ │
│  │        │                                        └─────────────┘ │
│  │        │   📅 1 дек - 31 дек 2024 • Яндекс      ┌─────────────┐ │
│  └────────┘                                        │  🗑️ Удалить │ │
│             ─────────────────────────────────────  └─────────────┘ │
│             Отзывов: 156  🟢120  🟡25  🔴11                         │
│             ─────────────────────────────────────                  │
│             "Клиенты отмечают высокое качество                     │
│             обслуживания и приятную атмосферу..."                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Структура карточки (3 колонки)

### Колонка 1: Рейтинг (левая часть)

**Круг с рейтингом:**
- Размер: 90dp x 90dp (в веб: 90px)
- Форма: идеальный круг (CircleShape)
- Фон: полупрозрачный цвет в зависимости от рейтинга (alpha = 0.1)

**Содержимое круга (вертикально по центру):**
1. Числовое значение рейтинга (например "4.5")
   - Размер шрифта: 28sp
   - Вес: Bold (700)
   - Цвет: зависит от рейтинга

2. Иконка звезды
   - Размер: 18dp
   - Цвет: тот же что и текст рейтинга
   - Иконка: `Icons.Filled.Star`

**Цвета в зависимости от рейтинга:**
```kotlin
fun getRatingColor(rating: Double): Color {
    return when {
        rating >= 4.5 -> Color(0xFF10B981)  // Зелёный (Success)
        rating >= 4.0 -> Color(0xFF3B82F6)  // Синий (Info)
        rating >= 3.5 -> Color(0xFFF59E0B)  // Оранжевый (Warning)
        rating >= 3.0 -> Color(0xFFFB923C)  // Светло-оранжевый
        else -> Color(0xFFEF4444)           // Красный (Error)
    }
}
```

---

### Колонка 2: Основная информация (центральная часть)

**Занимает всё оставшееся пространство (weight = 1f)**

#### Секция 1: Заголовок + Статус

**Название отчёта:**
- Размер: 18sp
- Вес: SemiBold (600)
- Цвет: TextPrimary (#1E293B)
- Максимум строк: 2
- Overflow: Ellipsis

**Бейдж статуса (рядом с названием):**

| Статус | Текст | Цвет фона | Цвет текста |
|--------|-------|-----------|-------------|
| ready | ГОТОВ | rgba(16, 185, 129, 0.1) | #10B981 |
| generating | ГЕНЕРИРУЕТСЯ | rgba(245, 158, 11, 0.1) | #F59E0B |
| error | ОШИБКА | rgba(239, 68, 68, 0.1) | #EF4444 |

**Стиль бейджа:**
- Padding: 4dp horizontal, 2dp vertical
- BorderRadius: 4dp
- Размер шрифта: 10sp
- Вес: SemiBold (600)
- Текст: UPPERCASE
- Letter spacing: 0.5sp

```kotlin
@Composable
fun StatusBadge(status: String) {
    val (text, color) = when (status) {
        "ready" -> "ГОТОВ" to Color(0xFF10B981)
        "generating" -> "ГЕНЕРИРУЕТСЯ" to Color(0xFFF59E0B)
        "error" -> "ОШИБКА" to Color(0xFFEF4444)
        else -> status.uppercase() to Color(0xFF64748B)
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            style = TextStyle(
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                color = color,
                letterSpacing = 0.5.sp
            )
        )
    }
}
```

---

#### Секция 2: Мета-информация

**Расположение:** горизонтальная строка с иконкой

**Содержимое:**
1. Иконка календаря (CalendarToday)
   - Размер: 14dp
   - Цвет: TextSecondary (#64748B)

2. Период дат
   - Формат: "1 дек - 31 дек 2024"
   - Размер: 14sp
   - Цвет: TextSecondary

3. Разделитель "•"
   - Цвет: TextDisabled (#94A3B8)

4. Платформа
   - Текст: "Все платформы" / "Яндекс" / "2ГИС"
   - Размер: 14sp
   - Вес: Medium (500)
   - Цвет: TextSecondary

```kotlin
@Composable
fun ReportMetaRow(period: Period, platform: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            Icons.Outlined.CalendarToday,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = Color(0xFF64748B)
        )
        Text(
            text = formatPeriod(period),
            style = TextStyle(fontSize = 14.sp, color = Color(0xFF64748B))
        )
        Text(
            text = "•",
            style = TextStyle(fontSize = 14.sp, color = Color(0xFF94A3B8))
        )
        Text(
            text = when (platform) {
                "all" -> "Все платформы"
                "yandex" -> "Яндекс"
                "2gis" -> "2ГИС"
                else -> platform
            },
            style = TextStyle(
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF64748B)
            )
        )
    }
}

// Форматирование периода
fun formatPeriod(period: Period): String {
    val formatter = DateTimeFormatter.ofPattern("d MMM", Locale("ru"))
    val formatterWithYear = DateTimeFormatter.ofPattern("d MMM yyyy", Locale("ru"))

    val start = LocalDate.parse(period.start.take(10))
    val end = LocalDate.parse(period.end.take(10))

    return "${start.format(formatter)} - ${end.format(formatterWithYear)}"
}
```

---

#### Секция 3: Статистика отзывов

**Расположение:** горизонтальная строка с wrap

**Элементы (4 штуки):**

| Метка | Значение | Цвет значения |
|-------|----------|---------------|
| Отзывов: | 156 | TextPrimary (#1E293B) |
| Позитивные: | 120 | Success (#10B981) |
| Нейтральные: | 25 | Warning (#F59E0B) |
| Негативные: | 11 | Error (#EF4444) |

**Стиль:**
- Метка: 14sp, цвет TextSecondary
- Значение: 16sp, SemiBold, цветное

```kotlin
@Composable
fun StatsRow(stats: ReportStats) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.horizontalScroll(rememberScrollState())
    ) {
        StatItem("Отзывов:", stats.totalReviews.toString(), Color(0xFF1E293B))
        StatItem("Позитивные:", stats.positiveReviews.toString(), Color(0xFF10B981))
        StatItem("Нейтральные:", stats.neutralReviews.toString(), Color(0xFFF59E0B))
        StatItem("Негативные:", stats.negativeReviews.toString(), Color(0xFFEF4444))
    }
}

@Composable
fun StatItem(label: String, value: String, valueColor: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = label,
            style = TextStyle(fontSize = 14.sp, color = Color(0xFF64748B))
        )
        Text(
            text = value,
            style = TextStyle(
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = valueColor
            )
        )
    }
}
```

---

#### Секция 4: Превью инсайта

**Описание:** Первый инсайт из списка инсайтов отчёта

**Стиль:**
- Размер: 14sp
- Цвет: TextSecondary (#64748B)
- Line height: 1.5
- Максимум строк: 2
- Overflow: Ellipsis
- Text overflow: показать "..." в конце

```kotlin
@Composable
fun InsightPreview(insights: List<String>) {
    if (insights.isNotEmpty()) {
        Text(
            text = insights.first(),
            style = TextStyle(
                fontSize = 14.sp,
                color = Color(0xFF64748B),
                lineHeight = 21.sp  // 14sp * 1.5
            ),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
```

---

### Колонка 3: Действия (правая часть)

**Расположение:** вертикально по центру

**Кнопка "Открыть":**
- Тип: Filled Button
- Цвет фона: Primary (#6366F1)
- Цвет текста: White
- Размер: Small (высота ~36dp)
- Padding: 12dp horizontal, 8dp vertical
- BorderRadius: 8dp

**Кнопка "Удалить":**
- Тип: Outlined Button
- Цвет границы: Error (#EF4444)
- Цвет текста/иконки: Error (#EF4444)
- Иконка: Delete (Trash)
- Размер: Small
- При удалении: показать текст "Удаление..." и disabled состояние

```kotlin
@Composable
fun ActionButtons(
    onOpenClick: () -> Unit,
    onDeleteClick: () -> Unit,
    isDeleting: Boolean
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Button(
            onClick = onOpenClick,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF6366F1)
            ),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text("Открыть")
        }

        OutlinedButton(
            onClick = onDeleteClick,
            enabled = !isDeleting,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color(0xFFEF4444)
            ),
            border = BorderStroke(1.dp, Color(0xFFEF4444)),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
        ) {
            if (isDeleting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    color = Color(0xFFEF4444),
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Удаление...")
            } else {
                Icon(
                    Icons.Outlined.Delete,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
```

---

## Полный код компонента ReportCard

```kotlin
@Composable
fun ReportCard(
    report: Report,
    onOpenClick: () -> Unit,
    onDeleteClick: () -> Unit,
    isDeleting: Boolean = false,
    modifier: Modifier = Modifier
) {
    val ratingColor = getRatingColor(report.stats.averageRating)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp,
            pressedElevation = 4.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            // ═══════════════════════════════════════
            // КОЛОНКА 1: Рейтинг
            // ═══════════════════════════════════════
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .background(
                        color = ratingColor.copy(alpha = 0.1f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = String.format("%.1f", report.stats.averageRating),
                        style = TextStyle(
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = ratingColor
                        )
                    )
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = ratingColor,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // ═══════════════════════════════════════
            // КОЛОНКА 2: Основная информация
            // ═══════════════════════════════════════
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Заголовок + Статус
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = report.title,
                        style = TextStyle(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF1E293B)
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    StatusBadge(status = report.status ?: "ready")
                }

                // Мета-информация (дата + платформа)
                ReportMetaRow(
                    period = report.period,
                    platform = report.platform ?: "all"
                )

                // Статистика отзывов
                StatsRow(stats = report.stats)

                // Превью инсайта
                InsightPreview(insights = report.insights)
            }

            // ═══════════════════════════════════════
            // КОЛОНКА 3: Действия
            // ═══════════════════════════════════════
            ActionButtons(
                onOpenClick = onOpenClick,
                onDeleteClick = onDeleteClick,
                isDeleting = isDeleting
            )
        }
    }
}
```

---

## Адаптивность для мобильных экранов

### Для экранов < 600dp (компактные телефоны)

Карточка меняет layout на вертикальный:

```
┌─────────────────────────────────┐
│                                 │
│         ┌────────┐              │
│         │  4.5   │              │
│         │   ⭐   │              │
│         └────────┘              │
│                                 │
│     НАЗВАНИЕ ОТЧЁТА             │
│     ┌────────┐                  │
│     │ ГОТОВ  │                  │
│     └────────┘                  │
│                                 │
│     📅 1 дек - 31 дек 2024      │
│     Яндекс                      │
│                                 │
│     Отзывов: 156                │
│     🟢 120  🟡 25  🔴 11         │
│                                 │
│     "Клиенты отмечают..."       │
│                                 │
│  ┌───────────┐ ┌───────────┐   │
│  │  Открыть  │ │ 🗑️ Удалить│   │
│  └───────────┘ └───────────┘   │
│                                 │
└─────────────────────────────────┘
```

```kotlin
@Composable
fun ReportCard(/* ... */) {
    val configuration = LocalConfiguration.current
    val isCompact = configuration.screenWidthDp < 600

    Card(/* ... */) {
        if (isCompact) {
            // Вертикальный layout для маленьких экранов
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Рейтинг сверху по центру
                RatingCircle(rating = report.stats.averageRating)

                // Информация
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Название + статус (вертикально)
                    Text(
                        text = report.title,
                        style = /* ... */,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        StatusBadge(status = report.status ?: "ready")
                    }

                    // Мета и статы
                    CompactMetaRow(period = report.period, platform = report.platform)
                    CompactStatsGrid(stats = report.stats)
                    InsightPreview(insights = report.insights)
                }

                // Кнопки горизонтально внизу
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onOpenClick,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Открыть")
                    }
                    OutlinedButton(
                        onClick = onDeleteClick,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Outlined.Delete, null)
                        Spacer(Modifier.width(4.dp))
                        Text("Удалить")
                    }
                }
            }
        } else {
            // Горизонтальный layout для больших экранов
            Row(/* стандартный layout */) {
                // ...
            }
        }
    }
}
```

---

## Состояния карточки

### 1. Обычное состояние
- Белый фон
- Elevation: 2dp
- Все элементы активны

### 2. При нажатии (Pressed)
- Elevation увеличивается до 4dp
- Небольшое затемнение фона (ripple effect)

### 3. Статус "Генерируется"
- Бейдж статуса оранжевый
- Можно добавить пульсирующую анимацию на бейдж
- Кнопка "Открыть" может быть disabled или показывать частичную информацию

### 4. Статус "Ошибка"
- Бейдж статуса красный
- Возможно добавить иконку предупреждения

### 5. При удалении
- Кнопка "Удалить" показывает индикатор загрузки
- Текст меняется на "Удаление..."
- Вся карточка может иметь пониженную opacity (0.7)

```kotlin
@Composable
fun ReportCard(
    report: Report,
    isDeleting: Boolean,
    /* ... */
) {
    Card(
        modifier = modifier
            .alpha(if (isDeleting) 0.7f else 1f)
            /* ... */
    ) {
        // ...
    }
}
```

---

## Анимации

### 1. Появление карточки в списке

```kotlin
@Composable
fun AnimatedReportCard(
    report: Report,
    index: Int,
    /* ... */
) {
    val animatedAlpha = remember { Animatable(0f) }
    val animatedOffset = remember { Animatable(20f) }

    LaunchedEffect(Unit) {
        delay(index * 50L) // Staggered animation
        launch { animatedAlpha.animateTo(1f, tween(300)) }
        launch { animatedOffset.animateTo(0f, tween(300)) }
    }

    ReportCard(
        report = report,
        modifier = Modifier
            .alpha(animatedAlpha.value)
            .offset(y = animatedOffset.value.dp)
        /* ... */
    )
}
```

### 2. Удаление карточки

```kotlin
@Composable
fun SwipeToDeleteReportCard(
    report: Report,
    onDelete: () -> Unit,
    /* ... */
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { dismissValue ->
            if (dismissValue == SwipeToDismissBoxValue.EndToStart) {
                onDelete()
                true
            } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFEF4444))
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Удалить",
                    tint = Color.White
                )
            }
        }
    ) {
        ReportCard(report = report, /* ... */)
    }
}
```

---

## Использование в списке

```kotlin
@Composable
fun ReportsListScreen(
    viewModel: ReportsViewModel = koinViewModel()
) {
    val state by viewModel.state.collectAsState()

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Группировка по месяцам
        state.groupedReports.forEach { (month, reports) ->
            item {
                Text(
                    text = month,
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF1E293B)
                    ),
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            itemsIndexed(reports) { index, report ->
                AnimatedReportCard(
                    report = report,
                    index = index,
                    onOpenClick = { viewModel.openReport(report.id) },
                    onDeleteClick = { viewModel.deleteReport(report.id) },
                    isDeleting = state.deletingId == report.id
                )
            }
        }
    }
}
```

---

## Модель данных для карточки

```kotlin
data class Report(
    val id: String,
    val title: String,
    val period: Period,
    val platform: String?,           // "all" | "yandex" | "2gis"
    val status: String?,             // "ready" | "generating" | "error"
    val stats: ReportStats,
    val insights: List<String>,
    val createdAt: String
)

data class Period(
    val start: String,              // ISO date string
    val end: String
)

data class ReportStats(
    val totalReviews: Int,
    val averageRating: Double,
    val positiveReviews: Int,
    val neutralReviews: Int,
    val negativeReviews: Int
)
```

---

## Чеклист для реализации

- [ ] Создать компонент `RatingCircle` с цветовой логикой
- [ ] Создать компонент `StatusBadge` с 3 вариантами
- [ ] Создать компонент `ReportMetaRow` с форматированием даты
- [ ] Создать компонент `StatsRow` с цветными значениями
- [ ] Создать компонент `InsightPreview` с ellipsis
- [ ] Создать компонент `ActionButtons` с состоянием удаления
- [ ] Собрать всё в `ReportCard`
- [ ] Добавить адаптивный layout для маленьких экранов
- [ ] Добавить анимации появления
- [ ] (Опционально) Добавить swipe-to-delete

---

## Примечания

1. **Кликабельность:** Вся карточка кликабельна и ведёт на детальный экран отчёта
2. **Кнопки:** Кнопки "Открыть" и "Удалить" имеют `stopPropagation` чтобы не срабатывал общий клик карточки
3. **Accessibility:** Добавить contentDescription для иконок и семантику для screen readers
4. **Performance:** Использовать `remember` для вычислений цветов и форматирования дат
5. **Локализация:** Форматирование дат должно учитывать русскую локаль

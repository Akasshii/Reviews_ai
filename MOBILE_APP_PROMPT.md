# Промпт для создания мобильного приложения Reviews AI на Kotlin

## 📱 Общее описание проекта

Создай мобильное Android приложение на **Kotlin** с использованием **Jetpack Compose** для проекта "Reviews AI" — системы автоматического анализа отзывов с Яндекс.Карт и 2ГИС.

Приложение должно повторять функционал и визуальный стиль веб-версии, адаптированный под мобильные устройства.

---

## 🔗 Backend API

**Base URL:** `https://reviews-ai-backend.onrender.com`

### Endpoints:

| Метод | URL | Описание | Auth |
|-------|-----|----------|------|
| POST | `/api/auth/login` | Авторизация | ❌ |
| POST | `/api/auth/register` | Регистрация | ❌ |
| GET | `/api/user/profile` | Получить профиль | ✅ Bearer Token |
| PUT | `/api/user/profile` | Обновить профиль | ✅ Bearer Token |
| GET | `/api/reports` | Список отчётов | ✅ Bearer Token |
| GET | `/api/reports/:id` | Детали отчёта | ✅ Bearer Token |
| GET | `/api/health` | Проверка статуса | ❌ |

### Авторизация:
- Тип: Bearer Token
- Заголовок: `Authorization: Bearer {token}`
- Токен сохранять в SharedPreferences/DataStore

### Демо-данные для входа:
```
Email: demo@reviews.ai
Password: password123
```

---

## 🎨 Цветовая схема

```kotlin
object AppColors {
    // Primary
    val Primary = Color(0xFF6366F1)        // Индиго - основной
    val PrimaryDark = Color(0xFF4F46E5)
    val PrimaryLight = Color(0xFF818CF8)

    // Secondary
    val Secondary = Color(0xFF8B5CF6)      // Фиолетовый

    // Semantic
    val Success = Color(0xFF10B981)        // Зелёный
    val Warning = Color(0xFFF59E0B)        // Оранжевый
    val Error = Color(0xFFEF4444)          // Красный
    val Info = Color(0xFF3B82F6)           // Голубой

    // Backgrounds
    val Background = Color(0xFFF8FAFC)     // Светлый фон
    val Surface = Color(0xFFFFFFFF)        // Белый (карточки)
    val Border = Color(0xFFE2E8F0)         // Границы

    // Text
    val TextPrimary = Color(0xFF1E293B)    // Основной текст
    val TextSecondary = Color(0xFF64748B)  // Вторичный текст
    val TextDisabled = Color(0xFF94A3B8)   // Неактивный текст

    // Gradients
    val GradientStart = Color(0xFF667EEA)  // Для фона логина
    val GradientEnd = Color(0xFF764BA2)
}
```

---

## 📐 Типография

```kotlin
object AppTypography {
    val HeadingLarge = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
        color = AppColors.TextPrimary
    )

    val HeadingMedium = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.SemiBold,
        color = AppColors.TextPrimary
    )

    val BodyLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        color = AppColors.TextPrimary
    )

    val BodyMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal,
        color = AppColors.TextSecondary
    )

    val Caption = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal,
        color = AppColors.TextSecondary
    )

    val StatValue = TextStyle(
        fontSize = 32.sp,
        fontWeight = FontWeight.Bold,
        color = AppColors.TextPrimary
    )
}
```

---

## 🏗️ Архитектура приложения

Используй **Clean Architecture** с MVVM:

```
app/
├── data/
│   ├── api/
│   │   ├── ApiService.kt          // Retrofit interface
│   │   ├── AuthInterceptor.kt     // Bearer token interceptor
│   │   └── NetworkModule.kt       // Hilt/Koin DI
│   ├── models/
│   │   ├── UserDto.kt
│   │   ├── ReportDto.kt
│   │   └── ReviewDto.kt
│   └── repository/
│       ├── AuthRepositoryImpl.kt
│       ├── UserRepositoryImpl.kt
│       └── ReportRepositoryImpl.kt
│
├── domain/
│   ├── models/
│   │   ├── User.kt
│   │   ├── Report.kt
│   │   └── Review.kt
│   ├── repository/
│   │   ├── AuthRepository.kt
│   │   ├── UserRepository.kt
│   │   └── ReportRepository.kt
│   └── usecase/
│       ├── LoginUseCase.kt
│       ├── GetReportsUseCase.kt
│       └── GetUserProfileUseCase.kt
│
├── presentation/
│   ├── navigation/
│   │   └── AppNavigation.kt       // Navigation Compose
│   ├── screens/
│   │   ├── login/
│   │   ├── home/
│   │   ├── reports/
│   │   └── profile/
│   ├── components/
│   │   ├── StatsCard.kt
│   │   ├── ReportCard.kt
│   │   ├── ReviewCard.kt
│   │   └── BottomNavBar.kt
│   └── theme/
│       ├── Color.kt
│       ├── Type.kt
│       └── Theme.kt
│
└── di/
    └── AppModule.kt               // Dependency Injection
```

### Рекомендуемые библиотеки:

```kotlin
// build.gradle.kts (app)
dependencies {
    // Compose
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.2.0")
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // DI
    implementation("io.insert-koin:koin-android:3.5.0")
    implementation("io.insert-koin:koin-androidx-compose:3.5.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Icons
    implementation("androidx.compose.material:material-icons-extended:1.6.0")
}
```

---

## 📱 Структура экранов

### Навигация (Bottom Navigation Bar)

3 вкладки:
1. **🏠 Главная** (HomeScreen) - Dashboard со статистикой
2. **📄 Отчёты** (ReportsScreen) - Список отчётов
3. **👤 Профиль** (ProfileScreen) - Профиль пользователя

```kotlin
sealed class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    object Home : BottomNavItem("home", "Главная", Icons.Outlined.Home)
    object Reports : BottomNavItem("reports", "Отчёты", Icons.Outlined.Description)
    object Profile : BottomNavItem("profile", "Профиль", Icons.Outlined.Person)
}
```

---

## 📄 Экран 1: Авторизация (LoginScreen)

### Визуальный дизайн:
- **Фон:** Gradient от #667EEA к #764BA2 (вся площадь экрана)
- **Карточка:** Белая, закруглённая (16dp), по центру экрана
- **Тень:** elevation 8dp

### Элементы карточки (сверху вниз):

1. **Логотип/Заголовок:**
   - Текст "Reviews AI"
   - Размер: 28sp, Bold
   - Цвет: Primary (#6366F1)
   - Под ним: "Автоматический анализ отзывов" (14sp, серый)

2. **Поле Email:**
   - OutlinedTextField
   - Иконка слева: Mail
   - Placeholder: "Email"
   - KeyboardType: Email

3. **Поле Password:**
   - OutlinedTextField
   - Иконка слева: Lock
   - Иконка справа: Visibility toggle
   - Placeholder: "Пароль"
   - VisualTransformation: Password

4. **Кнопка "Войти":**
   - Button (filled)
   - Цвет: Primary
   - Ширина: fillMaxWidth
   - Высота: 48dp
   - Закругление: 8dp
   - Показывать CircularProgressIndicator при загрузке

5. **Демо-подсказка:**
   - Surface с полупрозрачным фоном
   - Текст: "Демо: demo@reviews.ai / password123"
   - Размер: 12sp

### Функционал:
- Валидация полей (email формат, пароль не пустой)
- Показ ошибок под полями
- Сохранение токена в DataStore
- Навигация на HomeScreen после успешного входа

### Пример кода:
```kotlin
@Composable
fun LoginScreen(
    viewModel: LoginViewModel = koinViewModel(),
    onLoginSuccess: () -> Unit
) {
    val state by viewModel.state.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF667EEA),
                        Color(0xFF764BA2)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Logo
                Text(
                    text = "Reviews AI",
                    style = TextStyle(
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.Primary
                    )
                )
                // ... остальные элементы
            }
        }
    }
}
```

---

## 📄 Экран 2: Главная (HomeScreen)

### Макет экрана:

```
┌─────────────────────────────────┐
│ Панель управления          [👤] │  <- TopAppBar
├─────────────────────────────────┤
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │ Всего   │ │ Средний │        │  <- LazyVerticalGrid
│ │ отзывов │ │ рейтинг │        │     2 колонки
│ │   425   │ │   4.3⭐ │        │
│ └─────────┘ └─────────┘        │
│ ┌─────────┐ ┌─────────┐        │
│ │Позитив- │ │ Отчётов │        │
│ │  ные    │ │ создано │        │
│ │  78%    │ │    12   │        │
│ └─────────┘ └─────────┘        │
│                                 │
│ ─────── Последние отчёты ────── │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📄 Анализ за декабрь        │ │  <- ReportItem
│ │    156 отзывов • 4.5⭐      │ │
│ │    01.12 - 31.12.2024       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📄 Ноябрьский отчёт         │ │
│ │    203 отзыва • 4.2⭐       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ─────── Последние отзывы ────── │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Иван П.        Яндекс ⭐⭐⭐⭐⭐│ │  <- ReviewItem
│ │ "Отличный сервис..."        │ │
│ │ 15.01.2025    🟢 Позитивный │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠      📄      👤            │  <- BottomNavBar
│ Главная Отчёты  Профиль        │
└─────────────────────────────────┘
```

### Компонент StatsCard:

```kotlin
@Composable
fun StatsCard(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = AppColors.Surface
        ),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            iconColor.copy(alpha = 0.1f),
                            RoundedCornerShape(8.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = title,
                    style = AppTypography.BodyMedium
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = AppTypography.StatValue
            )
        }
    }
}
```

### Stats Cards (4 штуки):

| Карточка | Иконка | Цвет | Значение |
|----------|--------|------|----------|
| Всего отзывов | BarChart | Primary (#6366F1) | `stats.totalReviews` |
| Средний рейтинг | Star | Success (#10B981) | `stats.averageRating` + ⭐ |
| Позитивные | TrendingUp | Info (#3B82F6) | `(positive/total*100)%` |
| Отчётов создано | Description | Warning (#F59E0B) | `reports.size` |

### Компонент ReportItem:

```kotlin
@Composable
fun ReportItem(
    report: Report,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = AppColors.Background
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Иконка в кружке
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        AppColors.Primary.copy(alpha = 0.1f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.Description,
                    contentDescription = null,
                    tint = AppColors.Primary
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = report.title,
                    style = AppTypography.BodyLarge.copy(
                        fontWeight = FontWeight.SemiBold
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${report.stats.totalReviews} отзывов • ${report.stats.averageRating}⭐",
                    style = AppTypography.Caption
                )
                Text(
                    text = formatPeriod(report.period),
                    style = AppTypography.Caption
                )
            }

            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = AppColors.TextSecondary
            )
        }
    }
}
```

### Компонент ReviewItem:

```kotlin
@Composable
fun ReviewItem(review: Review) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = AppColors.Background
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = review.author,
                    style = AppTypography.BodyLarge.copy(
                        fontWeight = FontWeight.SemiBold
                    )
                )

                Row {
                    // Platform badge
                    PlatformBadge(platform = review.source)
                    Spacer(modifier = Modifier.width(8.dp))
                    // Rating stars
                    RatingStars(rating = review.rating)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Review text
            Text(
                text = review.text,
                style = AppTypography.BodyMedium,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatDate(review.date),
                    style = AppTypography.Caption
                )
                SentimentBadge(sentiment = review.sentiment)
            }
        }
    }
}

@Composable
fun PlatformBadge(platform: String) {
    val (text, color) = when (platform) {
        "yandex" -> "Яндекс" to Color(0xFFFF0000)
        "2gis" -> "2ГИС" to Color(0xFF2ECC71)
        else -> platform to AppColors.TextSecondary
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = AppTypography.Caption.copy(color = color)
        )
    }
}

@Composable
fun SentimentBadge(sentiment: String) {
    val (text, color) = when (sentiment) {
        "positive" -> "Позитивный" to AppColors.Success
        "neutral" -> "Нейтральный" to AppColors.Warning
        "negative" -> "Негативный" to AppColors.Error
        else -> sentiment to AppColors.TextSecondary
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = AppTypography.Caption.copy(color = color)
        )
    }
}

@Composable
fun RatingStars(rating: Int) {
    Row {
        repeat(5) { index ->
            Icon(
                imageVector = if (index < rating) Icons.Filled.Star else Icons.Outlined.Star,
                contentDescription = null,
                tint = if (index < rating) Color(0xFFFFC107) else AppColors.Border,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}
```

---

## 📄 Экран 3: Отчёты (ReportsScreen)

### Макет экрана:

```
┌─────────────────────────────────┐
│ Отчёты                     [➕] │  <- TopAppBar + FAB
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🔍 [Все] [Яндекс] [2ГИС]   │ │  <- FilterChips
│ └─────────────────────────────┘ │
│                                 │
│ ══════ Декабрь 2024 ══════════ │  <- Section header
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ┌────┐                      │ │
│ │ │4.5 │ Анализ за декабрь    │ │  <- ReportCard
│ │ │ ⭐ │ ✅ Готов              │ │
│ │ └────┘ 01.12 - 31.12.2024   │ │
│ │        Яндекс.Карты         │ │
│ │        156 | 🟢120 🟡25 🔴11│ │
│ │        ────────────────     │ │
│ │        "Основной инсайт..." │ │
│ │        [Открыть] [🗑️]       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ══════ Ноябрь 2024 ═══════════ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │        ...                  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠      📄      👤            │
└─────────────────────────────────┘
```

### Компонент FilterChips:

```kotlin
@Composable
fun FilterChips(
    selectedFilter: String,
    onFilterSelected: (String) -> Unit
) {
    val filters = listOf(
        "all" to "Все",
        "yandex" to "Яндекс",
        "2gis" to "2ГИС"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        filters.forEach { (key, label) ->
            FilterChip(
                selected = selectedFilter == key,
                onClick = { onFilterSelected(key) },
                label = { Text(label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AppColors.Primary,
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}
```

### Компонент ReportCard (расширенный):

```kotlin
@Composable
fun ReportCard(
    report: Report,
    onOpenClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = AppColors.Surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp)
        ) {
            // Rating circle
            RatingCircle(
                rating = report.stats.averageRating,
                modifier = Modifier.size(72.dp)
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                // Title
                Text(
                    text = report.title,
                    style = AppTypography.HeadingMedium
                )

                // Status badge
                StatusBadge(status = report.status ?: "ready")

                Spacer(modifier = Modifier.height(4.dp))

                // Period
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = AppColors.TextSecondary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = formatPeriod(report.period),
                        style = AppTypography.Caption
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Stats row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "${report.stats.totalReviews}",
                        style = AppTypography.Caption
                    )
                    Text(
                        text = "🟢${report.stats.positiveReviews}",
                        style = AppTypography.Caption.copy(color = AppColors.Success)
                    )
                    Text(
                        text = "🟡${report.stats.neutralReviews}",
                        style = AppTypography.Caption.copy(color = AppColors.Warning)
                    )
                    Text(
                        text = "🔴${report.stats.negativeReviews}",
                        style = AppTypography.Caption.copy(color = AppColors.Error)
                    )
                }

                // First insight preview
                if (report.insights.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = report.insights.first(),
                        style = AppTypography.Caption,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Actions
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onOpenClick,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AppColors.Primary
                        )
                    ) {
                        Text("Открыть")
                    }

                    OutlinedButton(
                        onClick = onDeleteClick,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = AppColors.Error
                        )
                    ) {
                        Icon(
                            Icons.Outlined.Delete,
                            contentDescription = "Удалить"
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RatingCircle(
    rating: Double,
    modifier: Modifier = Modifier
) {
    val color = when {
        rating >= 4.5 -> AppColors.Success
        rating >= 4.0 -> AppColors.Info
        rating >= 3.5 -> AppColors.Warning
        else -> AppColors.Error
    }

    Box(
        modifier = modifier
            .background(color.copy(alpha = 0.1f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = String.format("%.1f", rating),
                style = TextStyle(
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            )
            Icon(
                Icons.Filled.Star,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val (text, color) = when (status) {
        "ready" -> "Готов" to AppColors.Success
        "generating" -> "Генерируется" to AppColors.Warning
        "error" -> "Ошибка" to AppColors.Error
        else -> status to AppColors.TextSecondary
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = AppTypography.Caption.copy(
                color = color,
                fontWeight = FontWeight.Medium
            )
        )
    }
}
```

### Детальный экран отчёта (ReportDetailScreen):

При клике на "Открыть" переходим на экран с полной информацией:

```
┌─────────────────────────────────┐
│ [←] Детали отчёта               │
├─────────────────────────────────┤
│ ┌────┐ Анализ за декабрь 2024   │
│ │4.5 │ 01.12 - 31.12.2024       │
│ │ ⭐ │ Яндекс.Карты              │
│ └────┘                          │
├─────────────────────────────────┤
│ ══════ Статистика ════════════ │
│ [156 отзывов] [🟢120] [🟡25] [🔴11] │
├─────────────────────────────────┤
│ ══════ Краткая сводка ═════════ │
│ "Общий анализ показывает..."    │
├─────────────────────────────────┤
│ ══════ Инсайты ════════════════ │
│ • Инсайт 1                      │
│ • Инсайт 2                      │
├─────────────────────────────────┤
│ ══════ Рекомендации ═══════════ │
│ • Рекомендация 1                │
│ • Рекомендация 2                │
├─────────────────────────────────┤
│ ══════ Отзывы (5 из 156) ══════ │
│ [ReviewItem]                    │
│ [ReviewItem]                    │
│ [ReviewItem]                    │
└─────────────────────────────────┘
```

---

## 📄 Экран 4: Профиль (ProfileScreen)

### Макет экрана:

```
┌─────────────────────────────────┐
│ Профиль                         │
├─────────────────────────────────┤
│                                 │
│         ┌──────────┐            │
│         │  Avatar  │            │  <- 80dp круг с градиентом
│         │    👤    │            │
│         └──────────┘            │
│         Иван Петров             │  <- 20sp, Bold
│      ivan@example.com           │  <- 14sp, серый
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Личная информация     [✏️] │ │  <- Card header
│ ├─────────────────────────────┤ │
│ │ Имя                         │ │
│ │ [Иван Петров              ] │ │
│ │                             │ │
│ │ Email                       │ │
│ │ [📧 ivan@example.com      ] │ │
│ │                             │ │
│ │ Компания                    │ │
│ │ [ООО "Рестораны"          ] │ │
│ │                             │ │
│ │ [Отмена]  [Сохранить]       │ │  <- если редактирование
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Статистика аккаунта         │ │
│ ├─────────────────────────────┤ │
│ │   425      │    12    │  2  │ │
│ │  Отзывов   │ Отчётов  │Плат.│ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🚪 Выйти из аккаунта        │ │  <- Красная кнопка
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠      📄      👤            │
└─────────────────────────────────┘
```

### Код ProfileScreen:

```kotlin
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = koinViewModel(),
    onLogout: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var isEditing by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Avatar Section
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    AppColors.GradientStart,
                                    AppColors.GradientEnd
                                )
                            ),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = state.user?.name ?: "",
                    style = AppTypography.HeadingMedium
                )

                Text(
                    text = state.user?.email ?: "",
                    style = AppTypography.BodyMedium
                )
            }
        }

        // Personal Info Card
        item {
            PersonalInfoCard(
                user = state.user,
                isEditing = isEditing,
                onEditClick = { isEditing = true },
                onSave = { name, company ->
                    viewModel.updateProfile(name, company)
                    isEditing = false
                },
                onCancel = { isEditing = false }
            )
        }

        // Stats Card
        item {
            StatsCard(
                totalReviews = state.totalReviews,
                totalReports = state.totalReports,
                platforms = state.platforms
            )
        }

        // Logout Button
        item {
            OutlinedButton(
                onClick = {
                    viewModel.logout()
                    onLogout()
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = AppColors.Error
                ),
                border = BorderStroke(1.dp, AppColors.Error)
            ) {
                Icon(Icons.AutoMirrored.Outlined.ExitToApp, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Выйти из аккаунта")
            }
        }
    }
}
```

---

## 📦 Модели данных (Kotlin)

```kotlin
// User.kt
data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val company: String? = null,
    val position: String? = null,
    val avatar: String? = null,
    val createdAt: String,
    val updatedAt: String
)

// Report.kt
data class Report(
    val id: String,
    val userId: String,
    val title: String,
    val period: Period,
    val stats: ReportStats,
    val summary: String? = null,
    val insights: List<String>,
    val recommendations: List<String>,
    val categoryStats: List<CategoryStats>? = null,
    val reviews: List<Review>? = null,
    val createdAt: String,
    val updatedAt: String,
    val status: String? = "ready"
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
    val ratingDistribution: Map<String, Int>
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

// Review.kt
data class Review(
    val id: String,
    val reportId: String,
    val author: String,
    val rating: Int,
    val text: String,
    val date: String,
    val source: String,  // "yandex" | "2gis"
    val categories: List<String>,
    val sentiment: String  // "positive" | "neutral" | "negative"
)

// Auth
data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: User
)

data class UpdateProfileRequest(
    val name: String? = null,
    val company: String? = null,
    val position: String? = null
)
```

---

## 🔌 API Service (Retrofit)

```kotlin
interface ApiService {

    // Auth
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<LoginResponse>

    // User
    @GET("api/user/profile")
    suspend fun getProfile(): Response<User>

    @PUT("api/user/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<User>

    // Reports
    @GET("api/reports")
    suspend fun getReports(): Response<List<Report>>

    @GET("api/reports/{id}")
    suspend fun getReportById(@Path("id") id: String): Response<Report>

    // Health
    @GET("api/health")
    suspend fun health(): Response<HealthResponse>
}
```

---

## 🧭 Навигация (Navigation Compose)

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = koinViewModel()
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState()

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) "main" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("main") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("main") {
            MainScreen(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("main") { inclusive = true }
                    }
                }
            )
        }
    }
}

@Composable
fun MainScreen(onLogout: () -> Unit) {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            BottomNavBar(navController = navController)
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("home") {
                HomeScreen(
                    onReportClick = { reportId ->
                        navController.navigate("report/$reportId")
                    }
                )
            }

            composable("reports") {
                ReportsScreen(
                    onReportClick = { reportId ->
                        navController.navigate("report/$reportId")
                    }
                )
            }

            composable(
                route = "report/{reportId}",
                arguments = listOf(navArgument("reportId") { type = NavType.StringType })
            ) { backStackEntry ->
                val reportId = backStackEntry.arguments?.getString("reportId") ?: return@composable
                ReportDetailScreen(
                    reportId = reportId,
                    onBackClick = { navController.popBackStack() }
                )
            }

            composable("profile") {
                ProfileScreen(onLogout = onLogout)
            }
        }
    }
}

@Composable
fun BottomNavBar(navController: NavHostController) {
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Reports,
        BottomNavItem.Profile
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar(
        containerColor = AppColors.Surface
    ) {
        items.forEach { item ->
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title
                    )
                },
                label = { Text(item.title) },
                selected = currentRoute == item.route,
                onClick = {
                    navController.navigate(item.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = AppColors.Primary,
                    selectedTextColor = AppColors.Primary,
                    indicatorColor = AppColors.Primary.copy(alpha = 0.1f)
                )
            )
        }
    }
}
```

---

## ✅ Чеклист для разработки

### Фаза 1: Настройка проекта
- [ ] Создать проект Android Studio (Empty Compose Activity)
- [ ] Настроить Gradle с зависимостями
- [ ] Создать структуру пакетов (Clean Architecture)
- [ ] Настроить Koin/Hilt для DI
- [ ] Создать тему (Colors, Typography)

### Фаза 2: Сетевой слой
- [ ] Настроить Retrofit + OkHttp
- [ ] Создать ApiService interface
- [ ] Реализовать AuthInterceptor для Bearer токена
- [ ] Создать DTO модели
- [ ] Настроить DataStore для хранения токена

### Фаза 3: Экран авторизации
- [ ] LoginScreen UI
- [ ] LoginViewModel
- [ ] Валидация полей
- [ ] Обработка ошибок
- [ ] Сохранение токена

### Фаза 4: Главный экран (Home)
- [ ] HomeScreen UI
- [ ] StatsCard компонент
- [ ] ReportItem компонент
- [ ] ReviewItem компонент
- [ ] HomeViewModel + загрузка данных

### Фаза 5: Экран отчётов
- [ ] ReportsScreen UI
- [ ] FilterChips компонент
- [ ] ReportCard компонент
- [ ] ReportDetailScreen
- [ ] ReportsViewModel

### Фаза 6: Экран профиля
- [ ] ProfileScreen UI
- [ ] Редактирование профиля
- [ ] ProfileViewModel
- [ ] Функция выхода

### Фаза 7: Навигация и интеграция
- [ ] Bottom Navigation Bar
- [ ] Navigation между экранами
- [ ] Deep linking (опционально)
- [ ] Обработка состояния авторизации

### Фаза 8: Полировка
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Pull-to-refresh
- [ ] Animations

---

## 🎯 Важные заметки

1. **Токен авторизации** - сохраняй в DataStore Preferences, не в SharedPreferences (более безопасно)

2. **Обработка ошибок сети** - показывай Snackbar или Dialog при ошибках API

3. **Оффлайн режим** - опционально можно добавить кэширование с Room

4. **Цветовая схема** - строго придерживайся указанных цветов для консистентности с веб-версией

5. **Иконки** - используй Material Icons Extended для полного набора иконок

6. **Тестирование API** - используй демо-данные (demo@reviews.ai / password123)

7. **Минимальная версия Android** - API 24 (Android 7.0) рекомендуется

---

Удачи с разработкой! 🚀

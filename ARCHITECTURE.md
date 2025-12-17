# 🏗️ Архитектура Reviews AI

## Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              React 19 + TypeScript + Vite                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │ Widgets  │  │  Shared  │  │   App    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │            │            │              │          │
│         └────────────┴────────────┴──────────────┘          │
│                        │                                     │
│                        ▼                                     │
│                   API Client (HTTP)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API (JSON)
                        │ JWT Authentication
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Go)                            │
│                   Clean Architecture                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Presentation Layer (HTTP)                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │  Handlers  │  │ Middleware │  │    DTOs    │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Application Layer (Use Cases)                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │    Auth    │  │    User    │  │   Report   │     │  │
│  │  │  UseCase   │  │  UseCase   │  │  UseCase   │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Domain Layer (Business Logic)             │  │
│  │  ┌────────────┐  ┌────────────────────────────────┐  │  │
│  │  │  Entities  │  │   Repository Interfaces        │  │  │
│  │  │ User, Report│  │ IUserRepo, IReportRepo        │  │  │
│  │  └────────────┘  └────────────────────────────────┘  │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Infrastructure Layer (External Systems)        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │PostgreSQL│  │ OpenRouter│  │  Yandex Parser  │   │  │
│  │  │   Repo   │  │  AI Client│  │                 │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └───┬────────────────┬────────────────┬────────────────┘  │
└──────┼────────────────┼────────────────┼───────────────────┘
       ▼                ▼                ▼
   PostgreSQL    OpenRouter API    Yandex Maps
      DB          (Qwen3-Coder)      (Parsing)
```

---

## Backend: Clean Architecture (Go)

### Слои и зависимости

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                           Interfaces
```

**Правило зависимостей:** Внутренние слои не зависят от внешних

### 1. Domain Layer (Ядро)

**Расположение:** `internal/domain/`

**Назначение:** Бизнес-логика, независимая от внешних систем

**Содержит:**
- **Entities** (`entity/`) - данные и бизнес-правила
  - `User` - пользователь системы
  - `Report` - отчёт с анализом
  - `Review` - отдельный отзыв
  - `CategoryStat` - статистика по категории

- **Repository Interfaces** (`repository/`) - контракты для хранилищ
  - `IUserRepository`
  - `IReportRepository`
  - `IReviewRepository`

**Зависимости:** НЕТ внешних зависимостей

### 2. Application Layer (Бизнес-сценарии)

**Расположение:** `internal/application/usecase/`

**Назначение:** Оркестрация бизнес-логики

**Use Cases:**
- **AuthUseCase** - регистрация, вход
- **UserUseCase** - управление профилем
- **ReportUseCase** - создание и управление отчётами
  - Парсинг отзывов
  - AI анализ
  - Расчёт статистики
  - Определение sentiment
  - Извлечение категорий

**Зависимости:** Domain Layer только

### 3. Infrastructure Layer (Внешние системы)

**Расположение:** `internal/infrastructure/`

**Назначение:** Реализация интерфейсов для внешних систем

**Компоненты:**

**Database** (`database/`)
- `postgres.go` - подключение к БД
- `*_repository_impl.go` - реализации репозиториев
  - UserRepository
  - ReportRepository
  - ReviewRepository

**AI Client** (`ai/`)
- `openrouter.go` - клиент OpenRouter API
  - Отправка отзывов на анализ
  - Парсинг AI ответа
  - Генерация базового анализа (fallback)

**Parser** (`parser/`)
- `yandex_parser.go` - парсер Яндекс.Карт
  - Извлечение Business ID из URL
  - Парсинг отзывов (демо-данные)
  - Определение sentiment
  - Извлечение категорий

**Зависимости:** Domain Layer (через интерфейсы)

### 4. Presentation Layer (HTTP API)

**Расположение:** `internal/presentation/`

**Назначение:** HTTP обработчики и middleware

**Handlers** (`handler/`)
- `AuthHandler` - POST /auth/register, /auth/login
- `UserHandler` - GET/PUT /user/profile
- `ReportHandler` - CRUD операции с отчётами

**Middleware** (`middleware/`)
- `AuthMiddleware` - проверка JWT токена
- `CORSMiddleware` - CORS заголовки

**Зависимости:** Application Layer

### Утилиты

**Расположение:** `pkg/utils/`

- `jwt.go` - генерация и валидация JWT
- `password.go` - bcrypt хеширование

---

## Frontend: Feature-Sliced Design (React)

### Структура слоёв

```
app/       - Инициализация приложения
pages/     - Страницы (роуты)
widgets/   - Сложные UI компоненты
shared/    - Переиспользуемый код
```

### 1. App Layer

**Расположение:** `src/app/`

**Назначение:** Конфигурация приложения

**Содержит:**
- `providers/router.tsx` - настройка роутинга
- `layouts/MainLayout.tsx` - основной layout
- `styles/global.css` - глобальные стили

### 2. Pages Layer

**Расположение:** `src/pages/`

**Назначение:** Страницы приложения (роуты)

**Страницы:**
- `dashboard/` - главная страница со статистикой
- `reports/` - список отчётов + создание
- `report-detail/` - детальный просмотр отчёта
- `profile/` - профиль пользователя
- `login/` - вход в систему
- `settings/` - настройки

### 3. Widgets Layer

**Расположение:** `src/widgets/`

**Назначение:** Сложные переиспользуемые компоненты

**Виджеты:**
- `sidebar/` - навигационная панель
- `header/` - шапка приложения
- `stats-card/` - карточка статистики

### 4. Shared Layer

**Расположение:** `src/shared/`

**Назначение:** Общий код для всего приложения

**API** (`api/`)
- `client.ts` - базовый HTTP клиент
- `authApi.ts` - endpoints аутентификации
- `userApi.ts` - endpoints пользователя
- `reportApi.ts` - endpoints отчётов

**UI** (`ui/`)
- Базовые компоненты: Button, Input, Card, Icon

**Types** (`types/`)
- TypeScript интерфейсы

**Lib** (`lib/`)
- `reportHelpers.ts` - утилиты для работы с отчётами
- `mockData.ts` - mock данные для разработки

---

## Поток данных

### Создание отчёта (полный цикл)

```
1. Frontend: User clicks "Создать отчёт"
   ↓
2. Frontend: ReportsPage → reportApi.createReport()
   ↓ HTTP POST /api/reports
3. Backend: ReportHandler.CreateReport()
   ↓
4. Backend: ReportUseCase.CreateReport()
   ├─ YandexParser.ParseReviews() - получение отзывов
   ├─ DetermineSentiment() - анализ тональности
   ├─ ExtractCategories() - извлечение категорий
   ├─ OpenRouterClient.AnalyzeReviews() - AI анализ
   ├─ calculateStats() - расчёт статистики
   ├─ ReportRepository.Create() - сохранение отчёта
   ├─ ReviewRepository.CreateBatch() - сохранение отзывов
   └─ ReportRepository.CreateCategoryStats() - сохранение статистики
   ↓
5. Backend: Return Report JSON
   ↓
6. Frontend: Update UI, show report
```

### Аутентификация

```
1. User: Вход (email + password)
   ↓
2. Frontend: authApi.login()
   ↓ HTTP POST /api/auth/login
3. Backend: AuthHandler.Login()
   ↓
4. Backend: AuthUseCase.Login()
   ├─ UserRepository.FindByEmail()
   ├─ bcrypt.CompareHashAndPassword()
   └─ jwt.GenerateToken()
   ↓
5. Backend: Return { token, user }
   ↓
6. Frontend: Store token in localStorage
   ↓
7. Frontend: Include in all requests:
   Authorization: Bearer <token>
```

---

## База данных (PostgreSQL)

### Схема

```sql
users (id, email, password, name, role, company, position, avatar, timestamps)
  ↓
reports (id, user_id, title, period, stats, insights, recommendations, timestamps)
  ↓
  ├─ reviews (id, report_id, author, rating, text, date, source, categories, sentiment)
  └─ category_stats (id, report_id, category, count, avg_rating, positive/neutral/negative)
```

### Связи

- `reports.user_id` → `users.id` (FK)
- `reviews.report_id` → `reports.id` (FK, CASCADE DELETE)
- `category_stats.report_id` → `reports.id` (FK, CASCADE DELETE)

---

## Принципы архитектуры

### Backend (Clean Architecture)

✅ **Независимость от фреймворков** - бизнес-логика не зависит от Gin
✅ **Тестируемость** - use cases легко тестировать
✅ **Независимость от UI** - можно заменить REST на GraphQL
✅ **Независимость от БД** - можно заменить PostgreSQL
✅ **Независимость от внешних сервисов** - можно заменить OpenRouter

### Frontend (FSD)

✅ **Предсказуемость** - ясная структура слоёв
✅ **Масштабируемость** - легко добавлять новые фичи
✅ **Переиспользование** - shared компоненты
✅ **Изоляция** - изменения не влияют на другие части

---

## Безопасность

### Аутентификация
- JWT токены (HS256)
- Bcrypt для паролей (cost 10)
- Токены в заголовке Authorization

### Валидация
- Gin validation tags
- Проверка прав доступа (user ID)
- SQL injection защита (prepared statements)

### CORS
- Настраиваемые origins
- Credentials support
- Preflight requests

---

## Расширяемость

### Добавление нового источника отзывов (2GIS)

1. Создать `2gis_parser.go` в `infrastructure/parser/`
2. Реализовать интерфейс парсера
3. Добавить в `ReportUseCase.CreateReport()`
4. Обновить frontend для выбора источника

### Добавление новой AI модели

1. Создать новый клиент в `infrastructure/ai/`
2. Реализовать интерфейс `AIAnalyzer`
3. Настроить через `.env`

### Добавление экспорта в PDF

1. Создать `PDFExporter` в `infrastructure/export/`
2. Добавить use case `ExportReportUseCase`
3. Добавить handler `ExportReportHandler`
4. Добавить endpoint `GET /reports/:id/export`

---

## Мониторинг и логирование

### Логи (планируется)
- Structured logging (zerolog/zap)
- Request ID tracking
- Error tracking (Sentry)

### Метрики (планируется)
- Prometheus metrics
- Request latency
- Database query time
- AI API response time

---

Made with Clean Architecture principles 🏗️

# Reviews AI

Сервис автоматического сбора и анализа отзывов организаций с Яндекс.Карт и 2ГИС. Парсит реальные отзывы через headless Chrome (chromedp), анализирует с помощью AI (OpenRouter / Qwen3-Coder) и генерирует структурированные отчёты с инсайтами и рекомендациями.

## Стек технологий

| Компонент | Технология |
|-----------|-----------|
| Backend | Go 1.24, Gin, Clean Architecture |
| Frontend | React 19, TypeScript, Vite, Feature-Sliced Design |
| БД | PostgreSQL |
| Парсинг | chromedp (headless Chrome в Go) |
| AI | OpenRouter API (модель Qwen3-Coder free) |
| Аутентификация | JWT (HS256) + bcrypt |
| Деплой | Docker (Alpine + Chromium), Render.com |

## Быстрый старт

```bash
# 1. Полная установка (БД + зависимости + .env)
make setup

# 2. Вставьте OpenRouter API ключ в backend-go/.env
#    Получить бесплатно: https://openrouter.ai/

# 3. Запуск backend + frontend
make dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173

Демо-вход: `demo@reviews.ai` / `password123`

## Структура проекта

```
Reviews_ai/
├── Makefile                    # Все команды для запуска/сборки/деплоя
├── PLAN.md                     # План разработки (9 этапов)
├── README.md
│
├── backend-go/                 # Go Backend (Clean Architecture)
│   ├── cmd/api/main.go         # Точка входа, DI, маршруты
│   ├── internal/
│   │   ├── domain/             # Бизнес-логика (сущности, интерфейсы)
│   │   │   ├── entity/         # Report, Review, User, ParsedReview
│   │   │   └── service/        # ReviewParser interface, ParserRegistry interface
│   │   ├── application/
│   │   │   └── usecase/        # ReportUseCase — оркестрация создания отчётов
│   │   ├── infrastructure/     # Внешние сервисы
│   │   │   ├── ai/             # OpenRouter AI клиент (анализ отзывов)
│   │   │   ├── database/       # PostgreSQL репозитории
│   │   │   └── parser/         # Парсеры отзывов (chromedp)
│   │   │       ├── browser.go          # BrowserManager (headless Chrome)
│   │   │       ├── yandex_parser.go    # Парсер Яндекс.Карт
│   │   │       ├── twogis_parser.go    # Парсер 2ГИС
│   │   │       ├── registry.go         # ParserRegistry (автоопределение источника по URL)
│   │   │       ├── ratelimiter.go      # Rate limiter между запросами
│   │   │       └── retry.go            # Retry с exponential backoff
│   │   └── presentation/
│   │       └── handler/        # HTTP хендлеры (auth, report, user)
│   ├── migrations/
│   │   └── schema.sql          # Схема БД
│   ├── .env.example            # Все переменные окружения
│   └── Dockerfile              # Alpine + Chromium + Go binary
│
└── frontend/                   # React Frontend (Feature-Sliced Design)
    └── src/
        ├── pages/              # dashboard, login, reports, report-detail, profile, settings
        ├── widgets/            # header, sidebar, stats-card
        └── shared/
            ├── api/            # reportApi.ts, authApi.ts — HTTP клиент к Go backend
            ├── types/          # TypeScript типы (Report, Review, User)
            ├── lib/            # reportHelpers.ts — нормализация данных из Go формата
            └── ui/             # Общие UI компоненты
```

## Архитектура

### Как работает создание отчёта

1. Пользователь вводит URL организации (Яндекс.Карт или 2ГИС) и период
2. `ParserRegistry` определяет источник по URL и выбирает парсер
3. Парсер (chromedp) открывает страницу в headless Chrome:
   - **Яндекс.Карты**: скроллит infinite scroll для подгрузки отзывов
   - **2ГИС**: кликает "Загрузить ещё" для пагинации
4. Из DOM извлекаются: автор, рейтинг (по звёздам), текст, дата
5. Отзывы фильтруются по указанному периоду
6. `DetermineSentiment` и `ExtractCategories` — базовый анализ тональности и категорий
7. AI (OpenRouter) генерирует: summary, insights, recommendations
8. Отчёт сохраняется в PostgreSQL

### Ключевые интерфейсы

```go
// domain/service/parser.go
type ReviewParser interface {
    ParseReviews(ctx context.Context, url string, opts ParseOptions) ([]entity.ParsedReview, error)
    ValidateURL(url string) bool
    Source() string
}

type ParseOptions struct {
    PeriodStart time.Time
    PeriodEnd   time.Time
    MaxReviews  int
}
```

Парсеры реализуют этот интерфейс. `ParserRegistry` хранит все парсеры и автоматически выбирает нужный по URL.

### Валидация URL

- **Яндекс.Карты**: `yandex.ru/maps/org/{slug}/{id}` или `yandex.com/maps/org/...`
- **2ГИС**: `2gis.ru/{city}/firm/{firmId}` или `2gis.com/.../firm/...`

## API Endpoints

### Аутентификация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход (возвращает JWT) |

### Отчёты (требуют JWT в `Authorization: Bearer <token>`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/reports` | Создать отчёт (парсинг + AI анализ) |
| GET | `/api/reports` | Список отчётов пользователя |
| GET | `/api/reports/:id` | Детали отчёта |
| DELETE | `/api/reports/:id` | Удалить отчёт |

### Создание отчёта — тело запроса
```json
{
  "title": "Название отчёта",
  "url": "https://yandex.ru/maps/org/slug/123456789/",
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-12-31T23:59:59Z",
  "maxReviews": 50
}
```

### Прочее
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка здоровья сервиса |
| GET | `/api/user/profile` | Профиль пользователя |

## Переменные окружения

Файл: `backend-go/.env` (создаётся из `.env.example`)

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `PORT` | Порт сервера | `3001` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL | `localhost:5432`, `reviews_ai` |
| `JWT_SECRET` | Секрет для JWT токенов | обязательно сменить |
| `CORS_ORIGIN` | Разрешённый origin | `http://localhost:5173` |
| `OPENROUTER_API_KEY` | Ключ OpenRouter AI | обязательно |
| `OPENROUTER_MODEL` | Модель AI | `qwen/qwen3-coder:free` |
| `OPENROUTER_TEMPERATURE` | Температура AI | `0.3` |
| `PARSER_SCROLL_DELAY_MS` | Пауза между скроллами | `2000` |
| `PARSER_MAX_REVIEWS` | Макс. отзывов за раз | `200` |
| `PARSER_TIMEOUT_SEC` | Таймаут парсинга | `60` |
| `CHROME_BIN` | Путь к Chromium (для Docker) | авто |

## БД: Таблицы

- `users` — пользователи (email, password_hash)
- `reports` — отчёты (title, url, source, period, AI-анализ: summary, insights, recommendations)
- `reviews` — отзывы привязанные к отчётам (author, rating, text, date, sentiment, source)
- `category_stats` — статистика по категориям (category, count, positive/neutral/negative)

Схема: `backend-go/migrations/schema.sql`

## Makefile команды

```bash
make setup        # Полная установка (БД + зависимости + .env)
make dev          # Запустить backend + frontend
make backend      # Только Go backend (localhost:3001)
make frontend     # Только React frontend (localhost:5173)
make build        # Сборка обоих проектов (проверка компиляции)
make lint         # go vet + tsc --noEmit
make db-create    # Создать БД reviews_ai
make db-schema    # Применить схему
make db-reset     # Пересоздать БД с нуля
make docker-build # Собрать Docker образ
make docker-run   # Запустить в Docker
make health       # Проверить ответ backend
make clean        # Очистить временные файлы
```

## Docker

```bash
make docker-build
make docker-run
```

Dockerfile использует Alpine + Chromium для headless парсинга. В Docker автоматически задаются `CHROME_BIN` и `--no-sandbox`.

## Известные особенности

- Парсинг через chromedp занимает 10-30 секунд (headless Chrome загружает страницу и скроллит)
- Без `OPENROUTER_API_KEY` AI-анализ использует fallback-режим (базовый анализ без нейросети)
- chromedp использует Go-side polling (не JS Promises) — это критично для корректной работы с chromedp
- Rate limiter добавляет паузы между запросами к источникам, чтобы не получить блокировку
- Retry (2 попытки) при таймаутах парсинга

## Лицензия

MIT

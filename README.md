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
| Карты | Яндекс.Карты JavaScript API 2.1 |
| Деплой | Docker (Alpine + Chromium), Render.com |

## Быстрый старт

```bash
# 1. Полная установка (БД + зависимости + .env)
make setup

# 2. Вставьте ключи в файлы конфигурации:
#    backend-go/.env  → OPENROUTER_API_KEY (получить: https://openrouter.ai/)
#    frontend/.env    → VITE_YANDEX_MAPS_API_KEY (получить: https://developer.tech.yandex.ru/)

# 3. Запуск backend + frontend
make dev
```

Backend: http://localhost:3001  
Frontend: http://localhost:5173

> **Совет:** если backend не стартует из-за занятого порта 3001, `make dev` автоматически освобождает порт перед запуском.

## Структура проекта

```
Reviews_ai/
├── Makefile                    # Все команды для запуска/сборки/деплоя
├── README.md
│
├── backend-go/                 # Go Backend (Clean Architecture)
│   ├── cmd/api/main.go         # Точка входа, DI, маршруты
│   ├── internal/
│   │   ├── domain/             # Бизнес-логика
│   │   │   ├── entity/         # Report, Review, User, Location, ParsedReview
│   │   │   └── service/        # ReviewParser interface, ParserRegistry interface
│   │   ├── application/
│   │   │   └── usecase/        # ReportUseCase, LocationUseCase, UserUseCase
│   │   ├── infrastructure/     # Внешние сервисы
│   │   │   ├── ai/             # OpenRouter AI клиент (анализ отзывов)
│   │   │   ├── database/       # PostgreSQL репозитории (users, reports, locations)
│   │   │   └── parser/         # Парсеры отзывов (chromedp)
│   │   │       ├── browser.go          # BrowserManager (headless Chrome)
│   │   │       ├── yandex_parser.go    # Парсер Яндекс.Карт
│   │   │       ├── twogis_parser.go    # Парсер 2ГИС
│   │   │       ├── registry.go         # ParserRegistry (автоопределение источника по URL)
│   │   │       ├── ratelimiter.go      # Rate limiter между запросами
│   │   │       └── retry.go            # Retry с exponential backoff
│   │   └── presentation/
│   │       └── handler/        # HTTP хендлеры
│   │           ├── auth_handler.go
│   │           ├── report_handler.go
│   │           ├── location_handler.go
│   │           └── user_handler.go
│   ├── migrations/
│   │   └── schema.sql          # Схема БД
│   ├── uploads/
│   │   └── avatars/            # Загруженные аватары пользователей
│   ├── .env.example            # Шаблон переменных окружения
│   └── Dockerfile              # Alpine + Chromium + Go binary
│
└── frontend/                   # React Frontend (Feature-Sliced Design)
    ├── .env                    # VITE_API_URL, VITE_YANDEX_MAPS_API_KEY
    └── src/
        ├── pages/
        │   ├── login/          # Страница входа
        │   ├── register/       # Страница регистрации
        │   ├── forgot-password/ # Восстановление пароля
        │   ├── dashboard/      # Главная: статистика и последние отчёты
        │   ├── reports/        # Список отчётов + создание нового
        │   ├── report-detail/  # Детальный просмотр отчёта
        │   ├── locations/      # Филиалы: управление точками с Яндекс.Картой
        │   ├── profile/        # Профиль пользователя + аватар
        │   └── settings/       # Настройки + смена пароля
        ├── widgets/            # header, sidebar, stats-card
        └── shared/
            ├── api/            # reportApi, authApi, locationApi, userApi
            ├── types/          # TypeScript типы (Report, Review, User, Location)
            ├── lib/            # reportHelpers.ts — нормализация данных из Go
            └── ui/             # Button, Card, Input, Icon, YandexMap
```

## Архитектура

### Как работает создание отчёта

1. Пользователь выбирает **филиал** из сохранённых и указывает платформу (Яндекс / 2ГИС) и период
2. Frontend отправляет URL нужной платформы на `POST /api/reports`
3. `ParserRegistry` определяет источник по URL и выбирает парсер
4. Парсер (chromedp) открывает страницу в headless Chrome:
   - **Яндекс.Карты**: скроллит infinite scroll для подгрузки отзывов
   - **2ГИС**: кликает «Загрузить ещё» для пагинации
5. Из DOM извлекаются: автор, рейтинг (по звёздам), текст, дата
6. Отзывы фильтруются по указанному периоду
7. `DetermineSentiment` и `ExtractCategories` — базовый анализ тональности и категорий
8. AI (OpenRouter) генерирует: summary, insights, recommendations
9. Отчёт сохраняется в PostgreSQL

### Управление филиалами

Страница **Филиалы** позволяет заранее сохранять организации:
- Название, адрес, URL на Яндекс.Картах, URL на 2ГИС
- Автопоиск ссылки 2ГИС по названию через `GET /api/locations/find-2gis`
- При создании отчёта пользователь выбирает филиал — URL подставляется автоматически

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

### Валидация URL

- **Яндекс.Карты**: `yandex.ru/maps/org/{slug}/{id}` или `yandex.com/maps/org/...`
- **2ГИС**: `2gis.ru/{city}/firm/{firmId}` или `2gis.com/.../firm/...`

## API Endpoints

### Аутентификация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация нового пользователя |
| POST | `/api/auth/login` | Вход (возвращает JWT) |

### Пользователь (требуют JWT)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/user/profile` | Профиль пользователя |
| PUT | `/api/user/profile` | Обновить профиль |
| PUT | `/api/user/password` | Сменить пароль |
| POST | `/api/user/avatar` | Загрузить аватар |

### Отчёты (требуют JWT)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/reports` | Создать отчёт (парсинг + AI анализ) |
| GET | `/api/reports` | Список отчётов пользователя |
| GET | `/api/reports/:id` | Детали отчёта |
| DELETE | `/api/reports/:id` | Удалить отчёт |

### Филиалы (требуют JWT)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/locations` | Создать филиал |
| GET | `/api/locations` | Список филиалов пользователя |
| GET | `/api/locations/:id` | Данные одного филиала |
| PUT | `/api/locations/:id` | Обновить филиал |
| DELETE | `/api/locations/:id` | Удалить филиал |
| GET | `/api/locations/find-2gis?name=&address=` | Автопоиск ссылки 2ГИС |

### Прочее

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка работоспособности сервиса |
| GET | `/uploads/avatars/:file` | Аватары пользователей (статика) |

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

## Переменные окружения

### Backend — `backend-go/.env`

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `PORT` | Порт сервера | `3001` |
| `DB_HOST` | PostgreSQL хост | `localhost` |
| `DB_PORT` | PostgreSQL порт | `5432` |
| `DB_USER` | Пользователь БД | — |
| `DB_PASSWORD` | Пароль БД | — |
| `DB_NAME` | Имя БД | `reviews_ai` |
| `DATABASE_URL` | Полная строка подключения (для Render/PaaS) | — |
| `JWT_SECRET` | Секрет для JWT токенов | **обязательно сменить** |
| `JWT_EXPIRES_IN` | Срок жизни токена | `168h` |
| `CORS_ORIGIN` | Разрешённый origin | `http://localhost:5173` |
| `OPENROUTER_API_KEY` | Ключ OpenRouter AI | **обязательно** |
| `OPENROUTER_MODEL` | Модель AI | `qwen/qwen3-coder:free` |
| `OPENROUTER_TEMPERATURE` | Температура генерации | `0.3` |
| `PARSER_SCROLL_DELAY_MS` | Пауза между скроллами (мс) | `2000` |
| `PARSER_MAX_REVIEWS` | Макс. отзывов за раз | `200` |
| `PARSER_TIMEOUT_SEC` | Таймаут парсинга (сек) | `60` |
| `CHROME_BIN` | Путь к Chromium (для Docker) | авто |

### Frontend — `frontend/.env`

| Переменная | Описание |
|-----------|----------|
| `VITE_API_URL` | URL backend API (по умолчанию `http://localhost:3001/api`) |
| `VITE_YANDEX_MAPS_API_KEY` | Ключ Яндекс.Карты JS API 2.1 (для страницы Филиалы) |

## БД: Таблицы

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи: email, password_hash, name, avatar_url |
| `reports` | Отчёты: title, url, source, period, AI-анализ (summary, insights, recommendations) |
| `reviews` | Отзывы, привязанные к отчётам: author, rating, text, date, sentiment, source |
| `category_stats` | Статистика по категориям: category, count, positive/neutral/negative |
| `locations` | Филиалы пользователей: name, address, yandex_url, twogis_url |

Схема: `backend-go/migrations/schema.sql`

## Makefile команды

```bash
make setup        # Полная установка (БД + зависимости + .env)
make dev          # Запустить backend + frontend (автоматически освобождает порт 3001)
make backend      # Только Go backend (localhost:3001)
make frontend     # Только React frontend (localhost:5173)
make stop         # Остановить процесс на порту 3001
make build        # Сборка обоих проектов (проверка компиляции)
make lint         # go vet + tsc --noEmit
make db-create    # Создать БД reviews_ai
make db-schema    # Применить схему
make db-reset     # Пересоздать БД с нуля
make docker-build # Собрать Docker образ
make docker-run   # Запустить в Docker
make health       # Проверить ответ backend (/api/health)
make logs         # Логи Docker контейнера
make clean        # Очистить временные файлы (bin, dist, .vite)
```

## Docker

```bash
make docker-build
make docker-run
```

Dockerfile использует Alpine + Chromium для headless парсинга. В Docker автоматически задаются `CHROME_BIN` и флаг `--no-sandbox`.

## Известные особенности

- Парсинг занимает 10–60 секунд: headless Chrome загружает страницу, скроллит и извлекает DOM
- Без `OPENROUTER_API_KEY` AI-анализ работает в fallback-режиме (базовый анализ без нейросети)
- Если JWT токен истёк, выполните `localStorage.clear()` в консоли браузера и войдите заново
- chromedp использует Go-side polling (не JS Promises) — это критично для корректной работы
- Rate limiter добавляет паузы между запросами, чтобы не получить блокировку от платформ
- Retry (2 попытки с exponential backoff) при таймаутах парсинга
- `make dev` на Windows автоматически убивает процесс на порту 3001 перед запуском

## Лицензия

MIT

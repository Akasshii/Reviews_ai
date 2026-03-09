# План доработки Reviews AI

## Контекст

Сервис собирает отзывы предприятий с Яндекс.Карт и 2ГИС и генерирует AI-отчёты.
Сейчас проект имеет рабочую архитектуру (Go backend + React frontend + PostgreSQL), но парсер использует захардкоженные демо-данные.
Нужно реализовать реальный сбор отзывов.

**Выбранный подход к парсингу:** chromedp (headless Chrome в Go) — единый подход для обоих источников.

**Результаты исследования API:**

- Яндекс.Карты: официального API для отзывов нет. Внутренний API (`fetchReviews`) требует CSRF + хеш-подпись, хрупко.
- 2ГИС: официальный Places API возвращает только статистику, не сами отзывы. Endpoint `public-api.reviews.2gis.com` не задокументирован.
- Решение: chromedp — единый надёжный подход, эмулирует браузер, устойчив к смене API.

---

## Этап 1. Рефакторинг архитектуры парсеров

**Статус:** [x] выполнен

**Цель:** Заменить привязку к конкретному `*parser.YandexParser` на интерфейс, поддерживающий несколько источников.

### 1.1 Создать интерфейс парсера

Файл: `backend-go/internal/domain/service/parser.go`

```go
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

### 1.2 Заменить `YandexReview` на универсальный `ParsedReview`

Файл: `backend-go/internal/domain/entity/review.go`

### 1.3 Создать ParserRegistry

Файл: `backend-go/internal/infrastructure/parser/registry.go`

- Хранит map парсеров, автоопределяет источник по URL

### 1.4 Обновить ReportUseCase

Файл: `backend-go/internal/application/usecase/report_usecase.go`

- Принимать `ParserRegistry` вместо `*parser.YandexParser`
- Автоопределение парсера по URL

### 1.5 Обновить CreateReportDTO

Файл: `backend-go/internal/domain/entity/report.go`

- `YandexURL` -> `URL string` (универсальное поле)

### 1.6 Обновить main.go

Файл: `backend-go/cmd/api/main.go`

- Создать оба парсера, зарегистрировать в registry, передать в usecase
- Инициализировать общий chromedp-контекст (пул браузеров)

---

## Этап 2. Настройка chromedp

**Статус:** [x] выполнен

**Цель:** Подключить headless Chrome как движок парсинга.

### 2.1 Добавить зависимость

```bash
go get github.com/chromedp/chromedp
```

### 2.2 Создать общий браузерный менеджер

Файл: `backend-go/internal/infrastructure/parser/browser.go`

- Инициализация headless Chrome с настройками:
  - `--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`
  - User-Agent от реального браузера
  - Таймауты: 30с на страницу, 60с общий
- Пул контекстов для параллельных запросов (опционально)
- Graceful shutdown при завершении приложения

### 2.3 Обновить Dockerfile

```dockerfile
FROM alpine:latest
RUN apk --no-cache add ca-certificates chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROMEDP_NO_SANDBOX=true
```

---

## Этап 3. Парсер Яндекс.Карт через chromedp

**Статус:** [x] выполнен

**Цель:** Реальный сбор отзывов с Яндекс.Карт.

Файл: `backend-go/internal/infrastructure/parser/yandex_parser.go` (рефакторинг)

**Алгоритм:**

1. Открыть `https://yandex.ru/maps/org/{slug}/{oid}/reviews/` в headless Chrome
2. Дождаться загрузки блока отзывов (CSS-селектор контейнера)
3. Скролл вниз для подгрузки новых отзывов (infinite scroll)
4. Повторять скролл пока не загрузятся все отзывы или не достигнут лимит
5. Извлечь из DOM: автор, рейтинг (по звёздам), текст, дата
6. CSS-селекторы (исследовать актуальные на момент реализации):
   - Контейнер отзыва: `.business-reviews-card-view__review`
   - Автор: `.business-reviews-card-view__review-author`
   - Текст: `.business-reviews-card-view__review-text`
   - Рейтинг: считать заполненные звёзды
7. Фильтрация по дате (periodStart - periodEnd)
8. Rate limiting: пауза 2-3с между скроллами

**Валидация URL:**

- Паттерн: `yandex.ru/maps/org/` или `yandex.com/maps/org/`
- Regex для businessId: `/org/[^/]+/(\d+)`

---

## Этап 4. Парсер 2ГИС через chromedp

**Статус:** [x] выполнен

**Цель:** Реальный сбор отзывов с 2ГИС.

Файл: `backend-go/internal/infrastructure/parser/twogis_parser.go`

**Алгоритм:**

1. Открыть `https://2gis.ru/{city}/firm/{firmId}/tab/reviews` в headless Chrome
2. Дождаться загрузки списка отзывов
3. Скролл/пагинация для подгрузки (кнопка "Показать ещё" или infinite scroll)
4. Извлечь из DOM: автор, рейтинг, текст, дата
5. Фильтрация по дате
6. Rate limiting: пауза 2-3с между подгрузками

**Валидация URL:**

- Паттерн: `2gis.ru/*/firm/` или `2gis.com/*/firm/`
- Regex для firmId: `/firm/(\d+)`

---

## Этап 5. Инфраструктура парсинга

**Статус:** [x] выполнен

### 5.1 Rate Limiter

Файл: `backend-go/internal/infrastructure/parser/ratelimiter.go`

- Пауза между запросами к одному домену
- Настройка через env `PARSER_SCROLL_DELAY_MS=2000`

### 5.2 Retry

- При таймауте chromedp — повторная попытка (макс 2 раза)
- При ошибке навигации — вернуть понятную ошибку пользователю

---

## Этап 6. Обновления Frontend

**Статус:** [x] выполнен

### 6.1 Форма создания отчёта

Файл: `frontend/src/pages/reports/ReportsPage.tsx`

- `yandexUrl` -> `url` (универсальное поле)
- Автодетект платформы по URL (бейдж "Яндекс.Карты" / "2ГИС")
- Убрать захардкоженный URL по умолчанию
- Placeholder с примерами обоих URL

### 6.2 API клиент

Файл: `frontend/src/shared/api/reportApi.ts`

- `yandexUrl` -> `url` в `CreateReportDTO`

### 6.3 Типы

Файл: `frontend/src/shared/types/index.ts`

- Обновить интерфейсы при необходимости

### 6.4 Спиннер ожидания

- Парсинг через chromedp занимает 10-30с
- Показать прогресс-индикатор с текстом "Собираем отзывы..."

---

## Этап 7. Улучшения AI-анализа

**Статус:** [x] выполнен

Файл: `backend-go/internal/infrastructure/ai/openrouter.go`

- Улучшить промпт: добавить контекст платформы-источника
- Добавить валидацию ответа (summary не пустой, insights >= 1, avgRating 1-5)
- Добавить env `OPENROUTER_TEMPERATURE=0.3` для стабильности анализа
- При невалидном ответе — один retry с упрощённым промптом
- Модель: Qwen3-Coder free (через OpenRouter)

---

## Этап 8. Docker и конфигурация

**Статус:** [x] выполнен

### 8.1 Dockerfile

- Добавить `chromium` в Alpine-образ
- Увеличить лимиты памяти (chromium ~100-200MB)
- Env: `CHROME_BIN`, `CHROMEDP_NO_SANDBOX`

### 8.2 .env.example

```env
PARSER_SCROLL_DELAY_MS=2000
PARSER_MAX_REVIEWS=200
PARSER_TIMEOUT_SEC=60
OPENROUTER_TEMPERATURE=0.3
```

### 8.3 render.yaml

- Обновить с новыми env-переменными
- Увеличить план (chromium требует больше RAM)

---

## Этап 9. Удаление legacy Node.js бэкенда

**Статус:** [x] выполнен

**Цель:** Полностью перейти на Go-бэкенд, удалить папку `backend/` (Node.js/TypeScript).

### 9.1 Проверить фронтенд

- Проверить все API-вызовы во фронтенде (client.ts, authApi.ts, userApi.ts, reportApi.ts)
- Убедиться что baseURL указывает на Go-бэкенд (порт 3001), а не на Node (если отличается)
- Проверить что все эндпоинты Go-бэкенда совпадают с тем, что вызывает фронтенд
- Проверить схему БД: Go-бэкенд использует свою миграцию или schema.sql из backend/?

### 9.2 Проверить Makefile

- Убрать таргеты связанные с Node.js бэкендом (db-seed и т.д.)
- Обновить `make dev` если он запускает оба бэкенда

### 9.3 Проверить docker-compose / render.yaml

- Убрать ссылки на Node.js бэкенд если есть

### 9.4 Удалить папку backend/

- `rm -rf backend/`
- Перенести schema.sql в backend-go/ если он используется только оттуда

---

## Порядок работы

```
Этап 1 (архитектура парсеров) [x]
  -> Этап 2 (настройка chromedp + Docker) [x]
    -> Этап 3 (парсер Яндекс.Карт) [x]
    -> Этап 4 (парсер 2ГИС) [x]
      -> Этап 5 (rate limit / retry) [x]
        -> Этап 6 (обновление фронтенда) [x]
          -> Этап 7 (улучшение AI) [x]
            -> Этап 8 (финальная конфигурация) [x]
              -> Этап 9 (удаление legacy Node.js бэкенда) [x]
```

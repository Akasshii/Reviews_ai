# Reviews AI - Go Backend

Система анализа отзывов с Яндекс.Карт с использованием AI.

## Технологии

- **Go 1.22+**
- **Gin Web Framework** - HTTP сервер
- **PostgreSQL** - База данных
- **OpenRouter AI** (Qwen3-Coder) - Анализ отзывов
- **JWT** - Аутентификация
- **Clean Architecture** - Архитектурный паттерн

## Структура проекта

```
backend-go/
├── cmd/api/                     # Точка входа приложения
│   └── main.go
├── internal/
│   ├── domain/                  # Бизнес-логика (entities, repository interfaces)
│   │   ├── entity/
│   │   └── repository/
│   ├── application/             # Use cases (бизнес-сценарии)
│   │   └── usecase/
│   ├── infrastructure/          # Внешние зависимости
│   │   ├── database/           # PostgreSQL
│   │   ├── ai/                 # OpenRouter AI
│   │   └── parser/             # Парсер Яндекс.Карт
│   └── presentation/            # HTTP слой
│       ├── handler/            # HTTP handlers
│       └── middleware/         # Middleware (auth, cors)
└── pkg/                         # Утилиты
    └── utils/                   # JWT, password hashing
```

## Установка и запуск

### 1. Установите зависимости

```bash
cd backend-go
go mod download
```

### 2. Настройте PostgreSQL

Создайте базу данных и выполните SQL схему:

```bash
# Создайте базу данных
createdb reviews_ai -U slava

# Примените схему из существующего backend
psql -U slava -d reviews_ai -f ../backend/src/infrastructure/database/schema.sql
```

### 3. Настройте переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Server
PORT=3001
GIN_MODE=release

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=slava
DB_PASSWORD=
DB_NAME=reviews_ai
DB_SSLMODE=disable

# JWT
JWT_SECRET=ваш-секретный-ключ-измените-в-продакшене
JWT_EXPIRES_IN=168h

# CORS
CORS_ORIGIN=http://localhost:5173

# OpenRouter AI - ВСТАВЬТЕ СВОЙ API КЛЮЧ ЗДЕСЬ!
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=qwen/qwen3-coder:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 4. Получите API ключ OpenRouter

1. Зарегистрируйтесь на https://openrouter.ai/
2. Создайте API ключ
3. Вставьте его в `.env` файл в переменную `OPENROUTER_API_KEY`

### 5. Запустите сервер

```bash
# Режим разработки
go run cmd/api/main.go

# Или скомпилируйте и запустите
go build -o bin/server cmd/api/main.go
./bin/server
```

Сервер запустится на `http://localhost:3001`

## API Endpoints

### Публичные

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/health` - Проверка здоровья

### Защищённые (требуют JWT токен в заголовке `Authorization: Bearer <token>`)

**Пользователь:**
- `GET /api/user/profile` - Получить профиль
- `PUT /api/user/profile` - Обновить профиль

**Отчёты:**
- `POST /api/reports` - Создать отчёт (парсинг + AI анализ)
- `GET /api/reports` - Список отчётов
- `GET /api/reports/:id` - Детальный отчёт
- `DELETE /api/reports/:id` - Удалить отчёт

## Создание отчёта

POST запрос на `/api/reports`:

```json
{
  "title": "Анализ отзывов за декабрь",
  "periodStart": "2024-12-01T00:00:00Z",
  "periodEnd": "2024-12-31T23:59:59Z",
  "yandexUrl": "https://yandex.com/maps/org/chaykovsky_park_kultury_i_otdykha/204693811778/reviews/"
}
```

Система автоматически:
1. Спарсит отзывы с Яндекс.Карт
2. Определит sentiment (positive/neutral/negative)
3. Извлечёт категории (quality, service, cleanliness, atmosphere, price)
4. Отправит отзывы в OpenRouter AI для анализа
5. Получит insights и recommendations
6. Сохранит всё в базу данных

## Примечание о парсинге

**Текущая реализация** использует демо-данные для парсинга Яндекс.Карт, так как у Яндекса нет официального публичного API для отзывов и есть защита от веб-скрейпинга.

Для production версии рекомендуется:
1. Использовать официальный API Яндекс.Карт (если доступ получен)
2. Использовать сторонние сервисы парсинга
3. Ручная загрузка отзывов через CSV/JSON файлы

## Тестирование

Создайте тестового пользователя:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

## Архитектура

Проект следует принципам **Clean Architecture**:

- **Domain Layer** - не зависит ни от чего, содержит бизнес-логику
- **Application Layer** - use cases, оркестрирует domain entities
- **Infrastructure Layer** - внешние зависимости (DB, AI, parsers)
- **Presentation Layer** - HTTP handlers, входная точка

Преимущества:
- Легко тестируется
- Независимость от фреймворков
- Независимость от UI
- Независимость от БД
- Независимость от внешних сервисов

## Troubleshooting

### Ошибка подключения к PostgreSQL

Убедитесь что:
- PostgreSQL запущен
- База данных создана
- Пользователь имеет права доступа
- Параметры в `.env` корректны

### Ошибка OpenRouter API

- Проверьте что API ключ вставлен в `.env`
- Проверьте что у вас есть credits на OpenRouter
- При необходимости, система будет работать с базовым анализом без AI

## Лицензия

MIT

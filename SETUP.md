# 🚀 Reviews AI - Инструкция по запуску

Полнофункциональная система для анализа отзывов с Яндекс.Карт с использованием AI.

---

## 📋 Содержание

1. [Требования](#требования)
2. [Быстрый старт](#быстрый-старт)
3. [Подробная настройка](#подробная-настройка)
4. [Использование](#использование)
5. [Структура проекта](#структура-проекта)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Требования

- **Go** 1.22+ (для backend)
- **Node.js** 18+ (для frontend)
- **PostgreSQL** 14+ (база данных)
- **OpenRouter API key** (для AI анализа)

---

## ⚡ Быстрый старт

### 1. Настройка базы данных

```bash
# Создайте базу данных
createdb reviews_ai -U slava

# Примените схему
psql -U slava -d reviews_ai -f backend/src/infrastructure/database/schema.sql

# (Опционально) Добавьте тестовые данные
cd backend
npm install
npm run db:seed
```

### 2. Настройка Backend (Go)

```bash
cd backend-go

# Скопируйте .env файл (он уже создан)
# Откройте .env и вставьте ваш OpenRouter API ключ:
# OPENROUTER_API_KEY=ваш-ключ-здесь

# Получите ключ на https://openrouter.ai/

# Установите зависимости
go mod download

# Запустите сервер
go run cmd/api/main.go
```

Backend запустится на `http://localhost:3001`

### 3. Настройка Frontend (React)

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

Frontend запустится на `http://localhost:5173`

---

## 🔧 Подробная настройка

### Конфигурация Backend

Файл: `backend-go/.env`

```env
# Сервер
PORT=3001
GIN_MODE=debug  # production для продакшена

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USER=slava
DB_PASSWORD=          # Оставьте пустым если нет пароля
DB_NAME=reviews_ai
DB_SSLMODE=disable

# JWT
JWT_SECRET=измените-этот-секрет-в-продакшене
JWT_EXPIRES_IN=168h  # 7 дней

# CORS
CORS_ORIGIN=http://localhost:5173

# OpenRouter AI - ВАЖНО: ВСТАВЬТЕ ВАШ КЛЮЧ!
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=qwen/qwen3-coder:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Получение OpenRouter API ключа

1. Зайдите на https://openrouter.ai/
2. Зарегистрируйтесь или войдите
3. Перейдите в Settings → API Keys
4. Создайте новый ключ
5. Скопируйте ключ и вставьте в `.env` файл в переменную `OPENROUTER_API_KEY`

**Важно:** Без API ключа система будет работать с базовым анализом без AI.

---

## 📖 Использование

### 1. Регистрация/Вход

Откройте http://localhost:5173 и войдите:

- **Email:** demo@reviews.ai
- **Password:** password123

Или зарегистрируйте нового пользователя.

### 2. Создание отчёта

1. Нажмите **"Создать отчёт"**
2. Заполните форму:
   - **Название:** например "Анализ за декабрь 2024"
   - **URL Яндекс.Карт:** https://yandex.com/maps/org/chaykovsky_park_kultury_i_otdykha/204693811778/reviews/
   - **Период:** выберите даты начала и конца
3. Нажмите **"Создать отчёт"**

Система автоматически:
- Спарсит отзывы с Яндекс.Карт (демо данные)
- Определит sentiment (positive/neutral/negative)
- Извлечёт категории (quality, service, cleanliness, atmosphere, price)
- Отправит данные в OpenRouter AI
- Получит insights и recommendations
- Сохранит отчёт в базу

### 3. Просмотр отчётов

- Список всех отчётов на странице `/reports`
- Детальный просмотр по клику на отчёт
- Статистика, диаграммы, отзывы, рекомендации

---

## 📁 Структура проекта

```
Reviews_ai/
├── backend-go/               # Go Backend (Clean Architecture)
│   ├── cmd/api/             # Entry point
│   ├── internal/
│   │   ├── domain/          # Entities, Repository interfaces
│   │   ├── application/     # Use cases (business logic)
│   │   ├── infrastructure/  # DB, AI, Parser
│   │   └── presentation/    # HTTP handlers, middleware
│   └── pkg/                 # Utilities (JWT, password)
│
├── frontend/                # React 19 Frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── widgets/        # Complex UI widgets
│   │   ├── shared/         # Shared components & API
│   │   └── app/            # App config & routing
│   └── public/
│
└── backend/                 # Old Node.js backend (для схемы БД)
    └── src/infrastructure/database/schema.sql
```

---

## 🔍 Troubleshooting

### Backend не запускается

**Ошибка:** `Failed to connect to database`

**Решение:**
```bash
# Проверьте что PostgreSQL запущен
psql -U slava -d reviews_ai -c "SELECT 1;"

# Если ошибка - создайте базу
createdb reviews_ai -U slava
```

**Ошибка:** `go: module ... not found`

**Решение:**
```bash
cd backend-go
go mod download
go mod tidy
```

### Frontend не подключается к Backend

**Проверьте:**
1. Backend запущен на порту 3001
2. В `frontend/src/shared/api/client.ts` базовый URL: `http://localhost:3001/api`
3. CORS настроен в backend `.env`: `CORS_ORIGIN=http://localhost:5173`

### OpenRouter API не работает

**Проверьте:**
1. API ключ вставлен в `.env`: `OPENROUTER_API_KEY=sk-or-...`
2. У вас есть credits на https://openrouter.ai/
3. Интернет соединение работает

**Без API ключа:** Система будет работать с базовым анализом.

### Парсинг отзывов не работает

**Примечание:** Текущая версия использует **демо-данные** для парсинга, так как у Яндекс.Карт нет публичного API для отзывов.

Для production:
- Используйте официальный API (если есть доступ)
- Используйте сторонние сервисы парсинга
- Ручная загрузка отзывов через CSV/JSON

---

## 🎯 API Endpoints

### Публичные
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/health` - Проверка здоровья

### Защищённые (требуют JWT токен)
- `GET /api/user/profile` - Профиль
- `PUT /api/user/profile` - Обновить профиль
- `POST /api/reports` - Создать отчёт
- `GET /api/reports` - Список отчётов
- `GET /api/reports/:id` - Детальный отчёт
- `DELETE /api/reports/:id` - Удалить отчёт

---

## 🏗️ Архитектура

**Backend (Go):** Clean Architecture
- **Domain** - бизнес-логика, независима от всего
- **Application** - use cases, оркестрирует domain
- **Infrastructure** - внешние зависимости (DB, AI, parser)
- **Presentation** - HTTP handlers

**Frontend (React):** Feature-Sliced Design
- **Pages** - страницы приложения
- **Widgets** - сложные UI компоненты
- **Shared** - переиспользуемые компоненты и API

---

## 📝 Примечания

1. **Безопасность:** В production обязательно измените `JWT_SECRET` на случайную строку
2. **Парсинг:** Для production нужен реальный парсер Яндекс.Карт
3. **AI:** Модель `qwen/qwen3-coder:free` бесплатная, но есть лимиты
4. **База данных:** Регулярно делайте бэкапы

---

## 🤝 Поддержка

При проблемах проверьте:
1. Логи backend в консоли
2. Логи frontend в консоли браузера (F12)
3. База данных доступна
4. Все зависимости установлены
5. .env файлы настроены

---

## ✨ Готово!

Теперь у вас есть полнофункциональная система анализа отзывов с AI!

**Следующие шаги:**
1. Вставьте ваш OpenRouter API ключ в `backend-go/.env`
2. Запустите backend и frontend
3. Создайте первый отчёт
4. Наслаждайтесь AI анализом отзывов!

# Reviews AI Backend

Backend для системы анализа отзывов с PostgreSQL и JWT авторизацией.

## Архитектура

Проект построен на принципах чистой архитектуры (Clean Architecture):

```
src/
├── domain/           # Бизнес-логика и сущности
│   ├── entities/     # Сущности (User, Report, Review)
│   └── repositories/ # Интерфейсы репозиториев
├── application/      # Бизнес-сценарии (Use Cases)
│   └── use-cases/    # Сценарии использования
├── infrastructure/   # Внешние зависимости
│   ├── database/     # PostgreSQL
│   └── repositories/ # Реализация репозиториев
└── presentation/     # API слой
    ├── controllers/  # Контроллеры
    ├── routes/       # Маршруты
    └── middleware/   # Middleware (auth)
```

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка PostgreSQL

### macOS (с Homebrew)

```bash
brew install postgresql@14
brew services start postgresql@14

# Создать базу данных
createdb reviews_ai
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запустить PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создать пользователя и базу данных
sudo -u postgres psql
CREATE DATABASE reviews_ai;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE reviews_ai TO postgres;
\q
```

### Windows

1. Скачать PostgreSQL с https://www.postgresql.org/download/windows/
2. Установить с настройками по умолчанию
3. Использовать pgAdmin для создания базы данных `reviews_ai`

## Установка зависимостей

```bash
npm install
```

## Настройка

Скопируйте `.env.example` в `.env` и настройте параметры:

```bash
cp .env.example .env
```

Параметры в `.env`:
- `DB_HOST` - хост PostgreSQL (по умолчанию localhost)
- `DB_PORT` - порт PostgreSQL (по умолчанию 5432)
- `DB_NAME` - имя базы данных
- `DB_USER` - пользователь PostgreSQL
- `DB_PASSWORD` - пароль
- `JWT_SECRET` - секретный ключ для JWT
- `PORT` - порт API сервера

## Инициализация базы данных

```bash
# Создать таблицы и заполнить тестовыми данными
npm run db:setup
```

Или по отдельности:

```bash
# Только создать структуру таблиц
npm run db:init

# Только добавить тестовые данные
npm run db:seed
```

## Запуск

### Development режим (с hot reload)

```bash
npm run dev
```

### Production режим

```bash
npm run build
npm start
```

## Тестовые данные

После выполнения `npm run db:setup` будет создан тестовый пользователь:

```
Email: demo@reviews.ai
Password: password123
```

И 3 отчета с отзывами за последние месяцы.

## API Endpoints

### Авторизация

- `POST /api/auth/register` - Регистрация
  ```json
  {
    "email": "user@example.com",
    "password": "password",
    "name": "Имя"
  }
  ```

- `POST /api/auth/login` - Вход
  ```json
  {
    "email": "demo@reviews.ai",
    "password": "password123"
  }
  ```

### Пользователь (требуется токен)

- `GET /api/user/profile` - Получить профиль
- `PUT /api/user/profile` - Обновить профиль
  ```json
  {
    "name": "Новое имя",
    "company": "Компания",
    "position": "Должность"
  }
  ```

### Отчеты (требуется токен)

- `GET /api/reports` - Список всех отчетов пользователя
- `GET /api/reports/:id` - Детальный отчет с отзывами и статистикой

### Health Check

- `GET /api/health` - Проверка работы API

## Авторизация

Используйте JWT токен в заголовке Authorization:

```
Authorization: Bearer <token>
```

## Структура БД

### Таблицы

- `users` - Пользователи
- `reports` - Отчеты
- `reviews` - Отзывы
- `category_stats` - Статистика по категориям

Схема БД находится в `src/infrastructure/database/schema.sql`

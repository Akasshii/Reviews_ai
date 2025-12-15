# Reviews AI - Frontend

Современное веб-приложение для автоматического сбора и анализа отзывов с Яндекс.Карт и 2ГИС.

## 🚀 Технологии

- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **React Router** - роутинг
- **Date-fns** - работа с датами
- **FSD Architecture** - архитектура проекта

## 📁 Структура проекта (FSD)

```
src/
├── app/                    # Инициализация приложения
│   ├── layouts/           # Layouts
│   ├── providers/         # Провайдеры (роутер, etc.)
│   └── styles/            # Глобальные стили
├── pages/                 # Страницы приложения
│   ├── login/            # Страница авторизации
│   ├── dashboard/        # Главная панель
│   ├── reports/          # Список отчетов
│   ├── profile/          # Профиль пользователя
│   └── settings/         # Настройки
├── widgets/              # Составные блоки
│   ├── header/          # Шапка приложения
│   ├── sidebar/         # Боковое меню
│   └── stats-card/      # Карточка статистики
├── features/            # Функциональные возможности
│   ├── auth/           # Авторизация
│   └── report-generator/ # Генерация отчетов
├── entities/            # Бизнес-сущности
│   ├── user/           # Пользователь
│   ├── report/         # Отчет
│   └── review/         # Отзыв
└── shared/             # Переиспользуемые модули
    ├── ui/            # UI компоненты
    ├── lib/           # Вспомогательные функции
    ├── types/         # Типы TypeScript
    └── config/        # Конфигурация
```

## 🎨 Компоненты UI

- **Button** - кнопки с различными вариантами (primary, secondary, outline, ghost, danger)
- **Card** - карточки для контента
- **Input** - поля ввода
- **Icon** - SVG иконки

## 🔥 Возможности

- ✅ Авторизация (демо режим)
- ✅ Dashboard с статистикой
- ✅ Управление отчетами
- ✅ Фильтрация по платформам
- ✅ Профиль пользователя
- ✅ Настройки системы
- ✅ Адаптивный дизайн

## 🛠 Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Предпросмотр production сборки
npm run preview
```

## 🎯 Demo данные

Для входа используйте любой email и пароль.
Приложение использует mock данные для демонстрации функционала.

## 📝 Особенности реализации

- **FSD архитектура** - четкое разделение слоев
- **TypeScript** - полная типизация
- **CSS переменные** - легкая кастомизация темы
- **Responsive Design** - адаптивность под все устройства
- **Mock данные** - готовые данные для демонстрации

## 🎨 Цветовая схема

Проект использует современную цветовую схему:
- Primary: `#6366f1` (индиго)
- Secondary: `#8b5cf6` (фиолетовый)
- Success: `#10b981` (зеленый)
- Warning: `#f59e0b` (оранжевый)
- Error: `#ef4444` (красный)

## 📱 Страницы

1. **Login** - Страница авторизации
2. **Dashboard** - Главная страница со статистикой
3. **Reports** - Список всех отчетов с фильтрацией
4. **Profile** - Профиль пользователя
5. **Settings** - Настройки системы

## 🚧 Roadmap

- [ ] Интеграция с реальным API
- [ ] Реальная генерация отчетов с AI
- [ ] Экспорт отчетов в PDF
- [ ] Уведомления в реальном времени
- [ ] Темная тема
- [ ] Мультиязычность

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


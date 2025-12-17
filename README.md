# Reviews AI 🤖

**Система автоматического анализа отзывов с использованием искусственного интеллекта**

Приложение собирает отзывы с Яндекс.Карт, анализирует их с помощью AI и генерирует детальные отчёты с рекомендациями по улучшению бизнеса.

---

## ⚡ СИСТЕМА ГОТОВА К РАБОТЕ!

**✅ Все ошибки исправлены**
**✅ Frontend подключен к Go backend**
**✅ Аутентификация работает**
**✅ Создание отчётов работает**

### Запуск прямо сейчас:

```bash
# 1. Запустите Go backend
cd backend-go && go run cmd/api/main.go

# 2. Откройте http://localhost:5173

# 3. Войдите (уже предзаполнено):
#    Email: demo@reviews.ai
#    Password: password123

# 4. Создайте отчёт!
```

📖 **Подробные инструкции:** [FINAL_INSTRUCTIONS.md](./FINAL_INSTRUCTIONS.md)
📋 **Что исправлено:** [FIXES_APPLIED.md](./FIXES_APPLIED.md)

---

## 🎯 Возможности

✨ **Сбор отзывов** - парсинг отзывов с Яндекс.Карт по URL
🤖 **AI Анализ** - автоматический анализ с помощью OpenRouter AI (Qwen3-Coder)
📊 **Визуализация** - графики, диаграммы, статистика
💡 **Insights** - ключевые инсайты из отзывов
🎯 **Рекомендации** - практические советы для улучшения
📈 **Категории** - анализ по категориям (качество, сервис, чистота, атмосфера, цены)
😊 **Sentiment** - определение тональности отзывов

---

## 🚀 Установка (первый раз)

### 1. Установка

```bash
# Клонируйте репозиторий
git clone <your-repo>
cd optimistic-wescoff

# Создайте базу данных PostgreSQL
createdb reviews_ai -U slava
psql -U slava -d reviews_ai -f schema.sql
```

### 2. Backend (Go)

```bash
cd backend-go

# Установите зависимости
go mod download

# Настройте .env (вставьте OpenRouter API ключ!)
# OPENROUTER_API_KEY=your-key-here

# Запустите сервер
go run cmd/api/main.go
```

### 3. Frontend (React)

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

### 4. Откройте приложение

Перейдите на http://localhost:5173

---

## 📖 Документация

**Полная инструкция:** [SETUP.md](./SETUP.md)
**Backend документация:** [backend-go/README.md](./backend-go/README.md)

---

## 🛠️ Технологии

### Backend
- **Go 1.22+** - основной язык
- **Gin** - HTTP framework
- **PostgreSQL** - база данных
- **OpenRouter AI** - анализ отзывов
- **Clean Architecture** - архитектурный паттерн

### Frontend
- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Vite** - build tool
- **Feature-Sliced Design** - архитектура

---

## 📁 Структура

```
Reviews_ai/
├── backend-go/          # Go Backend (Clean Architecture)
│   ├── cmd/api/        # Entry point
│   ├── internal/       # Application code
│   │   ├── domain/     # Business logic
│   │   ├── application/# Use cases
│   │   ├── infrastructure/ # External services
│   │   └── presentation/   # HTTP layer
│   └── pkg/            # Utilities
│
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── pages/     # Pages
│   │   ├── widgets/   # Complex components
│   │   └── shared/    # Shared code & API
│   └── public/
│
└── SETUP.md           # Подробная инструкция
```

---

## 🔑 Важно: OpenRouter API

Для работы AI анализа необходим API ключ от OpenRouter:

1. Зарегистрируйтесь на https://openrouter.ai/
2. Создайте API ключ
3. Вставьте в `backend-go/.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-ваш-ключ
   ```

**Без ключа:** система будет работать с базовым анализом без AI.

---

## 📊 Как это работает

1. **Пользователь создаёт отчёт** - указывает URL Яндекс.Карт и период
2. **Система парсит отзывы** - извлекает отзывы за указанный период
3. **Анализ sentiment** - определяет положительные/нейтральные/отрицательные
4. **Извлечение категорий** - качество, сервис, чистота, атмосфера, цены
5. **AI анализ** - OpenRouter AI генерирует insights и рекомендации
6. **Визуализация** - отчёт с графиками и статистикой

---

## 🎨 Скриншоты

- **Dashboard** - общая статистика и последние отзывы
- **Отчёты** - список всех отчётов с фильтрацией
- **Детальный отчёт** - полный анализ с графиками и рекомендациями

---

## 🔐 Безопасность

- JWT аутентификация
- Bcrypt для паролей
- CORS защита
- Валидация данных

---

## 📝 Примечание о парсинге

Текущая версия использует **демо-данные** для тестирования, так как:
- У Яндекс.Карт нет публичного API для отзывов
- Требуется защита от anti-scraping систем

Для production версии рекомендуется:
- Официальный API Яндекса (если есть доступ)
- Сторонние сервисы парсинга
- Ручная загрузка отзывов

---

## 🤝 Вклад

Проект использует Clean Architecture и принципы SOLID для лёгкой расширяемости.

---

## 📄 Лицензия

MIT

---

## 🚀 Начните сейчас!

```bash
# 1. Создайте базу данных
createdb reviews_ai -U slava

# 2. Примените схему
psql -U slava -d reviews_ai -f schema.sql

# 3. Запустите backend
cd backend-go && go run cmd/api/main.go

# 4. Запустите frontend (в новом терминале)
cd frontend && npm run dev

# 5. Откройте http://localhost:5173
```

**Не забудьте вставить OpenRouter API ключ в `backend-go/.env`!**

---

Made with ❤️ using Go, React and AI

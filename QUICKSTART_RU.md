# ⚡ Быстрый запуск Reviews AI

## 📌 За 5 минут до первого отчёта!

### 1️⃣ База данных (30 сек)

```bash
# Создайте базу
createdb reviews_ai -U slava

# Примените схему
psql -U slava -d reviews_ai -f backend/src/infrastructure/database/schema.sql
```

### 2️⃣ Backend (1 мин)

```bash
cd backend-go

# Установите зависимости
go mod download

# ВАЖНО: Откройте .env и вставьте API ключ OpenRouter!
# Получите ключ на https://openrouter.ai/
# OPENROUTER_API_KEY=sk-or-v1-ваш-ключ

# Запустите сервер
go run cmd/api/main.go
```

Backend запущен на http://localhost:3001 ✅

### 3️⃣ Frontend (1 мин)

```bash
# В новом терминале
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

Frontend запущен на http://localhost:5173 ✅

### 4️⃣ Готово! 🎉

Откройте http://localhost:5173

**Тестовый пользователь:**
- Email: demo@reviews.ai
- Пароль: password123

Или создайте нового пользователя!

---

## 🚀 Создание первого отчёта

1. Войдите в систему
2. Нажмите **"Создать отчёт"**
3. Заполните:
   - **Название:** "Тестовый отчёт"
   - **URL:** https://yandex.com/maps/org/chaykovsky_park_kultury_i_otdykha/204693811778/reviews/
   - **Период:** выберите последний месяц
4. Нажмите **"Создать отчёт"**
5. Подождите 10-30 секунд (AI анализ)
6. Готово! Смотрите отчёт с insights и recommendations!

---

## ⚠️ Важные моменты

### OpenRouter API ключ

**Обязательно** вставьте API ключ в `backend-go/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ
```

Получите бесплатный ключ на https://openrouter.ai/

**Без ключа:** система работает с базовым анализом (без AI).

### Парсинг отзывов

Текущая версия использует **демо-данные** для парсинга.

Вы получите ~10 тестовых отзывов для анализа.

---

## 🛠️ Если что-то не работает

### Backend не запускается

```bash
# Проверьте Go
go version  # Должно быть 1.22+

# Проверьте базу данных
psql -U slava -d reviews_ai -c "SELECT 1;"

# Переустановите зависимости
go mod tidy
```

### Frontend не запускается

```bash
# Проверьте Node.js
node --version  # Должно быть 18+

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Не работает создание отчётов

1. Проверьте что backend запущен (http://localhost:3001/api/health)
2. Проверьте консоль браузера (F12) на ошибки
3. Проверьте что OpenRouter API ключ вставлен
4. Проверьте логи backend в терминале

---

## 📖 Дополнительная информация

- **Полная инструкция:** [SETUP.md](./SETUP.md)
- **Настройка API ключа:** [backend-go/API_KEY_SETUP.md](./backend-go/API_KEY_SETUP.md)
- **Backend документация:** [backend-go/README.md](./backend-go/README.md)

---

## 🎯 Что дальше?

1. ✅ Создайте несколько отчётов
2. ✅ Изучите AI рекомендации
3. ✅ Попробуйте разные периоды
4. ✅ Настройте свой URL Яндекс.Карт

---

## 💡 Совет

Для production версии:
- Измените `JWT_SECRET` в `.env`
- Настройте реальный парсинг Яндекс.Карт
- Используйте HTTPS
- Настройте мониторинг

---

**Готово! Наслаждайтесь AI анализом отзывов!** 🚀

.PHONY: help setup db-create db-schema db-seed backend frontend dev clean

help:
	@echo "Reviews AI - Makefile команды"
	@echo ""
	@echo "Доступные команды:"
	@echo "  make setup      - Полная установка проекта"
	@echo "  make db-create  - Создать базу данных"
	@echo "  make db-schema  - Применить схему БД"
	@echo "  make db-seed    - Заполнить тестовыми данными"
	@echo "  make backend    - Запустить Go backend"
	@echo "  make frontend   - Запустить React frontend"
	@echo "  make dev        - Запустить оба сервера параллельно"
	@echo "  make clean      - Очистить временные файлы"
	@echo ""

setup: db-create db-schema
	@echo "✅ База данных настроена"
	@echo "📦 Устанавливаю Go зависимости..."
	cd backend-go && go mod download
	@echo "📦 Устанавливаю Node зависимости..."
	cd frontend && npm install
	@echo ""
	@echo "✅ Проект готов к запуску!"
	@echo ""
	@echo "⚠️  ВАЖНО: Не забудьте вставить OpenRouter API ключ в backend-go/.env"
	@echo "    Получите ключ на https://openrouter.ai/"
	@echo ""
	@echo "Запустите: make dev"

db-create:
	@echo "📊 Создаю базу данных reviews_ai..."
	createdb reviews_ai -U slava || echo "База уже существует"

db-schema:
	@echo "📋 Применяю схему базы данных..."
	psql -U slava -d reviews_ai -f schema.sql

db-seed:
	@echo "🌱 Заполняю базу тестовыми данными..."
	cd backend && npm install && npm run db:seed

backend:
	@echo "🚀 Запускаю Go backend на http://localhost:3001..."
	cd backend-go && go run cmd/api/main.go

frontend:
	@echo "🚀 Запускаю React frontend на http://localhost:5173..."
	cd frontend && npm run dev

dev:
	@echo "🚀 Запускаю backend и frontend..."
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	make -j2 backend frontend

clean:
	@echo "🧹 Очищаю временные файлы..."
	rm -rf backend-go/bin
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
	@echo "✅ Готово"

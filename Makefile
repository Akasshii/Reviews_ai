.PHONY: help setup env db-create db-schema db-reset backend frontend dev build lint docker-build docker-run clean logs health

# Цвета для вывода
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
NC     := \033[0m

help:
	@echo ""
	@echo "$(CYAN)Reviews AI$(NC) - Makefile команды"
	@echo ""
	@echo "$(GREEN)Быстрый старт:$(NC)"
	@echo "  make setup          Полная установка (БД + зависимости + .env)"
	@echo "  make dev            Запустить backend + frontend"
	@echo ""
	@echo "$(GREEN)Сервисы:$(NC)"
	@echo "  make backend        Запустить Go backend (localhost:3001)"
	@echo "  make frontend       Запустить React frontend (localhost:5173)"
	@echo "  make build          Собрать оба проекта (проверка компиляции)"
	@echo ""
	@echo "$(GREEN)База данных:$(NC)"
	@echo "  make db-create      Создать БД reviews_ai"
	@echo "  make db-schema      Применить схему"
	@echo "  make db-reset       Пересоздать БД с нуля"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@echo "  make docker-build   Собрать Docker образ"
	@echo "  make docker-run     Запустить в Docker"
	@echo ""
	@echo "$(GREEN)Утилиты:$(NC)"
	@echo "  make health         Проверить что backend отвечает"
	@echo "  make logs           Показать логи backend (если в Docker)"
	@echo "  make lint           Проверить код (go vet + tsc)"
	@echo "  make clean          Очистить временные файлы"
	@echo ""

# === Быстрый старт ===

setup: db-create db-schema env
	@echo "$(CYAN)Устанавливаю Go зависимости...$(NC)"
	cd backend-go && go mod download
	@echo "$(CYAN)Устанавливаю Node зависимости...$(NC)"
	cd frontend && npm install
	@echo ""
	@echo "$(GREEN)Проект готов!$(NC)"
	@echo ""
	@echo "$(YELLOW)ВАЖНО: Откройте backend-go/.env и вставьте OPENROUTER_API_KEY$(NC)"
	@echo "  Получите бесплатный ключ: https://openrouter.ai/"
	@echo ""
	@echo "Запуск: make dev"

env:
	@if [ ! -f backend-go/.env ]; then \
		cp backend-go/.env.example backend-go/.env; \
		echo "$(GREEN)Создан backend-go/.env из .env.example$(NC)"; \
	else \
		echo "backend-go/.env уже существует, пропускаю"; \
	fi

# === Сервисы ===

backend:
	@echo "$(CYAN)Go backend → http://localhost:3001$(NC)"
	cd backend-go && go run cmd/api/main.go

frontend:
	@echo "$(CYAN)React frontend → http://localhost:5173$(NC)"
	cd frontend && npm run dev

dev:
	@echo "$(CYAN)Запускаю backend + frontend...$(NC)"
	@echo "  Backend:  http://localhost:3001"
	@echo "  Frontend: http://localhost:5173"
	@echo ""
	@make -j2 backend frontend

# === Сборка и проверка ===

build:
	@echo "$(CYAN)Собираю Go backend...$(NC)"
	cd backend-go && go build -o bin/api ./cmd/api
	@echo "$(GREEN)Backend OK$(NC)"
	@echo "$(CYAN)Собираю React frontend...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)Frontend OK$(NC)"

lint:
	@echo "$(CYAN)Проверяю Go код...$(NC)"
	cd backend-go && go vet ./...
	@echo "$(GREEN)Go OK$(NC)"
	@echo "$(CYAN)Проверяю TypeScript...$(NC)"
	cd frontend && npx tsc --noEmit
	@echo "$(GREEN)TypeScript OK$(NC)"

# === База данных ===

db-create:
	@echo "$(CYAN)Создаю БД reviews_ai...$(NC)"
	@createdb reviews_ai -U slava 2>/dev/null && echo "$(GREEN)БД создана$(NC)" || echo "$(YELLOW)БД уже существует$(NC)"

db-schema:
	@echo "$(CYAN)Применяю схему...$(NC)"
	psql -U slava -d reviews_ai -f backend-go/migrations/schema.sql
	@echo "$(GREEN)Схема применена$(NC)"

db-reset:
	@echo "$(YELLOW)Пересоздаю БД с нуля...$(NC)"
	@dropdb reviews_ai -U slava 2>/dev/null || true
	@make db-create
	@make db-schema
	@echo "$(GREEN)БД пересоздана$(NC)"

# === Docker ===

docker-build:
	@echo "$(CYAN)Собираю Docker образ...$(NC)"
	cd backend-go && docker build -t reviews-ai .
	@echo "$(GREEN)Образ reviews-ai собран$(NC)"

docker-run:
	@echo "$(CYAN)Запускаю в Docker на порту 3001...$(NC)"
	docker run --rm -p 3001:3001 --env-file backend-go/.env --name reviews-ai reviews-ai

# === Утилиты ===

health:
	@curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || echo "$(YELLOW)Backend не отвечает. Запущен ли он?$(NC)"

logs:
	@docker logs -f reviews-ai 2>/dev/null || echo "$(YELLOW)Docker контейнер не запущен$(NC)"

clean:
	@echo "$(CYAN)Очищаю...$(NC)"
	rm -rf backend-go/bin
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
	@echo "$(GREEN)Готово$(NC)"

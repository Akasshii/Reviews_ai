package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"reviews-ai/internal/domain/entity"
	"strconv"
	"strings"
	"time"
)

type OpenRouterClient struct {
	apiKey      string
	baseURL     string
	model       string
	temperature float64
	client      *http.Client
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type ChatResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type AnalysisResult struct {
	Summary         string
	Insights        []string
	Recommendations []string
	Categories      map[string]entity.CategoryStat
}

func NewOpenRouterClient() *OpenRouterClient {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: OPENROUTER_API_KEY not set, AI analysis will use fallback mode")
	}

	temperature := 0.3
	if v := os.Getenv("OPENROUTER_TEMPERATURE"); v != "" {
		if t, err := strconv.ParseFloat(v, 64); err == nil {
			temperature = t
		}
	}

	return &OpenRouterClient{
		apiKey:      apiKey,
		baseURL:     getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
		model:       getEnv("OPENROUTER_MODEL", "qwen/qwen3-coder:free"),
		temperature: temperature,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (c *OpenRouterClient) AnalyzeReviews(reviews []entity.Review) (*AnalysisResult, error) {
	if len(reviews) == 0 {
		return &AnalysisResult{
			Summary:         "Нет отзывов для анализа",
			Insights:        []string{"Недостаточно данных для анализа"},
			Recommendations: []string{"Соберите больше отзывов"},
			Categories:      make(map[string]entity.CategoryStat),
		}, nil
	}

	// Detect platform from reviews
	source := detectSource(reviews)
	prompt := c.buildAnalysisPrompt(reviews, source)

	result, err := c.callAI(prompt)
	if err != nil {
		log.Printf("[AI] callAI error: %v", err)
		return nil, err
	}
	log.Printf("[AI] Response length: %d chars", len(result))

	parsed, valid := c.parseAndValidate(result, reviews)
	if valid {
		log.Println("[AI] Analysis parsed successfully")
		return parsed, nil
	}

	// Retry with simplified prompt
	log.Printf("[AI] Response validation failed, retrying with simplified prompt. Response preview: %.200s", result)
	simplePrompt := c.buildSimplifiedPrompt(reviews, source)
	result, err = c.callAI(simplePrompt)
	if err != nil {
		return c.createBasicAnalysis(reviews), nil
	}

	parsed, valid = c.parseAndValidate(result, reviews)
	if valid {
		return parsed, nil
	}

	return c.createBasicAnalysis(reviews), nil
}

func (c *OpenRouterClient) callAI(prompt string) (string, error) {
	req := ChatRequest{
		Model:       c.model,
		Temperature: c.temperature,
		Messages: []ChatMessage{
			{
				Role:    "system",
				Content: "Ты - эксперт по анализу отзывов клиентов. Твоя задача - проанализировать отзывы и дать четкие рекомендации. ВАЖНО: Отвечай ТОЛЬКО валидным JSON без дополнительного текста, без markdown-блоков. Используй русский язык для текста внутри JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return chatResp.Choices[0].Message.Content, nil
}

func detectSource(reviews []entity.Review) string {
	sources := make(map[string]int)
	for _, r := range reviews {
		sources[r.Source]++
	}
	best := ""
	bestCount := 0
	for s, count := range sources {
		if count > bestCount {
			best = s
			bestCount = count
		}
	}
	return best
}

func platformDescription(source string) string {
	switch source {
	case "yandex":
		return "Яндекс.Карты (аудитория: широкая российская аудитория, часто оставляют подробные отзывы с фото, склонны оценивать общий опыт)"
	case "2gis":
		return "2ГИС (аудитория: пользователи навигатора, чаще пишут короткие практичные отзывы, фокусируются на локации и доступности)"
	default:
		return "неизвестная платформа"
	}
}

func (c *OpenRouterClient) buildAnalysisPrompt(reviews []entity.Review, source string) string {
	var sb strings.Builder

	sb.WriteString("Проанализируй следующие отзывы клиентов и предоставь детальный анализ.\n\n")
	sb.WriteString(fmt.Sprintf("Платформа-источник: %s\n", platformDescription(source)))
	sb.WriteString("Учитывай специфику аудитории платформы при анализе.\n\n")
	sb.WriteString(fmt.Sprintf("Всего отзывов: %d\n\n", len(reviews)))

	sb.WriteString("ПЛАН АНАЛИЗА:\n")
	sb.WriteString("1. Сначала определи основные темы, которые упоминаются в отзывах\n")
	sb.WriteString("2. Затем проанализируй каждую тему: частота упоминаний, тональность, оценки\n")
	sb.WriteString("3. Сформулируй выводы и рекомендации на основе анализа тем\n\n")

	sb.WriteString("ОТЗЫВЫ:\n")

	for i, review := range reviews {
		if i >= 50 {
			sb.WriteString(fmt.Sprintf("\n... и ещё %d отзывов\n", len(reviews)-50))
			break
		}
		sb.WriteString(fmt.Sprintf("\n%d. Автор: %s\n", i+1, review.Author))
		sb.WriteString(fmt.Sprintf("   Оценка: %d/5\n", review.Rating))
		sb.WriteString(fmt.Sprintf("   Отзыв: %s\n", review.Text))
		sb.WriteString(fmt.Sprintf("   Дата: %s\n", review.Date.Format("2006-01-02")))
	}

	sb.WriteString("\n\nТвоя задача:\n")
	sb.WriteString("1. Создай краткое резюме (2-3 предложения)\n")
	sb.WriteString("2. Выдели ключевые инсайты (3-5 пунктов)\n")
	sb.WriteString("3. Дай практические рекомендации (3-5 пунктов)\n")
	sb.WriteString("4. Определи категории отзывов: quality (качество), service (обслуживание), cleanliness (чистота), atmosphere (атмосфера), price (цена)\n")
	sb.WriteString("   Для каждой категории укажи количество упоминаний (mentions > 0) и среднюю оценку (avgRating от 1.0 до 5.0)\n\n")

	sb.WriteString("Верни ответ СТРОГО в следующем JSON формате (без markdown, без ```json):\n")
	sb.WriteString(`{
  "summary": "Заведение получает преимущественно положительные отзывы. Клиенты хвалят качество блюд и атмосферу, но отмечают медленное обслуживание в часы пик.",
  "insights": [
    "80% отзывов положительные (4-5 звёзд)",
    "Основная претензия — время ожидания заказа",
    "Клиенты особенно ценят авторские блюда"
  ],
  "recommendations": [
    "Оптимизировать работу кухни в пиковые часы",
    "Добавить систему предзаказа для популярных блюд",
    "Продолжать развивать авторское меню"
  ],
  "categories": {
    "quality": {"mentions": 15, "avgRating": 4.5},
    "service": {"mentions": 12, "avgRating": 3.8},
    "atmosphere": {"mentions": 8, "avgRating": 4.7}
  }
}`)

	return sb.String()
}

func (c *OpenRouterClient) buildSimplifiedPrompt(reviews []entity.Review, source string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Проанализируй %d отзывов с платформы %s.\n\n", len(reviews), source))

	for i, review := range reviews {
		if i >= 30 {
			break
		}
		sb.WriteString(fmt.Sprintf("%d. [%d/5] %s\n", i+1, review.Rating, review.Text))
	}

	sb.WriteString("\nОтветь JSON (без markdown, без ```json):\n")
	sb.WriteString(`{"summary":"резюме 2-3 предложения","insights":["инсайт1","инсайт2","инсайт3"],"recommendations":["рек1","рек2","рек3"],"categories":{"quality":{"mentions":1,"avgRating":4.0}}}`)

	return sb.String()
}

func (c *OpenRouterClient) parseAndValidate(content string, reviews []entity.Review) (*AnalysisResult, bool) {
	result, err := c.parseAIResponse(content, reviews)
	if err != nil {
		return nil, false
	}
	return result, c.validateResult(result)
}

func (c *OpenRouterClient) validateResult(result *AnalysisResult) bool {
	if strings.TrimSpace(result.Summary) == "" {
		return false
	}
	if len(result.Insights) < 1 {
		return false
	}
	for _, cat := range result.Categories {
		if cat.Count <= 0 {
			return false
		}
		if cat.AverageRating < 1.0 || cat.AverageRating > 5.0 {
			return false
		}
	}
	return true
}

func (c *OpenRouterClient) parseAIResponse(content string, reviews []entity.Review) (*AnalysisResult, error) {
	// Попытка извлечь JSON из ответа
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")

	if start == -1 || end == -1 {
		return nil, fmt.Errorf("no JSON found in response")
	}

	jsonStr := content[start : end+1]

	var parsed struct {
		Summary         string   `json:"summary"`
		Insights        []string `json:"insights"`
		Recommendations []string `json:"recommendations"`
		Categories      map[string]struct {
			Mentions  int     `json:"mentions"`
			AvgRating float64 `json:"avgRating"`
		} `json:"categories"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	result := &AnalysisResult{
		Summary:         parsed.Summary,
		Insights:        parsed.Insights,
		Recommendations: parsed.Recommendations,
		Categories:      make(map[string]entity.CategoryStat),
	}

	for name, cat := range parsed.Categories {
		result.Categories[name] = entity.CategoryStat{
			Category:      name,
			Count:         cat.Mentions,
			AverageRating: cat.AvgRating,
		}
	}

	return result, nil
}

func (c *OpenRouterClient) createBasicAnalysis(reviews []entity.Review) *AnalysisResult {
	totalRating := 0.0
	positive := 0
	negative := 0

	for _, review := range reviews {
		totalRating += float64(review.Rating)
		if review.Rating >= 4 {
			positive++
		} else if review.Rating <= 2 {
			negative++
		}
	}

	avgRating := totalRating / float64(len(reviews))
	positivePercent := float64(positive) / float64(len(reviews)) * 100

	summary := fmt.Sprintf("Проанализировано %d отзывов. Средняя оценка: %.1f/5. Положительных отзывов: %.0f%%.",
		len(reviews), avgRating, positivePercent)

	insights := []string{
		fmt.Sprintf("Средняя оценка составляет %.1f из 5", avgRating),
		fmt.Sprintf("Положительных отзывов: %d (%.0f%%)", positive, positivePercent),
		fmt.Sprintf("Отрицательных отзывов: %d", negative),
	}

	recommendations := []string{
		"Продолжайте собирать отзывы для более точного анализа",
		"Обратите внимание на отрицательные отзывы и работайте над улучшением",
		"Поддерживайте качество обслуживания на высоком уровне",
	}

	if avgRating < 3.5 {
		recommendations = append(recommendations, "Срочно требуется улучшение качества услуг")
	}

	return &AnalysisResult{
		Summary:         summary,
		Insights:        insights,
		Recommendations: recommendations,
		Categories:      make(map[string]entity.CategoryStat),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

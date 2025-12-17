package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"reviews-ai/internal/domain/entity"
	"strings"
	"time"
)

type OpenRouterClient struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
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
		apiKey = "your-openrouter-api-key-here" // Fallback, user should set this
	}

	return &OpenRouterClient{
		apiKey:  apiKey,
		baseURL: getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
		model:   getEnv("OPENROUTER_MODEL", "qwen/qwen3-coder:free"),
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

	prompt := c.buildAnalysisPrompt(reviews)

	req := ChatRequest{
		Model: c.model,
		Messages: []ChatMessage{
			{
				Role:    "system",
				Content: "Ты - эксперт по анализу отзывов клиентов. Твоя задача - проанализировать отзывы и дать четкие рекомендации. ВАЖНО: Отвечай ТОЛЬКО валидным JSON без дополнительного текста. Используй русский язык для текста внутри JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from AI")
	}

	return c.parseAIResponse(chatResp.Choices[0].Message.Content, reviews)
}

func (c *OpenRouterClient) buildAnalysisPrompt(reviews []entity.Review) string {
	var sb strings.Builder

	sb.WriteString("Проанализируй следующие отзывы клиентов и предоставь детальный анализ.\n\n")
	sb.WriteString(fmt.Sprintf("Всего отзывов: %d\n\n", len(reviews)))
	sb.WriteString("ОТЗЫВЫ:\n")

	for i, review := range reviews {
		if i >= 50 { // Ограничим для не превышения лимита токенов
			sb.WriteString("\n... и еще отзывы\n")
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
	sb.WriteString("4. Определи категории отзывов: quality (качество), service (обслуживание), cleanliness (чистота), atmosphere (атмосфера), price (цена)\n\n")
	sb.WriteString("Верни ответ в следующем JSON формате:\n")
	sb.WriteString("{\n")
	sb.WriteString(`  "summary": "краткое резюме",` + "\n")
	sb.WriteString(`  "insights": ["инсайт 1", "инсайт 2", "инсайт 3"],` + "\n")
	sb.WriteString(`  "recommendations": ["рекомендация 1", "рекомендация 2", "рекомендация 3"],` + "\n")
	sb.WriteString(`  "categories": {` + "\n")
	sb.WriteString(`    "quality": {"mentions": 10, "avgRating": 4.2},` + "\n")
	sb.WriteString(`    "service": {"mentions": 8, "avgRating": 4.5}` + "\n")
	sb.WriteString("  }\n")
	sb.WriteString("}")

	return sb.String()
}

func (c *OpenRouterClient) parseAIResponse(content string, reviews []entity.Review) (*AnalysisResult, error) {
	// Попытка извлечь JSON из ответа
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")

	if start == -1 || end == -1 {
		// Если JSON не найден, создаем базовый анализ
		return c.createBasicAnalysis(reviews), nil
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
		// Если парсинг не удался, создаем базовый анализ
		return c.createBasicAnalysis(reviews), nil
	}

	result := &AnalysisResult{
		Summary:         parsed.Summary,
		Insights:        parsed.Insights,
		Recommendations: parsed.Recommendations,
		Categories:      make(map[string]entity.CategoryStat),
	}

	// Если AI не вернул данные, используем базовые
	if result.Summary == "" {
		basic := c.createBasicAnalysis(reviews)
		result.Summary = basic.Summary
		result.Insights = basic.Insights
		result.Recommendations = basic.Recommendations
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

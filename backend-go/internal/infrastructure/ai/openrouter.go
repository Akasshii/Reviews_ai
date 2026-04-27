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

// Free models to try in order if the primary model is rate-limited
var fallbackModels = []string{
	"qwen/qwen3-coder:free",
	"nousresearch/hermes-3-llama-3.1-405b:free",
	"meta-llama/llama-3.3-70b-instruct:free",
	"mistralai/mistral-small-3.1-24b-instruct:free",
	"google/gemma-3-27b-it:free",
	"openai/gpt-oss-120b:free",
	"qwen/qwen3-next-80b-a3b-instruct:free",
	"z-ai/glm-4.5-air:free",
	"stepfun/step-3.5-flash:free",
}

// Models that don't support system messages — merge system into user prompt
var noSystemMessageModels = map[string]bool{
	"google/gemma-3-27b-it:free":  true,
	"google/gemma-3-12b-it:free":  true,
}

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
	// Build list of models to try: primary first, then fallbacks
	models := []string{c.model}
	for _, m := range fallbackModels {
		if m != c.model {
			models = append(models, m)
		}
	}

	var lastErr error
	for _, model := range models {
		result, err := c.callAIWithModel(prompt, model)
		if err == nil {
			return result, nil
		}
		lastErr = err
		// If rate limited (429), try next model
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "rate") {
			log.Printf("[AI] Model %s rate limited, trying next model...", model)
			time.Sleep(1 * time.Second)
			continue
		}
		// For other errors, also try next model but log differently
		log.Printf("[AI] Model %s error: %v, trying next model...", model, err)
		continue
	}

	return "", fmt.Errorf("all models failed, last error: %w", lastErr)
}

func (c *OpenRouterClient) callAIWithModel(prompt string, model string) (string, error) {
	log.Printf("[AI] Trying model: %s", model)

	systemContent := "Ты - эксперт по анализу отзывов клиентов. Твоя задача - проанализировать отзывы и дать четкие рекомендации. ВАЖНО: Отвечай ТОЛЬКО валидным JSON без дополнительного текста, без markdown-блоков. Используй русский язык для текста внутри JSON."

	var messages []ChatMessage
	if noSystemMessageModels[model] {
		// Merge system instruction into user message for models that don't support system role
		messages = []ChatMessage{
			{
				Role:    "user",
				Content: systemContent + "\n\n" + prompt,
			},
		}
	} else {
		messages = []ChatMessage{
			{Role: "system", Content: systemContent},
			{Role: "user", Content: prompt},
		}
	}

	req := ChatRequest{
		Model:       model,
		Temperature: c.temperature,
		Messages:    messages,
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

	log.Printf("[AI] Success with model: %s", model)
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

// ClassifyReviewSentiments sends all reviews in one batch to the AI and returns
// a sentiment label ("positive", "neutral", "negative") for each, in order.
func (c *OpenRouterClient) ClassifyReviewSentiments(reviews []entity.Review) ([]string, error) {
	if len(reviews) == 0 {
		return nil, nil
	}

	prompt := c.buildSentimentPrompt(reviews)
	raw, err := c.callAI(prompt)
	if err != nil {
		return nil, fmt.Errorf("AI sentiment call failed: %w", err)
	}

	sentiments, err := c.parseSentimentResponse(raw, len(reviews))
	if err != nil {
		log.Printf("[AI] Sentiment parse error: %v — retrying with simplified prompt", err)
		simplePrompt := c.buildSimpleSentimentPrompt(reviews)
		raw, err = c.callAI(simplePrompt)
		if err != nil {
			return nil, err
		}
		sentiments, err = c.parseSentimentResponse(raw, len(reviews))
		if err != nil {
			return nil, err
		}
	}

	return sentiments, nil
}

func (c *OpenRouterClient) buildSentimentPrompt(reviews []entity.Review) string {
	var sb strings.Builder

	n := len(reviews)
	if n > 100 {
		n = 100
	}

	sb.WriteString(fmt.Sprintf("Определи тональность %d отзывов клиентов.\n\n", n))
	sb.WriteString("Правила классификации:\n")
	sb.WriteString("- \"positive\" — клиент доволен, явно хвалит, оценка 4-5 без жалоб\n")
	sb.WriteString("- \"negative\" — клиент недоволен, жалуется, критикует, оценка 1-2\n")
	sb.WriteString("- \"neutral\"  — смешанный или безэмоциональный отзыв, оценка 3\n\n")
	sb.WriteString("ОТЗЫВЫ (номер. [оценка/5] текст):\n")

	for i, r := range reviews[:n] {
		text := r.Text
		if len(text) > 300 {
			text = text[:300]
		}
		sb.WriteString(fmt.Sprintf("%d. [%d/5] %s\n", i+1, r.Rating, text))
	}

	sb.WriteString(fmt.Sprintf("\nВерни ТОЛЬКО JSON без markdown и без пояснений:\n"))
	sb.WriteString(fmt.Sprintf(`{"sentiments":[%d значений, каждое "positive"/"neutral"/"negative"]}`, n))
	sb.WriteString("\nПример для 3 отзывов: {\"sentiments\":[\"positive\",\"neutral\",\"negative\"]}")

	return sb.String()
}

func (c *OpenRouterClient) buildSimpleSentimentPrompt(reviews []entity.Review) string {
	var sb strings.Builder
	n := len(reviews)
	if n > 100 {
		n = 100
	}
	sb.WriteString(fmt.Sprintf("Classify %d reviews. Return JSON only: {\"sentiments\":[...]}\n", n))
	sb.WriteString("Values: \"positive\", \"neutral\", \"negative\"\n\n")
	for i, r := range reviews[:n] {
		text := r.Text
		if len(text) > 150 {
			text = text[:150]
		}
		sb.WriteString(fmt.Sprintf("%d.[%d/5]%s\n", i+1, r.Rating, text))
	}
	return sb.String()
}

func (c *OpenRouterClient) parseSentimentResponse(content string, count int) ([]string, error) {
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start == -1 || end == -1 || end <= start {
		return nil, fmt.Errorf("no JSON object in sentiment response")
	}

	var parsed struct {
		Sentiments []string `json:"sentiments"`
	}
	if err := json.Unmarshal([]byte(content[start:end+1]), &parsed); err != nil {
		return nil, fmt.Errorf("JSON unmarshal error: %w", err)
	}

	if len(parsed.Sentiments) != count {
		return nil, fmt.Errorf("expected %d sentiments, got %d", count, len(parsed.Sentiments))
	}

	valid := map[string]bool{"positive": true, "neutral": true, "negative": true}
	for i, s := range parsed.Sentiments {
		if !valid[s] {
			return nil, fmt.Errorf("invalid sentiment at index %d: %q", i, s)
		}
	}

	return parsed.Sentiments, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

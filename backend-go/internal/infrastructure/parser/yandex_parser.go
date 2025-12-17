package parser

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"reviews-ai/internal/domain/entity"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type YandexParser struct {
	client *http.Client
}

func NewYandexParser() *YandexParser {
	return &YandexParser{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ParseReviews парсит отзывы с Яндекс.Карт по URL
func (p *YandexParser) ParseReviews(yandexURL string) ([]entity.YandexReview, error) {
	businessID, err := p.extractBusinessID(yandexURL)
	if err != nil {
		return nil, fmt.Errorf("failed to extract business ID: %w", err)
	}

	// Яндекс.Карты имеют сложную защиту от парсинга
	// В реальности нужно использовать их API или более сложные методы
	// Здесь мы создадим демо-данные для тестирования
	return p.fetchReviewsDemo(businessID)
}

func (p *YandexParser) extractBusinessID(yandexURL string) (string, error) {
	// Извлекаем ID организации из URL
	// Пример: https://yandex.com/maps/org/chaykovsky_park_kultury_i_otdykha/204693811778/reviews/
	re := regexp.MustCompile(`/org/[^/]+/(\d+)`)
	matches := re.FindStringSubmatch(yandexURL)

	if len(matches) < 2 {
		return "", fmt.Errorf("invalid Yandex Maps URL format")
	}

	return matches[1], nil
}

// fetchReviewsDemo создает демо-данные для тестирования
// В production версии здесь должен быть реальный парсинг или API запрос
func (p *YandexParser) fetchReviewsDemo(businessID string) ([]entity.YandexReview, error) {
	// Генерируем демо-отзывы для тестирования (июль-декабрь 2025)
	// Разнообразные отзывы для различных AI-анализов
	demoReviews := []entity.YandexReview{
		// Декабрь 2025
		{
			Author:     "Максим Ф.",
			Rating:     5,
			Text:       "Зимняя сказка! Новогодняя иллюминация просто восхитительная. Каток отличный, работают опытные инструкторы. Цены на глинтвейн приемлемые.",
			Date:       time.Date(2025, 12, 18, 18, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Светлана Д.",
			Rating:     4,
			Text:       "Красивое оформление к праздникам, атмосфера волшебная. Единственный минус - очереди на каток в выходные. Лучше приходить в будни.",
			Date:       time.Date(2025, 12, 15, 16, 0, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Игорь В.",
			Rating:     3,
			Text:       "Ожидал большего от новогоднего оформления. Качество декораций среднее, местами видны потертости. Парковка переполнена.",
			Date:       time.Date(2025, 12, 10, 14, 45, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Анастасия П.",
			Rating:     5,
			Text:       "Прекрасное место для зимних прогулок! Дорожки чистят регулярно, везде тепловые лампы. Горячий шоколад в кафе просто восхитительный!",
			Date:       time.Date(2025, 12, 5, 12, 20, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		// Ноябрь 2025
		{
			Author:     "Дмитрий Р.",
			Rating:     4,
			Text:       "Хорошее место для осенних фотосессий. Золотая листва создает невероятные пейзажи. Хотелось бы больше крытых беседок от дождя.",
			Date:       time.Date(2025, 11, 28, 15, 10, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Елизавета К.",
			Rating:     5,
			Text:       "Организовали здесь корпоратив на 50 человек. Администрация помогла с организацией, все прошло на высшем уровне. Спасибо!",
			Date:       time.Date(2025, 11, 22, 19, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Роман С.",
			Rating:     2,
			Text:       "В ноябре парк выглядит заброшенным. Много закрытых объектов, половина кафе не работает. Не рекомендую посещение в межсезонье.",
			Date:       time.Date(2025, 11, 15, 13, 0, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		// Октябрь 2025
		{
			Author:     "Виктория Л.",
			Rating:     5,
			Text:       "Октябрь - идеальное время для посещения! Не жарко, не холодно, красивые краски осени. Провели замечательный день с семьей.",
			Date:       time.Date(2025, 10, 25, 14, 15, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Алексей М.",
			Rating:     4,
			Text:       "Неплохой парк для активного отдыха. Есть велодорожки, зоны для пикника. Цены в прокате велосипедов немного завышены.",
			Date:       time.Date(2025, 10, 18, 11, 45, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Ольга З.",
			Rating:     5,
			Text:       "Отличная детская зона! Современные безопасные аттракционы, аниматоры работают профессионально. Дети были в восторге!",
			Date:       time.Date(2025, 10, 12, 16, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		// Сентябрь 2025
		{
			Author:     "Павел Н.",
			Rating:     4,
			Text:       "Хорошая инфраструктура, чистые туалеты, много скамеек. Единственное - wi-fi работает нестабильно. В целом рекомендую.",
			Date:       time.Date(2025, 9, 28, 13, 20, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Наталья Б.",
			Rating:     3,
			Text:       "Территория большая, но навигация плохая. Долго искали детскую площадку. Нужно установить больше указателей.",
			Date:       time.Date(2025, 9, 20, 15, 50, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Сергей Г.",
			Rating:     5,
			Text:       "Идеальное место для утренних пробежек! Удобные беговые дорожки, много зелени, свежий воздух. Есть раздевалки и душевые.",
			Date:       time.Date(2025, 9, 15, 8, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		// Август 2025
		{
			Author:     "Мария И.",
			Rating:     5,
			Text:       "Отличное место для отдыха! Чистая территория, приветливый персонал. Особенно понравились детские площадки.",
			Date:       time.Date(2025, 8, 25, 15, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Александр П.",
			Rating:     4,
			Text:       "Хороший парк, но хотелось бы больше скамеек для отдыха. В целом атмосфера приятная, фонтаны работают исправно.",
			Date:       time.Date(2025, 8, 18, 14, 20, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Елена С.",
			Rating:     5,
			Text:       "Прекрасное место! Чистота, порядок, красивая природа. Много тени даже в жаркий день. Рекомендую для семейного отдыха.",
			Date:       time.Date(2025, 8, 10, 16, 45, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		// Июль 2025
		{
			Author:     "Дмитрий К.",
			Rating:     3,
			Text:       "Неплохо, но цены в кафе завышены. Сам парк хороший, ухоженный. Хотелось бы больше бесплатных зон отдыха.",
			Date:       time.Date(2025, 7, 28, 13, 10, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Ольга В.",
			Rating:     5,
			Text:       "Замечательный парк культуры и отдыха! Много развлечений для детей, чистые дорожки, красивые клумбы. Особенно понравился розарий!",
			Date:       time.Date(2025, 7, 20, 17, 0, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Анна Л.",
			Rating:     5,
			Text:       "Очень понравилось! Чистота, порядок, доброжелательный персонал. Провели день рождения ребенка - все организовано отлично!",
			Date:       time.Date(2025, 7, 15, 18, 15, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Иван Т.",
			Rating:     2,
			Text:       "Разочарован. В июле было слишком жарко, мало затененных мест. Некоторые аттракционы не работали из-за жары. Не рекомендую в пик лета.",
			Date:       time.Date(2025, 7, 8, 10, 45, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
		{
			Author:     "Людмила К.",
			Rating:     5,
			Text:       "Замечательное место! Чистый воздух, ухоженная территория, приветливый персонал. Рекомендую всем для летнего отдыха!",
			Date:       time.Date(2025, 7, 1, 10, 30, 0, 0, time.UTC),
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		},
	}

	return demoReviews, nil
}

// FetchReviewsAPI пытается получить отзывы через Yandex API (требуется API ключ)
// Примечание: Официального публичного API для отзывов у Яндекс.Карт нет
func (p *YandexParser) FetchReviewsAPI(businessID string, apiKey string) ([]entity.YandexReview, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("Yandex API key is required")
	}

	// Это пример структуры, в реальности API может отличаться
	apiURL := fmt.Sprintf("https://api-maps.yandex.ru/organizations/v1/?orgid=%s&apikey=%s", businessID, apiKey)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d - %s", resp.StatusCode, string(body))
	}

	// Парсинг ответа (структура зависит от реального API)
	var apiResponse struct {
		Reviews []struct {
			Author string    `json:"author"`
			Rating int       `json:"rating"`
			Text   string    `json:"text"`
			Date   time.Time `json:"date"`
		} `json:"reviews"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, err
	}

	var reviews []entity.YandexReview
	for _, r := range apiResponse.Reviews {
		reviews = append(reviews, entity.YandexReview{
			Author:     r.Author,
			Rating:     r.Rating,
			Text:       r.Text,
			Date:       r.Date,
			ReviewID:   uuid.New().String(),
			BusinessID: businessID,
		})
	}

	return reviews, nil
}

// ParseURLParams извлекает параметры из URL Яндекс.Карт
func (p *YandexParser) ParseURLParams(yandexURL string) (map[string]string, error) {
	parsedURL, err := url.Parse(yandexURL)
	if err != nil {
		return nil, err
	}

	params := make(map[string]string)
	queryParams := parsedURL.Query()

	for key, values := range queryParams {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}

	return params, nil
}

// DetermineSentiment определяет настроение отзыва на основе рейтинга и текста
func (p *YandexParser) DetermineSentiment(rating int, text string) string {
	text = strings.ToLower(text)

	// Негативные маркеры
	negativeWords := []string{"плохо", "ужасно", "грязно", "разочарован", "не рекомендую", "отвратительно"}
	// Позитивные маркеры
	positiveWords := []string{"отлично", "хорошо", "прекрасно", "замечательно", "рекомендую", "понравилось"}

	negativeCount := 0
	positiveCount := 0

	for _, word := range negativeWords {
		if strings.Contains(text, word) {
			negativeCount++
		}
	}

	for _, word := range positiveWords {
		if strings.Contains(text, word) {
			positiveCount++
		}
	}

	// Определяем sentiment на основе рейтинга и ключевых слов
	if rating >= 4 && positiveCount > negativeCount {
		return string(entity.SentimentPositive)
	} else if rating <= 2 || negativeCount > positiveCount {
		return string(entity.SentimentNegative)
	}

	return string(entity.SentimentNeutral)
}

// ExtractCategories извлекает категории из текста отзыва
func (p *YandexParser) ExtractCategories(text string) []string {
	text = strings.ToLower(text)
	categories := []string{}

	categoryKeywords := map[string][]string{
		"quality":     []string{"качество", "товар", "продукт", "услуга"},
		"service":     []string{"обслуживание", "персонал", "сотрудник", "администратор", "официант"},
		"cleanliness": []string{"чистота", "чисто", "грязно", "убран", "порядок"},
		"atmosphere":  []string{"атмосфера", "уютно", "комфортно", "обстановка", "интерьер", "дизайн"},
		"price":       []string{"цена", "дорого", "дешево", "стоимость", "дорогой", "недорого"},
	}

	for category, keywords := range categoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(text, keyword) {
				categories = append(categories, category)
				break
			}
		}
	}

	// Если не нашли категории, добавляем quality по умолчанию
	if len(categories) == 0 {
		categories = append(categories, "quality")
	}

	return categories
}

// ValidateYandexURL проверяет валидность URL Яндекс.Карт
func (p *YandexParser) ValidateYandexURL(yandexURL string) bool {
	if !strings.Contains(yandexURL, "yandex.com/maps") && !strings.Contains(yandexURL, "yandex.ru/maps") {
		return false
	}

	// Проверяем наличие org и цифрового ID
	re := regexp.MustCompile(`/org/[^/]+/\d+`)
	return re.MatchString(yandexURL)
}

// ExtractRating извлекает рейтинг из строки
func (p *YandexParser) ExtractRating(ratingStr string) (int, error) {
	// Удаляем все нецифровые символы
	re := regexp.MustCompile(`\d+`)
	matches := re.FindString(ratingStr)

	if matches == "" {
		return 0, fmt.Errorf("no rating found")
	}

	rating, err := strconv.Atoi(matches)
	if err != nil {
		return 0, err
	}

	// Проверяем диапазон
	if rating < 1 || rating > 5 {
		return 0, fmt.Errorf("rating out of range (1-5)")
	}

	return rating, nil
}

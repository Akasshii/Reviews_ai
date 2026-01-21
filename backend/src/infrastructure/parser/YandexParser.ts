import { v4 as uuidv4 } from 'uuid';

export interface YandexReview {
  author: string;
  rating: number;
  text: string;
  date: Date;
  reviewId: string;
  businessId: string;
}

export class YandexParser {
  /**
   * Validates Yandex Maps URL
   */
  validateYandexURL(url: string): boolean {
    if (!url.includes('yandex.com/maps') && !url.includes('yandex.ru/maps')) {
      return false;
    }
    const re = /\/org\/[^/]+\/\d+/;
    return re.test(url);
  }

  /**
   * Extracts business ID from Yandex Maps URL
   */
  extractBusinessID(url: string): string | null {
    const re = /\/org\/[^/]+\/(\d+)/;
    const matches = url.match(re);
    return matches ? matches[1] : null;
  }

  /**
   * Parse reviews from Yandex Maps URL
   * Note: Uses demo data since Yandex doesn't have public API for reviews
   */
  async parseReviews(yandexURL: string): Promise<YandexReview[]> {
    const businessId = this.extractBusinessID(yandexURL);
    if (!businessId) {
      throw new Error('Invalid Yandex Maps URL format');
    }

    // Generate demo reviews for testing
    // In production, this would use web scraping or official API
    return this.fetchReviewsDemo(businessId);
  }

  /**
   * Generate demo reviews for testing
   */
  private fetchReviewsDemo(businessId: string): YandexReview[] {
    const demoReviews: YandexReview[] = [
      // Декабрь 2025
      {
        author: 'Максим Ф.',
        rating: 5,
        text: 'Зимняя сказка! Новогодняя иллюминация просто восхитительная. Каток отличный, работают опытные инструкторы. Цены на глинтвейн приемлемые.',
        date: new Date('2025-12-18T18:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Светлана Д.',
        rating: 4,
        text: 'Красивое оформление к праздникам, атмосфера волшебная. Единственный минус - очереди на каток в выходные. Лучше приходить в будни.',
        date: new Date('2025-12-15T16:00:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Игорь В.',
        rating: 3,
        text: 'Ожидал большего от новогоднего оформления. Качество декораций среднее, местами видны потертости. Парковка переполнена.',
        date: new Date('2025-12-10T14:45:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Анастасия П.',
        rating: 5,
        text: 'Прекрасное место для зимних прогулок! Дорожки чистят регулярно, везде тепловые лампы. Горячий шоколад в кафе просто восхитительный!',
        date: new Date('2025-12-05T12:20:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      // Ноябрь 2025
      {
        author: 'Дмитрий Р.',
        rating: 4,
        text: 'Хорошее место для осенних фотосессий. Золотая листва создает невероятные пейзажи. Хотелось бы больше крытых беседок от дождя.',
        date: new Date('2025-11-28T15:10:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Елизавета К.',
        rating: 5,
        text: 'Организовали здесь корпоратив на 50 человек. Администрация помогла с организацией, все прошло на высшем уровне. Спасибо!',
        date: new Date('2025-11-22T19:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Роман С.',
        rating: 2,
        text: 'В ноябре парк выглядит заброшенным. Много закрытых объектов, половина кафе не работает. Не рекомендую посещение в межсезонье.',
        date: new Date('2025-11-15T13:00:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      // Октябрь 2025
      {
        author: 'Виктория Л.',
        rating: 5,
        text: 'Октябрь - идеальное время для посещения! Не жарко, не холодно, красивые краски осени. Провели замечательный день с семьей.',
        date: new Date('2025-10-25T14:15:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Алексей М.',
        rating: 4,
        text: 'Неплохой парк для активного отдыха. Есть велодорожки, зоны для пикника. Цены в прокате велосипедов немного завышены.',
        date: new Date('2025-10-18T11:45:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Ольга З.',
        rating: 5,
        text: 'Отличная детская зона! Современные безопасные аттракционы, аниматоры работают профессионально. Дети были в восторге!',
        date: new Date('2025-10-12T16:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      // Сентябрь 2025
      {
        author: 'Павел Н.',
        rating: 4,
        text: 'Хорошая инфраструктура, чистые туалеты, много скамеек. Единственное - wi-fi работает нестабильно. В целом рекомендую.',
        date: new Date('2025-09-28T13:20:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Наталья Б.',
        rating: 3,
        text: 'Территория большая, но навигация плохая. Долго искали детскую площадку. Нужно установить больше указателей.',
        date: new Date('2025-09-20T15:50:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Сергей Г.',
        rating: 5,
        text: 'Идеальное место для утренних пробежек! Удобные беговые дорожки, много зелени, свежий воздух. Есть раздевалки и душевые.',
        date: new Date('2025-09-15T08:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      // Август 2025
      {
        author: 'Мария И.',
        rating: 5,
        text: 'Отличное место для отдыха! Чистая территория, приветливый персонал. Особенно понравились детские площадки.',
        date: new Date('2025-08-25T15:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Александр П.',
        rating: 4,
        text: 'Хороший парк, но хотелось бы больше скамеек для отдыха. В целом атмосфера приятная, фонтаны работают исправно.',
        date: new Date('2025-08-18T14:20:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Елена С.',
        rating: 5,
        text: 'Прекрасное место! Чистота, порядок, красивая природа. Много тени даже в жаркий день. Рекомендую для семейного отдыха.',
        date: new Date('2025-08-10T16:45:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      // Июль 2025
      {
        author: 'Дмитрий К.',
        rating: 3,
        text: 'Неплохо, но цены в кафе завышены. Сам парк хороший, ухоженный. Хотелось бы больше бесплатных зон отдыха.',
        date: new Date('2025-07-28T13:10:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Ольга В.',
        rating: 5,
        text: 'Замечательный парк культуры и отдыха! Много развлечений для детей, чистые дорожки, красивые клумбы. Особенно понравился розарий!',
        date: new Date('2025-07-20T17:00:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Анна Л.',
        rating: 5,
        text: 'Очень понравилось! Чистота, порядок, доброжелательный персонал. Провели день рождения ребенка - все организовано отлично!',
        date: new Date('2025-07-15T18:15:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Иван Т.',
        rating: 2,
        text: 'Разочарован. В июле было слишком жарко, мало затененных мест. Некоторые аттракционы не работали из-за жары. Не рекомендую в пик лета.',
        date: new Date('2025-07-08T10:45:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
      {
        author: 'Людмила К.',
        rating: 5,
        text: 'Замечательное место! Чистый воздух, ухоженная территория, приветливый персонал. Рекомендую всем для летнего отдыха!',
        date: new Date('2025-07-01T10:30:00Z'),
        reviewId: uuidv4(),
        businessId,
      },
    ];

    return demoReviews;
  }

  /**
   * Determine sentiment based on rating and text
   */
  determineSentiment(rating: number, text: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();

    const negativeWords = ['плохо', 'ужасно', 'грязно', 'разочарован', 'не рекомендую', 'отвратительно'];
    const positiveWords = ['отлично', 'хорошо', 'прекрасно', 'замечательно', 'рекомендую', 'понравилось'];

    let negativeCount = 0;
    let positiveCount = 0;

    for (const word of negativeWords) {
      if (lowerText.includes(word)) {
        negativeCount++;
      }
    }

    for (const word of positiveWords) {
      if (lowerText.includes(word)) {
        positiveCount++;
      }
    }

    if (rating >= 4 && positiveCount > negativeCount) {
      return 'positive';
    } else if (rating <= 2 || negativeCount > positiveCount) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * Extract categories from review text
   */
  extractCategories(text: string): ('quality' | 'service' | 'cleanliness' | 'atmosphere' | 'price')[] {
    const lowerText = text.toLowerCase();
    const categories: ('quality' | 'service' | 'cleanliness' | 'atmosphere' | 'price')[] = [];

    const categoryKeywords: Record<string, string[]> = {
      quality: ['качество', 'товар', 'продукт', 'услуга'],
      service: ['обслуживание', 'персонал', 'сотрудник', 'администратор', 'официант'],
      cleanliness: ['чистота', 'чисто', 'грязно', 'убран', 'порядок'],
      atmosphere: ['атмосфера', 'уютно', 'комфортно', 'обстановка', 'интерьер', 'дизайн'],
      price: ['цена', 'дорого', 'дешево', 'стоимость', 'дорогой', 'недорого'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          categories.push(category as 'quality' | 'service' | 'cleanliness' | 'atmosphere' | 'price');
          break;
        }
      }
    }

    // Default to quality if no categories found
    if (categories.length === 0) {
      categories.push('quality');
    }

    return categories;
  }
}

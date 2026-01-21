import { Review, CategoryStats } from '../../domain/entities/Report';

export interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
}

interface ChatResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

export class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.model = process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder:free';
  }

  async analyzeReviews(reviews: Review[]): Promise<AnalysisResult> {
    if (reviews.length === 0) {
      return {
        summary: 'Нет отзывов для анализа',
        insights: ['Недостаточно данных для анализа'],
        recommendations: ['Соберите больше отзывов'],
      };
    }

    // If no API key, return basic analysis
    if (!this.apiKey) {
      console.log('OpenRouter API key not set, using basic analysis');
      return this.createBasicAnalysis(reviews);
    }

    const prompt = this.buildAnalysisPrompt(reviews);

    const requestBody: ChatRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по анализу отзывов клиентов. Твоя задача - проанализировать отзывы и дать четкие рекомендации. ВАЖНО: Отвечай ТОЛЬКО валидным JSON без дополнительного текста. Используй русский язык для текста внутри JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
        return this.createBasicAnalysis(reviews);
      }

      const chatResponse = await response.json() as ChatResponse;

      if (!chatResponse.choices || chatResponse.choices.length === 0) {
        console.error('No response from AI');
        return this.createBasicAnalysis(reviews);
      }

      return this.parseAIResponse(chatResponse.choices[0].message.content, reviews);
    } catch (error) {
      console.error('Failed to analyze with AI:', error);
      return this.createBasicAnalysis(reviews);
    }
  }

  private buildAnalysisPrompt(reviews: Review[]): string {
    let prompt = `Проанализируй следующие отзывы клиентов и предоставь детальный анализ.\n\n`;
    prompt += `Всего отзывов: ${reviews.length}\n\n`;
    prompt += `ОТЗЫВЫ:\n`;

    for (let i = 0; i < Math.min(reviews.length, 50); i++) {
      const review = reviews[i];
      prompt += `\n${i + 1}. Автор: ${review.author}\n`;
      prompt += `   Оценка: ${review.rating}/5\n`;
      prompt += `   Отзыв: ${review.text}\n`;
      prompt += `   Дата: ${review.date.toISOString().split('T')[0]}\n`;
    }

    if (reviews.length > 50) {
      prompt += `\n... и еще отзывы\n`;
    }

    prompt += `\n\nТвоя задача:\n`;
    prompt += `1. Создай краткое резюме (2-3 предложения)\n`;
    prompt += `2. Выдели ключевые инсайты (3-5 пунктов)\n`;
    prompt += `3. Дай практические рекомендации (3-5 пунктов)\n\n`;
    prompt += `Верни ответ в следующем JSON формате:\n`;
    prompt += `{\n`;
    prompt += `  "summary": "краткое резюме",\n`;
    prompt += `  "insights": ["инсайт 1", "инсайт 2", "инсайт 3"],\n`;
    prompt += `  "recommendations": ["рекомендация 1", "рекомендация 2", "рекомендация 3"]\n`;
    prompt += `}`;

    return prompt;
  }

  private parseAIResponse(content: string, reviews: Review[]): AnalysisResult {
    // Try to extract JSON from response
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) {
      return this.createBasicAnalysis(reviews);
    }

    const jsonStr = content.substring(start, end + 1);

    try {
      const parsed = JSON.parse(jsonStr) as {
        summary?: string;
        insights?: string[];
        recommendations?: string[];
      };

      const result: AnalysisResult = {
        summary: parsed.summary || '',
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
      };

      // If AI didn't return data, use basic analysis
      if (!result.summary) {
        return this.createBasicAnalysis(reviews);
      }

      return result;
    } catch {
      return this.createBasicAnalysis(reviews);
    }
  }

  private createBasicAnalysis(reviews: Review[]): AnalysisResult {
    let totalRating = 0;
    let positive = 0;
    let negative = 0;

    for (const review of reviews) {
      totalRating += review.rating;
      if (review.rating >= 4) {
        positive++;
      } else if (review.rating <= 2) {
        negative++;
      }
    }

    const avgRating = totalRating / reviews.length;
    const positivePercent = (positive / reviews.length) * 100;

    const summary = `Проанализировано ${reviews.length} отзывов. Средняя оценка: ${avgRating.toFixed(1)}/5. Положительных отзывов: ${positivePercent.toFixed(0)}%.`;

    const insights = [
      `Средняя оценка составляет ${avgRating.toFixed(1)} из 5`,
      `Положительных отзывов: ${positive} (${positivePercent.toFixed(0)}%)`,
      `Отрицательных отзывов: ${negative}`,
    ];

    const recommendations = [
      'Продолжайте собирать отзывы для более точного анализа',
      'Обратите внимание на отрицательные отзывы и работайте над улучшением',
      'Поддерживайте качество обслуживания на высоком уровне',
    ];

    if (avgRating < 3.5) {
      recommendations.push('Срочно требуется улучшение качества услуг');
    }

    return {
      summary,
      insights,
      recommendations,
    };
  }
}

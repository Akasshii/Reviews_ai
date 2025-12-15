import bcrypt from 'bcryptjs';
import { pool } from './db';

const seed = async () => {
  try {
    console.log('Seeding database...');

    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);

    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, role, company, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['demo@reviews.ai', hashedPassword, 'Иван Петров', 'admin', 'Ресторан "Вкусно"', 'Управляющий']
    );

    const userId = userResult.rows[0].id;
    console.log('✓ User created:', userId);

    // Create reports with data
    const report1 = await pool.query(
      `INSERT INTO reports (
        user_id, title, period_start, period_end, summary,
        insights, recommendations,
        total_reviews, average_rating, positive_reviews, neutral_reviews, negative_reviews,
        rating_distribution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId,
        'Анализ отзывов за ноябрь 2024',
        '2024-11-01',
        '2024-11-30',
        'В ноябре наблюдается стабильно высокий уровень удовлетворенности гостей. Средний рейтинг 4.6 свидетельствует об отличном качестве сервиса. Гости особенно отмечают высокое качество блюд и приветливость персонала.',
        [
          'Качество блюд получило наивысшую оценку - 4.8',
          'Сервис оценивается очень высоко - 4.7',
          'Атмосфера заведения создает комфортную обстановку - 4.5',
          'Чистота поддерживается на высоком уровне - 4.6',
          'Ценовая политика воспринимается положительно - 4.3'
        ],
        [
          'Продолжить поддерживать высокий стандарт качества блюд',
          'Усилить обучение персонала для поддержания уровня сервиса',
          'Рассмотреть возможность расширения меню',
          'Провести опрос среди постоянных клиентов',
          'Оптимизировать время ожидания в часы пик'
        ],
        45,
        4.6,
        38,
        5,
        2,
        '{"1": 0, "2": 2, "3": 5, "4": 15, "5": 23}'
      ]
    );

    const report1Id = report1.rows[0].id;
    console.log('✓ Report 1 created:', report1Id);

    // Add category stats for report 1
    const categories = [
      { category: 'quality', count: 42, avg: 4.8, pos: 40, neu: 2, neg: 0 },
      { category: 'service', count: 38, avg: 4.7, pos: 35, neu: 2, neg: 1 },
      { category: 'cleanliness', count: 35, avg: 4.6, pos: 32, neu: 3, neg: 0 },
      { category: 'atmosphere', count: 40, avg: 4.5, pos: 35, neu: 4, neg: 1 },
      { category: 'price', count: 30, avg: 4.3, pos: 25, neu: 4, neg: 1 }
    ];

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO category_stats (report_id, category, count, average_rating, positive, neutral, negative)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [report1Id, cat.category, cat.count, cat.avg, cat.pos, cat.neu, cat.neg]
      );
    }

    // Add reviews for report 1
    const reviews = [
      {
        author: 'Мария К.',
        rating: 5,
        text: 'Прекрасное место! Очень вкусная еда, особенно понравились стейки. Персонал внимательный и вежливый. Обязательно вернемся!',
        date: '2024-11-28',
        source: 'yandex',
        categories: ['quality', 'service', 'atmosphere'],
        sentiment: 'positive'
      },
      {
        author: 'Александр П.',
        rating: 5,
        text: 'Отличный ресторан! Кухня на высшем уровне, интерьер современный и уютный. Рекомендую всем!',
        date: '2024-11-27',
        source: '2gis',
        categories: ['quality', 'atmosphere', 'cleanliness'],
        sentiment: 'positive'
      },
      {
        author: 'Елена С.',
        rating: 4,
        text: 'Хорошее заведение, вкусно готовят. Единственный минус - долго ждали заказ в пятницу вечером.',
        date: '2024-11-25',
        source: 'yandex',
        categories: ['quality', 'service'],
        sentiment: 'positive'
      },
      {
        author: 'Дмитрий Н.',
        rating: 5,
        text: 'Великолепно! Все понравилось - и кухня, и обслуживание, и атмосфера. Цены адекватные качеству.',
        date: '2024-11-23',
        source: '2gis',
        categories: ['quality', 'service', 'atmosphere', 'price'],
        sentiment: 'positive'
      },
      {
        author: 'Ольга М.',
        rating: 4,
        text: 'Очень приятное место, красивая подача блюд. Немного шумновато по вечерам, но в целом все отлично!',
        date: '2024-11-20',
        source: 'yandex',
        categories: ['quality', 'atmosphere', 'cleanliness'],
        sentiment: 'positive'
      },
      {
        author: 'Сергей В.',
        rating: 5,
        text: 'Лучший ресторан в городе! Всё идеально - от встречи до прощания. Повара молодцы!',
        date: '2024-11-18',
        source: 'yandex',
        categories: ['quality', 'service', 'cleanliness'],
        sentiment: 'positive'
      },
      {
        author: 'Анна Л.',
        rating: 3,
        text: 'Еда неплохая, но ожидали большего за такую цену. Обслуживание нормальное.',
        date: '2024-11-15',
        source: '2gis',
        categories: ['quality', 'price', 'service'],
        sentiment: 'neutral'
      },
      {
        author: 'Игорь К.',
        rating: 5,
        text: 'Замечательный ресторан! Очень чисто, уютно, персонал профессиональный. Еда восхитительная!',
        date: '2024-11-12',
        source: 'yandex',
        categories: ['quality', 'service', 'cleanliness', 'atmosphere'],
        sentiment: 'positive'
      },
      {
        author: 'Татьяна Р.',
        rating: 4,
        text: 'Приятная атмосфера, вкусная кухня. Иногда бывает сложно найти место без бронирования.',
        date: '2024-11-10',
        source: '2gis',
        categories: ['quality', 'atmosphere'],
        sentiment: 'positive'
      },
      {
        author: 'Максим Ф.',
        rating: 5,
        text: 'Все на высшем уровне! Качество блюд превосходное, сервис быстрый и ненавязчивый.',
        date: '2024-11-05',
        source: 'yandex',
        categories: ['quality', 'service'],
        sentiment: 'positive'
      }
    ];

    for (const review of reviews) {
      await pool.query(
        `INSERT INTO reviews (report_id, author, rating, text, date, source, categories, sentiment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [report1Id, review.author, review.rating, review.text, review.date, review.source, review.categories, review.sentiment]
      );
    }

    console.log('✓ Reviews added for report 1');

    // Create report 2
    const report2 = await pool.query(
      `INSERT INTO reports (
        user_id, title, period_start, period_end, summary,
        insights, recommendations,
        total_reviews, average_rating, positive_reviews, neutral_reviews, negative_reviews,
        rating_distribution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId,
        'Анализ отзывов за октябрь 2024',
        '2024-10-01',
        '2024-10-31',
        'Октябрь показал отличные результаты с небольшим улучшением по сравнению с сентябрем. Гости высоко оценивают качество обслуживания и атмосферу заведения.',
        [
          'Сервис улучшился на 0.2 балла',
          'Качество блюд остается стабильно высоким',
          'Увеличилось количество положительных отзывов'
        ],
        [
          'Сохранить текущий уровень сервиса',
          'Провести тренинг для новых сотрудников',
          'Обновить сезонное меню'
        ],
        38,
        4.5,
        32,
        5,
        1,
        '{"1": 0, "2": 1, "3": 5, "4": 14, "5": 18}'
      ]
    );

    const report2Id = report2.rows[0].id;
    console.log('✓ Report 2 created:', report2Id);

    // Add category stats for report 2
    const categories2 = [
      { category: 'quality', count: 35, avg: 4.7, pos: 32, neu: 3, neg: 0 },
      { category: 'service', count: 32, avg: 4.5, pos: 28, neu: 3, neg: 1 },
      { category: 'cleanliness', count: 30, avg: 4.6, pos: 28, neu: 2, neg: 0 },
      { category: 'atmosphere', count: 33, avg: 4.4, pos: 29, neu: 3, neg: 1 },
      { category: 'price', count: 25, avg: 4.2, pos: 21, neu: 3, neg: 1 }
    ];

    for (const cat of categories2) {
      await pool.query(
        `INSERT INTO category_stats (report_id, category, count, average_rating, positive, neutral, negative)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [report2Id, cat.category, cat.count, cat.avg, cat.pos, cat.neu, cat.neg]
      );
    }

    console.log('✓ Category stats added for report 2');

    // Create report 3
    const report3 = await pool.query(
      `INSERT INTO reports (
        user_id, title, period_start, period_end, summary,
        insights, recommendations,
        total_reviews, average_rating, positive_reviews, neutral_reviews, negative_reviews,
        rating_distribution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId,
        'Анализ отзывов за сентябрь 2024',
        '2024-09-01',
        '2024-09-30',
        'Сентябрь продемонстрировал хорошие показатели. Гости отмечают качество кухни и профессионализм персонала.',
        [
          'Стабильно высокое качество блюд',
          'Положительные отзывы о новом меню',
          'Рост числа постоянных клиентов'
        ],
        [
          'Расширить винную карту',
          'Добавить детское меню',
          'Улучшить систему бронирования'
        ],
        42,
        4.4,
        35,
        6,
        1,
        '{"1": 0, "2": 1, "3": 6, "4": 16, "5": 19}'
      ]
    );

    console.log('✓ Report 3 created');

    console.log('\n✓ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('Email: demo@reviews.ai');
    console.log('Password: password123');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();

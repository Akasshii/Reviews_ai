import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Report } from '../../../domain/entities/Report';

export interface CreateReportInput {
  userId: string;
  title: string;
  yandexUrl: string;
  periodStart: string;
  periodEnd: string;
}

export class CreateReportUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(input: CreateReportInput): Promise<Report> {
    // Validate input
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (!input.yandexUrl || !input.yandexUrl.includes('yandex')) {
      throw new Error('Valid Yandex Maps URL is required');
    }

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new Error('Invalid date format');
    }

    if (periodStart > periodEnd) {
      throw new Error('Period start must be before period end');
    }

    // Create report with demo data for now
    const report = await this.reportRepository.create({
      userId: input.userId,
      title: input.title.trim(),
      periodStart,
      periodEnd,
    });

    return report;
  }
}

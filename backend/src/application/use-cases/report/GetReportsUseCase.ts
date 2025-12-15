import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Report } from '../../../domain/entities/Report';

export class GetReportsUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(userId: string): Promise<Report[]> {
    return await this.reportRepository.findByUserId(userId);
  }
}

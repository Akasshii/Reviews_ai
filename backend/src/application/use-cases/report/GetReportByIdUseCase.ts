import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Report } from '../../../domain/entities/Report';

export class GetReportByIdUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(reportId: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    // Check if user has access to this report
    if (report.userId !== userId) {
      throw new Error('Access denied');
    }

    return report;
  }
}

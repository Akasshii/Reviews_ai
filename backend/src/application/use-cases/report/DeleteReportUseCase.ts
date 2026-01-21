import { IReportRepository } from '../../../domain/repositories/IReportRepository';

export class DeleteReportUseCase {
  constructor(private reportRepository: IReportRepository) {}

  async execute(reportId: string, userId: string): Promise<void> {
    // Check if report exists and belongs to user
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.userId !== userId) {
      throw new Error('Access denied');
    }

    const deleted = await this.reportRepository.delete(reportId);

    if (!deleted) {
      throw new Error('Failed to delete report');
    }
  }
}

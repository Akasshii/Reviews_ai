import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GetReportsUseCase } from '../../application/use-cases/report/GetReportsUseCase';
import { GetReportByIdUseCase } from '../../application/use-cases/report/GetReportByIdUseCase';

export class ReportController {
  constructor(
    private getReportsUseCase: GetReportsUseCase,
    private getReportByIdUseCase: GetReportByIdUseCase
  ) {}

  async getReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const reports = await this.getReportsUseCase.execute(req.userId);
      res.json(reports);
    } catch (error: any) {
      console.error('Get reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getReportById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const report = await this.getReportByIdUseCase.execute(id, req.userId);
      res.json(report);
    } catch (error: any) {
      if (error.message === 'Report not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

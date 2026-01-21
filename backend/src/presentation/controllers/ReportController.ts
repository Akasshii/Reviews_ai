import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GetReportsUseCase } from '../../application/use-cases/report/GetReportsUseCase';
import { GetReportByIdUseCase } from '../../application/use-cases/report/GetReportByIdUseCase';
import { CreateReportUseCase } from '../../application/use-cases/report/CreateReportUseCase';
import { DeleteReportUseCase } from '../../application/use-cases/report/DeleteReportUseCase';

export class ReportController {
  constructor(
    private getReportsUseCase: GetReportsUseCase,
    private getReportByIdUseCase: GetReportByIdUseCase,
    private createReportUseCase: CreateReportUseCase,
    private deleteReportUseCase: DeleteReportUseCase
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

  async createReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, yandexUrl, periodStart, periodEnd } = req.body;

      if (!title || !yandexUrl || !periodStart || !periodEnd) {
        res.status(400).json({ error: 'Missing required fields: title, yandexUrl, periodStart, periodEnd' });
        return;
      }

      const report = await this.createReportUseCase.execute({
        userId: req.userId,
        title,
        yandexUrl,
        periodStart,
        periodEnd,
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error('Create report error:', error);
      if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async deleteReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      await this.deleteReportUseCase.execute(id, req.userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Report not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Delete report error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

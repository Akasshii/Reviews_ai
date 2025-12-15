import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authMiddleware } from '../middleware/authMiddleware';

export const createReportRoutes = (reportController: ReportController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.get('/', (req, res) => reportController.getReports(req, res));
  router.get('/:id', (req, res) => reportController.getReportById(req, res));

  return router;
};

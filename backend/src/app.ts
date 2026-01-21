import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Repositories
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { ReportRepository } from './infrastructure/repositories/ReportRepository';

// Use Cases
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/auth/RegisterUseCase';
import { GetUserUseCase } from './application/use-cases/user/GetUserUseCase';
import { UpdateUserUseCase } from './application/use-cases/user/UpdateUserUseCase';
import { GetReportsUseCase } from './application/use-cases/report/GetReportsUseCase';
import { GetReportByIdUseCase } from './application/use-cases/report/GetReportByIdUseCase';
import { CreateReportUseCase } from './application/use-cases/report/CreateReportUseCase';
import { DeleteReportUseCase } from './application/use-cases/report/DeleteReportUseCase';

// Controllers
import { AuthController } from './presentation/controllers/AuthController';
import { UserController } from './presentation/controllers/UserController';
import { ReportController } from './presentation/controllers/ReportController';

// Routes
import { createAuthRoutes } from './presentation/routes/authRoutes';
import { createUserRoutes } from './presentation/routes/userRoutes';
import { createReportRoutes } from './presentation/routes/reportRoutes';

dotenv.config();

const app = express();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json());

// Dependency Injection
const userRepository = new UserRepository();
const reportRepository = new ReportRepository();

const loginUseCase = new LoginUseCase(userRepository);
const registerUseCase = new RegisterUseCase(userRepository);
const getUserUseCase = new GetUserUseCase(userRepository);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const getReportsUseCase = new GetReportsUseCase(reportRepository);
const getReportByIdUseCase = new GetReportByIdUseCase(reportRepository);
const createReportUseCase = new CreateReportUseCase(reportRepository);
const deleteReportUseCase = new DeleteReportUseCase(reportRepository);

const authController = new AuthController(loginUseCase, registerUseCase);
const userController = new UserController(getUserUseCase, updateUserUseCase);
const reportController = new ReportController(
  getReportsUseCase,
  getReportByIdUseCase,
  createReportUseCase,
  deleteReportUseCase
);

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/user', createUserRoutes(userController));
app.use('/api/reports', createReportRoutes(reportController));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

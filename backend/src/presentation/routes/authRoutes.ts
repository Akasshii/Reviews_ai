import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post('/login', (req, res) => authController.login(req, res));
  router.post('/register', (req, res) => authController.register(req, res));

  return router;
};

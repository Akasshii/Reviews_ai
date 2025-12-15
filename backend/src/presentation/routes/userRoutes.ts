import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/authMiddleware';

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.get('/profile', (req, res) => userController.getProfile(req, res));
  router.put('/profile', (req, res) => userController.updateProfile(req, res));

  return router;
};

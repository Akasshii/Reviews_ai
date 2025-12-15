import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GetUserUseCase } from '../../application/use-cases/user/GetUserUseCase';
import { UpdateUserUseCase } from '../../application/use-cases/user/UpdateUserUseCase';

export class UserController {
  constructor(
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase
  ) {}

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.getUserUseCase.execute(req.userId);
      res.json(user);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, company, position, avatar } = req.body;

      const user = await this.updateUserUseCase.execute(req.userId, {
        name,
        company,
        position,
        avatar,
      });

      res.json(user);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

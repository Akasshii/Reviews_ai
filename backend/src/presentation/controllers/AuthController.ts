import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase';

export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private registerUseCase: RegisterUseCase
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.loginUseCase.execute({ email, password });

      res.json(result);
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        res.status(401).json({ error: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, password, and name are required' });
        return;
      }

      const user = await this.registerUseCase.execute({ email, password, name });

      res.status(201).json(user);
    } catch (error: any) {
      if (error.message === 'User already exists') {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

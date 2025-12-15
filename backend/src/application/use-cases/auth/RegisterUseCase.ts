import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { CreateUserDTO } from '../../../domain/entities/User';

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserDTO): Promise<{ id: string; email: string; name: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
      role: data.role || 'user',
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

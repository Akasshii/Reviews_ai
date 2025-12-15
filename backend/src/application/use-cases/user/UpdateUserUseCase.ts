import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UpdateUserDTO, UserResponse } from '../../../domain/entities/User';

export class UpdateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, data: UpdateUserDTO): Promise<UserResponse> {
    const user = await this.userRepository.update(userId, data);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
      position: user.position,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

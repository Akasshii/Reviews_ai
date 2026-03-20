import { apiClient } from './client';
import type { UserResponse, UpdateUserDTO } from '../types';

export const userApi = {
  getProfile: async (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>('/user/profile', true);
  },

  updateProfile: async (data: UpdateUserDTO): Promise<UserResponse> => {
    return apiClient.put<UserResponse>('/user/profile', data, true);
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    return apiClient.put<void>('/user/password', data, true);
  },
};

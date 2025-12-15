import { apiClient } from './client';
import { UserResponse, UpdateUserDTO } from '../types';

export const userApi = {
  getProfile: async (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>('/user/profile', true);
  },

  updateProfile: async (data: UpdateUserDTO): Promise<UserResponse> => {
    return apiClient.put<UserResponse>('/user/profile', data, true);
  },
};

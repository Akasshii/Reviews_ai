import { apiClient } from './client';
import type { Location, CreateLocationDTO, UpdateLocationDTO } from '../types';

export const locationApi = {
  getLocations: async (): Promise<Location[]> => {
    return apiClient.get<Location[]>('/locations', true);
  },

  getLocationById: async (id: string): Promise<Location> => {
    return apiClient.get<Location>(`/locations/${id}`, true);
  },

  createLocation: async (data: CreateLocationDTO): Promise<Location> => {
    return apiClient.post<Location>('/locations', data, true);
  },

  updateLocation: async (id: string, data: UpdateLocationDTO): Promise<Location> => {
    return apiClient.put<Location>(`/locations/${id}`, data, true);
  },

  deleteLocation: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/locations/${id}`, true);
  },

  findTwoGisUrl: async (name: string, address?: string): Promise<string> => {
    const params = new URLSearchParams({ name });
    if (address) params.append('address', address);
    const data = await apiClient.get<{ url: string }>(`/locations/find-2gis?${params}`, true);
    return data.url ?? '';
  },
};

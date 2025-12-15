import { apiClient } from './client';
import { Report } from '../types';

export const reportApi = {
  getReports: async (): Promise<Report[]> => {
    return apiClient.get<Report[]>('/reports', true);
  },

  getReportById: async (id: string): Promise<Report> => {
    return apiClient.get<Report>(`/reports/${id}`, true);
  },
};

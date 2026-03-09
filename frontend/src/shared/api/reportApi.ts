import { apiClient } from './client';
import type { Report } from '../types';

export interface CreateReportDTO {
  title: string;
  periodStart: string;
  periodEnd: string;
  url: string;
}

export const reportApi = {
  getReports: async (): Promise<Report[]> => {
    return apiClient.get<Report[]>('/reports', true);
  },

  getReportById: async (id: string): Promise<Report> => {
    return apiClient.get<Report>(`/reports/${id}`, true);
  },

  createReport: async (data: CreateReportDTO): Promise<Report> => {
    return apiClient.post<Report>('/reports', data, true);
  },

  deleteReport: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/reports/${id}`, true);
  },
};

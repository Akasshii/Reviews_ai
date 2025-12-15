import { Report, CreateReportDTO } from '../entities/Report';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findByUserId(userId: string): Promise<Report[]>;
  findAll(): Promise<Report[]>;
  create(data: CreateReportDTO): Promise<Report>;
  delete(id: string): Promise<boolean>;
}

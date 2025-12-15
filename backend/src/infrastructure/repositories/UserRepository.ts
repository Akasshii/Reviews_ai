import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, CreateUserDTO, UpdateUserDTO } from '../../domain/entities/User';
import { pool } from '../database/db';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async create(data: CreateUserDTO): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.email, data.password, data.name, data.role || 'user']
    );

    return this.mapToEntity(result.rows[0]);
  }

  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.company !== undefined) {
      fields.push(`company = $${paramCount++}`);
      values.push(data.company);
    }
    if (data.position !== undefined) {
      fields.push(`position = $${paramCount++}`);
      values.push(data.position);
    }
    if (data.avatar !== undefined) {
      fields.push(`avatar = $${paramCount++}`);
      values.push(data.avatar);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  private mapToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      company: row.company,
      position: row.position,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  company?: string;
  position?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserDTO {
  name?: string;
  company?: string;
  position?: string;
  avatar?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  position?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

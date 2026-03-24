import api from './api';
import { User } from '../types';

export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });

export const getMe = () => api.get<User>('/auth/me');

export const logout = () => api.post('/auth/logout');

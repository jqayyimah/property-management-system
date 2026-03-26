import api from './api';
import { User } from '../types';

export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });

export const getMe = () => api.get<User>('/auth/me');

export const logout = () => api.post('/auth/logout');

export const signup = (data: {
  full_name: string;
  phone: string;
  email: string;
  password: string;
}) => api.post<{ message: string }>('/auth/signup', data).then((r) => r.data);

export const forgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (data: {
  token: string;
  new_password: string;
  confirm_password: string;
}) => api.post<{ message: string }>('/auth/reset-password', data).then((r) => r.data);

export const changePassword = (data: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}) => api.post<{ message: string }>('/auth/change-password', data).then((r) => r.data);

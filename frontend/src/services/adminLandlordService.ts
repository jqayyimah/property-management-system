import api from './api';
import { AdminLandlord, LandlordInfo } from '../types';

export const getLandlords = async (): Promise<AdminLandlord[]> =>
  api.get<AdminLandlord[]>('/landlords/').then((r) => r.data);

export const approveLandlord = (userId: number) =>
  api.post<{ message: string }>(`/auth/activate/${userId}`).then((r) => r.data);

export const deactivateLandlord = (userId: number) =>
  api.post<{ message: string }>(`/auth/deactivate/${userId}`).then((r) => r.data);

export const updateLandlord = (
  id: number,
  data: { full_name?: string; email?: string; phone?: string }
) => api.put<LandlordInfo>(`/landlords/${id}`, data).then((r) => r.data);

export const deleteLandlord = (id: number) =>
  api.delete(`/landlords/${id}`).then((r) => r.data);

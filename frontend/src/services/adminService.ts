import api from './api';
import { User, LandlordInfo } from '../types';

// ── Users ─────────────────────────────────────────────────────────────────────

export const listUsers = () =>
  api.get<User[]>('/auth/users').then((r) => r.data);

export const activateUser = (userId: number) =>
  api.post<{ message: string }>(`/auth/activate/${userId}`).then((r) => r.data);

// ── Landlords ─────────────────────────────────────────────────────────────────

export const listLandlords = () =>
  api.get<LandlordInfo[]>('/landlords/').then((r) => r.data);

export const updateLandlord = (
  id: number,
  data: { full_name?: string; email?: string; phone?: string }
) =>
  api.put<LandlordInfo>(`/landlords/${id}`, data).then((r) => r.data);

export const deleteLandlord = (id: number) =>
  api.delete(`/landlords/${id}`).then((r) => r.data);

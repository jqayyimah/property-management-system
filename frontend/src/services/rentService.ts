import api from './api';
import { Rent, RentCreate } from '../types';

export const getRents = () =>
  api.get<Rent[]>('/rents/').then((r) => r.data);

export const getRentsByTenant = (tenantId: number) =>
  api.get<Rent[]>(`/rents/tenant/${tenantId}`).then((r) => r.data);

export const createRent = (data: RentCreate) =>
  api.post<Rent>('/rents/', data).then((r) => r.data);

export const updateRent = (
  id: number,
  data: { amount?: number; start_date?: string; end_date?: string }
) => api.put<Rent>(`/rents/${id}`, data).then((r) => r.data);

export const payRent = (id: number, amount: number) =>
  api.put<Rent>(`/rents/${id}/pay`, { amount }).then((r) => r.data);

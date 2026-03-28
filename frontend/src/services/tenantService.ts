import api from './api';
import { Tenant, TenantCreate } from '../types';

export const getTenants = () =>
  api.get<Tenant[]>('/tenants/').then((r) => r.data);

export const getTenant = (id: number) =>
  api.get<Tenant>(`/tenants/${id}`).then((r) => r.data);

export const createTenant = (data: TenantCreate) =>
  api.post<Tenant>('/tenants/', data).then((r) => r.data);

export const updateTenant = (id: number, data: Partial<TenantCreate>) =>
  api.put<Tenant>(`/tenants/${id}`, data).then((r) => r.data);

export const exitTenant = (id: number) =>
  api.put(`/tenants/${id}/exit`).then((r) => r.data);

export const deleteTenant = (id: number) =>
  api.delete(`/tenants/${id}`).then((r) => r.data);

import api from './api';
import { Apartment, ApartmentCreate } from '../types';

export const getApartments = () =>
  api.get<Apartment[]>('/apartments/').then((r) => r.data);

export const getApartment = (id: number) =>
  api.get<Apartment>(`/apartments/${id}`).then((r) => r.data);

export const createApartment = (data: ApartmentCreate) =>
  api.post<Apartment>('/apartments/', data).then((r) => r.data);

export const updateApartment = (
  id: number,
  data: { unit_number?: string; apartment_type?: string; is_vacant?: boolean }
) => api.put<Apartment>(`/apartments/${id}`, data).then((r) => r.data);

export const deleteApartment = (id: number) =>
  api.delete(`/apartments/${id}`).then((r) => r.data);

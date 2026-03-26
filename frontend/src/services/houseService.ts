import api from './api';
import { House, HouseCreate } from '../types';

export const getHouses = () =>
  api.get<House[]>('/houses/').then((r) => r.data);

export const getHouse = (id: number) =>
  api.get<House>(`/houses/${id}`).then((r) => r.data);

export const createHouse = (data: HouseCreate) =>
  api.post<House>('/houses/', data).then((r) => r.data);

export const updateHouse = (id: number, data: Partial<HouseCreate>) =>
  api.put<House>(`/houses/${id}`, data).then((r) => r.data);

export const deleteHouse = (id: number) =>
  api.delete(`/houses/${id}`).then((r) => r.data);

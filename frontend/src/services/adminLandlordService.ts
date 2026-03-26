import api from './api';
import { AdminLandlord, LandlordInfo, User } from '../types';

const getLandlordUsers = () =>
  api
    .get<User[]>('/auth/users')
    .then((r) => r.data.filter((user) => user.role === 'LANDLORD'));

export const getLandlords = async (): Promise<AdminLandlord[]> => {
  const [landlords, users] = await Promise.all([
    api.get<LandlordInfo[]>('/landlords/').then((r) => r.data),
    getLandlordUsers(),
  ]);

  const usersByLandlordId = new Map(
    users
      .filter((user) => user.landlord_id !== null)
      .map((user) => [user.landlord_id as number, user])
  );

  return landlords.map((landlord) => {
    const user = usersByLandlordId.get(landlord.id);
    return {
      ...landlord,
      user_id: user?.id ?? null,
      is_active: user?.is_active ?? false,
    };
  });
};

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

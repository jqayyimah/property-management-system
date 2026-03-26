import api from './api';
import { LandlordSummary } from '../types';

export const getLandlordSummary = () =>
  api.get<LandlordSummary>('/dashboard/summary').then((r) => r.data);

export type { LandlordSummary };

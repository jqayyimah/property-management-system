import api from './api';
import {
  ReminderSummary,
  RentReminderInfo,
  TriggerResponse,
  ReminderLogEntry,
} from '../types';

export const getReminderSummary = () =>
  api.get<ReminderSummary>('/rent-reminders/summary').then((r) => r.data);

export const getReminderRents = () =>
  api.get<RentReminderInfo[]>('/rent-reminders/').then((r) => r.data);

export const triggerReminders = () =>
  api.post<TriggerResponse>('/rent-reminders/trigger').then((r) => r.data);

export const getMessageTemplate = () =>
  api.get<{ message: string }>('/rent-reminders/settings').then((r) => r.data.message);

export const saveMessageTemplate = (message: string) =>
  api
    .put<{ message: string }>('/rent-reminders/settings', { message })
    .then((r) => r.data.message);

export const getReminderLogs = (limit = 100) =>
  api
    .get<ReminderLogEntry[]>('/rent-reminders/logs', { params: { limit } })
    .then((r) => r.data);

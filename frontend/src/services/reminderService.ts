import api from './api';
import {
  ReminderSummary,
  RentReminderInfo,
  TriggerResponse,
  ReminderLogEntry,
  ReminderChannelSettings,
  ReminderScheduleSettings,
  TestReminderResponse,
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

export const getReminderChannels = () =>
  api.get<ReminderChannelSettings>('/rent-reminders/channels').then((r) => r.data);

export const saveReminderChannels = (channels: string[]) =>
  api
    .put<ReminderChannelSettings>('/rent-reminders/channels', { channels })
    .then((r) => r.data);

export const getReminderSchedule = () =>
  api.get<ReminderScheduleSettings>('/rent-reminders/schedule').then((r) => r.data);

export const saveReminderSchedule = (rules: ReminderScheduleSettings['rules']) =>
  api
    .put<ReminderScheduleSettings>('/rent-reminders/schedule', { rules })
    .then((r) => r.data);

export const sendTestReminder = (data: { email?: string; phone?: string }) =>
  api.post<TestReminderResponse>('/rent-reminders/test-send', data).then((r) => r.data);

export const getReminderLogs = (limit = 100) =>
  api
    .get<ReminderLogEntry[]>('/rent-reminders/logs', { params: { limit } })
    .then((r) => r.data);

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'LANDLORD';
  is_active: boolean;
  landlord_id: number | null;
  full_name: string | null;
  first_name: string | null;
}

export interface House {
  id: number;
  name: string;
  address: string;
  landlord_id: number;
  created_at: string;
}

export interface HouseCreate {
  name: string;
  address: string;
  landlord_id: number;
}

export interface Apartment {
  id: number;
  unit_number: string;
  apartment_type: string;
  is_vacant: boolean;
  house_id: number;
  tenant: { id: number; full_name: string } | null;
}

export interface ApartmentCreate {
  unit_number: string;
  apartment_type: string;
  house_id: number;
}

export interface Tenant {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  apartment_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TenantCreate {
  full_name: string;
  email: string;
  phone?: string;
  apartment_id?: number;
}

export interface PropertySummary {
  id: number;
  name: string;
  address: string;
  landlord_id: number;
}

export interface Rent {
  id: number;
  tenant_id: number;
  year: number;
  start_date: string;
  end_date: string;
  amount: string;
  paid_amount: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  property: PropertySummary;
  created_at: string;
  updated_at: string;
}

export interface RentCreate {
  tenant_id: number;
  year: number;
  start_date: string;
  end_date: string;
  amount: number;
}

// ── Reminder types ────────────────────────────────────────────────────────────

export interface ReminderSummary {
  total_upcoming: number;
  total_overdue: number;
  total_sent_today: number;
}

export interface RentReminderInfo {
  rent_id: number;
  tenant_id: number;
  tenant_name: string;
  property_name: string;
  apartment: string;
  end_date: string;
  amount: string;
  paid_amount: string;
  status: string;
  last_reminder_type: string | null;
  last_reminder_sent_at: string | null;
}

export interface TriggerResponse {
  success: boolean;
  reminders_sent: number;
}

export interface ReminderLogEntry {
  id: number;
  rent_id: number;
  tenant_id: number;
  reminder_type: string;
  message: string;
  status: string;
  sent_at: string;
}

export const APARTMENT_TYPES = [
  'Studio Room Self Contain',
  'One Bedroom Flat',
  'Two Bedroom Flat',
  'Three Bedroom Flat',
  'Four Bedroom Flat',
  'Five Bedroom Flat',
  'Two Bedroom Duplex',
  'Three Bedroom Duplex',
  'Four Bedroom Duplex',
  'Five Bedroom Duplex',
  'Two Bedroom Maisonette',
  'Three Bedroom Maisonette',
  'Two Bedroom Terrace',
  'Three Bedroom Terrace',
  'Four Bedroom Terrace',
  'Two Bedroom Bungalow',
  'Three Bedroom Bungalow',
  'Penthouse',
  'Shop / Commercial Space',
  'Office Space',
] as const;

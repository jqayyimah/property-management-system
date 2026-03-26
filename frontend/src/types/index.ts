export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'LANDLORD';
  is_active: boolean;
  is_email_verified: boolean;
  landlord_id: number | null;
  full_name: string | null;
  first_name: string | null;
}

export interface BillingPlan {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_amount: string;
  currency: string;
  house_limit: number;
  duration_days: number | null;
  is_default: boolean;
  is_active: boolean;
}

export interface BillingSubscription {
  plan: BillingPlan;
  house_limit: number;
  houses_used: number;
  houses_remaining: number;
  subscription_status: string;
  started_at: string | null;
  ends_at: string | null;
  provider: string | null;
}

export interface LandlordInfo {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface AdminLandlord extends LandlordInfo {
  user_id: number | null;
  is_active: boolean;
  billing_status: string;
  billing_access_active: boolean;
  current_plan_name: string | null;
  plan_ends_at: string | null;
  current_plan_amount: string | null;
  sms_sent_count: number;
  whatsapp_sent_count: number;
  email_sent_count: number;
  sms_cost_total: string;
  whatsapp_cost_total: string;
  email_cost_total: string;
  service_cost_total: string;
  upgrade_recommended: boolean;
  upgrade_recommendation_reason: string | null;
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
  phone: string;
  apartment_id: number;
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

export type ReminderChannel = 'sms' | 'whatsapp' | 'email' | 'dashboard';

export interface ReminderChannelSettings {
  channels: ReminderChannel[];
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

export interface TestReminderResponse {
  message: string;
  sent_channels: string[];
}

export interface ReminderLogEntry {
  id: number;
  rent_id: number;
  tenant_id: number;
  tenant_name?: string | null;
  landlord_name?: string | null;
  reminder_type: string;
  message: string;
  status: string;
  channel_used?: string | null;
  service_cost?: string | null;
  cost_currency?: string | null;
  sent_at: string;
}

export interface DashboardTotals {
  properties: number;
  apartments: number;
  vacant_apartments: number;
  tenants: number;
  overdue_rents: number;
  upcoming_rents: number;
}

export interface DashboardFinancials {
  expected_rent: number;
  paid_rent: number;
  outstanding_rent: number;
}

export interface DashboardRecentRent {
  id: number;
  tenant_name: string;
  property_name: string;
  amount: number;
  status: string;
  end_date: string;
}

export interface DashboardUpcomingRent {
  id: number;
  tenant_name: string;
  property_name: string;
  end_date: string;
  days_remaining: number;
}

export interface LandlordSummary {
  totals: DashboardTotals;
  financials: DashboardFinancials;
  recent_rents: DashboardRecentRent[];
  upcoming_due_rents: DashboardUpcomingRent[];
  recent_reminders: ReminderLogEntry[];
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

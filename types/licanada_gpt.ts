export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Entity {
  id: number;
  name: string;
  type: "personal" | "company" | string;
  short_code: string;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface EntityAlias {
  alias: string;
  entity_id: number;
}

export interface Person {
  id: number;
  canonical_name: string;
  relationship: string | null;
  notes: string | null;
  created_at: Date;
}

export interface Place {
  id: number;
  canonical_name: string;
  formal_name: string | null;
  address: string | null;
  gps_lat: string | null;
  gps_lng: string | null;
  gps_radius_m: number | null;
  category: string | null;
  notes: string | null;
  created_at: Date;
}

export interface Receipt {
  id: number;
  entity_id: number;
  record_r_number: string;
  vendor: string;
  vendor_address: string | null;
  vendor_phone: string | null;
  store_number: string | null;
  place_id: number | null;
  receipt_number: string | null;
  transaction_number: string | null;
  authorization_code: string | null;
  card_last_four: string | null;
  cashier: string | null;
  receipt_date: Date;
  receipt_time: string | null;
  invoice_number: string | null;
  category: string;
  subtotal: string | null;
  taxes: JsonValue[];
  tips: string | null;
  grand_total: string | null;
  currency: string;
  payment_method: string | null;
  attachment_link: string | null;
  source_filename: string | null;
  photo_taken_at: Date | null;
  photo_gps_lat: string | null;
  photo_gps_lng: string | null;
  is_reviewed: boolean;
  reviewed_at: Date | null;
  review_notes: string | null;
  created_at: Date;
}

export interface ReceiptItem {
  id: number;
  record_r_number: string;
  receipt_number: string | null;
  item_date: Date | null;
  item_name: string;
  adjusted_item_name: string | null;
  item_category: string;
  item_qty: string | null;
  item_price: string | null;
  item_total_price: string | null;
  created_at: Date;
}

export interface Invoice {
  id: number;
  entity_id: number;
  record_i_number: string;
  invoice_number: string | null;
  invoice_date: Date;
  buyer_name: string;
  person_id: number | null;
  category: string | null;
  subtotal: string | null;
  taxes: JsonValue[];
  grand_total: string | null;
  currency: string;
  payment_method: string | null;
  attachment_link: string | null;
  is_reviewed: boolean;
  reviewed_at: Date | null;
  review_notes: string | null;
  created_at: Date;
}

export interface InvoiceItem {
  id: number;
  record_i_number: string;
  invoice_number: string | null;
  item_date: Date | null;
  item_number: string | null;
  item_name: string;
  item_category: string | null;
  item_qty: string | null;
  item_price: string | null;
  item_total_price: string | null;
  created_at: Date;
}

export interface Event {
  id: number;
  event_type: "diary" | "checkin" | "checkout" | "activity" | string;
  event_date: Date;
  checkin_at: Date | null;
  checkout_at: Date | null;
  duration_minutes: number | null;
  parent_event_id: number | null;
  place_id: number | null;
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: Date;
}

export interface Reminder {
  id: number;
  reminder_text: string;
  reminder_type: "date" | "person" | "place" | string;
  trigger_date: Date | null;
  trigger_month: number | null;
  trigger_day: number | null;
  trigger_person_id: number | null;
  trigger_place_id: number | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_active: boolean;
  triggered_at: Date | null;
  created_at: Date;
}

export interface HealthRecord {
  id: number;
  record_hr_number: string;
  record_type: string;
  record_date: Date;
  title: string;
  facility: string | null;
  doctor: string | null;
  patient_name: string | null;
  person_id: number | null;
  tags: string[] | null;
  key_terms: string[] | null;
  summary: string | null;
  ai_interpretation: string | null;
  attachment_link: string | null;
  source_filename: string | null;
  notes: string | null;
  created_at: Date;
}

export interface WeightLog {
  id: number;
  log_date: Date;
  log_time: string | null;
  person_id: number | null;
  weight_kg: string;
  notes: string | null;
  created_at: Date;
}

export interface BloodPressureLog {
  id: number;
  log_date: Date;
  log_time: string | null;
  person_id: number | null;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: string | null;
  position: string | null;
  device: string | null;
  extra_readings: JsonValue | null;
  notes: string | null;
  created_at: Date;
}

export type Role = 'client' | 'manager' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SpaceCategory {
  category_id: number;
  name: string;
}

export interface Workspace {
  workspace_id: number;
  category_id: number;
  name: string;
  capacity: number;
  base_price: string;
  is_active: boolean;
  category: SpaceCategory;
}

export interface Service {
  service_id: number;
  name: string;
  description: string | null;
  price: string;
}

export interface BookingService {
  booking_id: number;
  service_id: number;
  quantity: number;
  service: Service;
}

export interface Tariff {
  tariff_id: number;
  name: string;
  price: string;
  details: Record<string, unknown>;
  is_enabled: boolean;
}

export interface Subscription {
  subscription_id: number;
  client_id: number;
  tariff_id: number;
  start_date: string;
  end_date: string | null;
  visits_left: number | null;
  is_cancelled: boolean;
  tariff?: Tariff;
}

export interface Booking {
  booking_id: number;
  client_id: number;
  workspace_id: number;
  subscription_id: number | null;
  start_time: string;
  end_time: string;
  total_price: string;
  workspace: Workspace;
  client?: { client_id: number; full_name: string; email: string; phone: string };
  bookingServices: BookingService[];
  subscription?: Subscription | null;
}

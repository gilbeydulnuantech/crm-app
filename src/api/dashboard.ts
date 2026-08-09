import { apiFetch } from './client';
import { DashboardData } from '../types/dashboard';

export function fetchDashboard() {
  return apiFetch<DashboardData>('/webhook/get-dashboard');
}

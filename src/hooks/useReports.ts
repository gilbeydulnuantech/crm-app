import { useQuery } from '@tanstack/react-query';
import * as api from '../api/reports';

export function useOverviewReport(days: number) {
  return useQuery({ queryKey: ['reports', 'overview', days], queryFn: () => api.fetchOverviewReport(days) });
}

export function useSalesReport(days: number) {
  return useQuery({ queryKey: ['reports', 'sales', days], queryFn: () => api.fetchSalesReport(days) });
}

export function usePipelineReport() {
  return useQuery({ queryKey: ['reports', 'pipeline'], queryFn: api.fetchPipelineReport });
}

export function useContactsReport(days: number) {
  return useQuery({ queryKey: ['reports', 'contacts', days], queryFn: () => api.fetchContactsReport(days) });
}

export function useTeamReport(days: number) {
  return useQuery({ queryKey: ['reports', 'team', days], queryFn: () => api.fetchTeamReport(days) });
}

export function useActivitiesReport(days: number) {
  return useQuery({ queryKey: ['reports', 'activities', days], queryFn: () => api.fetchActivitiesReport(days) });
}

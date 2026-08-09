import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../api/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    // Dashboard is a "what's happening right now" view — refresh a bit more
    // eagerly than the app-wide default.
    refetchInterval: 30000,
  });
}

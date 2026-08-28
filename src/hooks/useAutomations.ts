import { useQuery } from '@tanstack/react-query';
import * as api from '../api/automations';

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: api.fetchAutomations,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchResources } from '../api/resources';

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: fetchResources,
    staleTime: 5 * 60 * 1000,
  });
}

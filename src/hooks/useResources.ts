import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addResource, fetchResources } from '../api/resources';

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: fetchResources,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: string }) => addResource(name, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  });
}

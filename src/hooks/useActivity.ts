import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/activity';

export function useEntityActivity(entityType: string, entityId: number | null) {
  return useQuery({
    queryKey: ['entity-activity', entityType, entityId],
    queryFn: () => api.fetchEntityActivity(entityType, entityId!),
    enabled: entityId != null,
  });
}

export function useLogCallActivity(entityType: string, entityId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ summary, detail }: { summary: string; detail?: Record<string, unknown> }) =>
      api.logCallActivity(entityType, entityId!, summary, detail),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-activity', entityType, entityId] }),
  });
}

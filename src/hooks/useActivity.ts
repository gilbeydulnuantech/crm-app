import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/activity';
import { GlobalAuditLogFilters } from '../api/activity';
import { ActivityLogEntry } from '../types/activity';

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

// Opening a received Telegram message marks it read. The card is flipped in the
// cache immediately (so it turns green the moment the popup opens) and rolled
// back if the server rejects it.
export function useMarkTelegramRead(contactId: number | null) {
  const qc = useQueryClient();
  const key = ['entity-activity', 'contact', contactId];
  return useMutation({
    mutationFn: (entryId: number) => api.markTelegramRead(entryId).then((res) => {
      if (!res.success) throw new Error(res.error || 'Could not mark the message as read.');
      return res;
    }),
    onMutate: async (entryId: number) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ActivityLogEntry[]>(key);
      qc.setQueryData<ActivityLogEntry[]>(key, (old) =>
        old?.map((e) => (e.id === entryId ? { ...e, detail: { ...(e.detail ?? {}), is_read: true } } : e))
      );
      return { previous };
    },
    onError: (_err, _entryId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useGlobalAuditLog(filters: GlobalAuditLogFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['global-audit-log', filters],
    queryFn: () => api.fetchGlobalAuditLog(filters),
    enabled,
  });
}

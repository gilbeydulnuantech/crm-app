import { apiFetch } from './client';
import { ActivityLogEntry } from '../types/activity';

export function fetchEntityActivity(entityType: string, entityId: number) {
  return apiFetch<ActivityLogEntry[]>(
    `/webhook/get-entity-activity?entity_type=${entityType}&entity_id=${entityId}`
  );
}

export interface GlobalAuditLogEntry extends ActivityLogEntry {
  entity_name?: string | null;
}

export interface GlobalAuditLogFilters {
  actorId?: number | null;
  entityType?: 'contact' | 'company' | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
}

// Admin-only — enforced server-side by checking the requester's role, not by
// the presence of these query params.
export function fetchGlobalAuditLog(filters: GlobalAuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.actorId) params.set('actor_id', String(filters.actorId));
  if (filters.entityType) params.set('entity_type', filters.entityType);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  return apiFetch<GlobalAuditLogEntry[]>(`/webhook/get-global-audit-log?${params.toString()}`);
}

// Currently only 'call' is accepted server-side — meeting/system_audit rows
// are written internally by other n8n workflows, not by clients.
export function logCallActivity(
  entityType: string,
  entityId: number,
  summary: string,
  detail?: Record<string, unknown>
) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/add-entity-activity', {
    method: 'POST',
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId, category: 'call', summary, detail }),
  });
}

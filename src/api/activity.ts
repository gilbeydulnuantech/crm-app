import { apiFetch } from './client';
import { ActivityLogEntry } from '../types/activity';

export function fetchEntityActivity(entityType: string, entityId: number) {
  return apiFetch<ActivityLogEntry[]>(
    `/webhook/get-entity-activity?entity_type=${entityType}&entity_id=${entityId}`
  );
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

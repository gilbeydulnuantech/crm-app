import { apiFetch } from './client';
import { Note } from '../types/note';

export function fetchNotes(entityType: string, entityId: number) {
  return apiFetch<Note[]>(`/webhook/get-notes?entity_type=${entityType}&entity_id=${entityId}`);
}

export function addNote(entityType: string, entityId: number, body: string, requesterId?: number) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/add-note', {
    method: 'POST',
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body, requester_id: requesterId }),
  });
}

// Partial update — omit a field to leave it untouched server-side, so
// toggling the pin doesn't require resending the note body and editing the
// body doesn't accidentally pin/unpin it.
export function updateNote(id: number, updates: { body?: string; isPinned?: boolean }) {
  return apiFetch<{ success: boolean; is_pinned?: boolean; error?: string }>('/webhook/update-note', {
    method: 'POST',
    body: JSON.stringify({
      id,
      ...(updates.body !== undefined ? { body: updates.body } : {}),
      ...(updates.isPinned !== undefined ? { is_pinned: updates.isPinned } : {}),
    }),
  });
}

export function deleteNote(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-note', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

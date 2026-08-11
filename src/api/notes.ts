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

export function updateNote(id: number, body: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-note', {
    method: 'POST',
    body: JSON.stringify({ id, body }),
  });
}

export function deleteNote(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-note', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

import { apiFetch } from './client';
import { SavedView } from '../types/savedView';

export function fetchSavedViews<TFilters>(entityType: string) {
  return apiFetch<SavedView<TFilters>[]>(`/webhook/get-saved-views?entity_type=${entityType}`);
}

export function addSavedView<TFilters>(
  entityType: string,
  name: string,
  filters: TFilters,
  isShared: boolean
) {
  return apiFetch<{ success: boolean; view?: SavedView<TFilters>; error?: string }>('/webhook/add-saved-view', {
    method: 'POST',
    body: JSON.stringify({ entity_type: entityType, name, filters, is_shared: isShared }),
  });
}

export function deleteSavedView(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-saved-view', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export interface SavedViewUpdate<TFilters> {
  name?: string;
  filters?: TFilters;
  isShared?: boolean;
}

// Partial update — omit a field to leave it untouched server-side, same
// semantics as update-contact. Owner or admin only (enforced server-side).
export function updateSavedView<TFilters>(id: number, updates: SavedViewUpdate<TFilters>) {
  return apiFetch<{ success: boolean; view?: SavedView<TFilters>; error?: string }>('/webhook/update-saved-view', {
    method: 'POST',
    body: JSON.stringify({
      id,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.filters !== undefined ? { filters: updates.filters } : {}),
      ...(updates.isShared !== undefined ? { is_shared: updates.isShared } : {}),
    }),
  });
}

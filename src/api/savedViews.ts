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

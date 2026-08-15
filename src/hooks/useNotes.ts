import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/notes';

export function useNotes(entityType: string, entityId: number | null) {
  return useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: () => api.fetchNotes(entityType, entityId!),
    enabled: entityId != null,
  });
}

function useInvalidateNotes(entityType: string, entityId: number | null) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['notes', entityType, entityId] });
}

export function useAddNote(entityType: string, entityId: number | null) {
  const invalidate = useInvalidateNotes(entityType, entityId);
  return useMutation({
    mutationFn: ({ body, requesterId }: { body: string; requesterId?: number }) =>
      api.addNote(entityType, entityId!, body, requesterId),
    onSuccess: invalidate,
  });
}

export function useUpdateNote(entityType: string, entityId: number | null) {
  const invalidate = useInvalidateNotes(entityType, entityId);
  return useMutation({
    mutationFn: ({ id, body, isPinned }: { id: number; body?: string; isPinned?: boolean }) =>
      api.updateNote(id, { body, isPinned }),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(entityType: string, entityId: number | null) {
  const invalidate = useInvalidateNotes(entityType, entityId);
  return useMutation({
    mutationFn: (id: number) => api.deleteNote(id),
    onSuccess: invalidate,
  });
}

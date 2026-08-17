import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/nurtureSequences';

export function useNurtureSequences(enabled: boolean) {
  return useQuery({
    queryKey: ['nurture-sequences'],
    queryFn: api.fetchNurtureSequences,
    enabled,
  });
}

export function useSaveNurtureSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveNurtureSequence,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurture-sequences'] }),
  });
}

export function useUpdateNurtureSequenceActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateNurtureSequenceActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurture-sequences'] }),
  });
}

export function useDeleteNurtureSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteNurtureSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurture-sequences'] }),
  });
}

export function useTestNurtureStep() {
  return useMutation({ mutationFn: api.testNurtureStep });
}

export function useForceRunNurtureSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: number) => api.forceRunNurtureSequence(sequenceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurture-sequences'] }),
  });
}

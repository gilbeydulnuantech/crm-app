import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/opportunities';
import { Opportunity } from '../types/opportunity';

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: api.fetchPipelines,
  });
}

export function useStages(pipelineId?: number) {
  return useQuery({
    queryKey: ['stages', pipelineId],
    queryFn: () => api.fetchStages(pipelineId!),
    enabled: !!pipelineId,
  });
}

export function useOpportunities(pipelineId?: number) {
  return useQuery({
    queryKey: ['opportunities', pipelineId],
    queryFn: () => api.fetchOpportunities(pipelineId!),
    enabled: !!pipelineId,
  });
}

function useInvalidateOpportunities(pipelineId?: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['opportunities', pipelineId] });
}

export function useAddOpportunity(pipelineId?: number) {
  const invalidate = useInvalidateOpportunities(pipelineId);
  return useMutation({
    mutationFn: (payload: Partial<Opportunity>) => api.addOpportunity(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateOpportunity(pipelineId?: number) {
  const invalidate = useInvalidateOpportunities(pipelineId);
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Opportunity> }) =>
      api.updateOpportunity(id, payload),
    onSuccess: invalidate,
  });
}

export function useMoveOpportunityStage(pipelineId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage_id }: { id: number; stage_id: number }) =>
      api.moveOpportunityStage(id, stage_id),
    // Optimistic update so the card visually snaps to the new column
    // immediately instead of waiting on the round trip.
    onMutate: async ({ id, stage_id }) => {
      await qc.cancelQueries({ queryKey: ['opportunities', pipelineId] });
      const previous = qc.getQueryData<Opportunity[]>(['opportunities', pipelineId]);
      qc.setQueryData<Opportunity[]>(['opportunities', pipelineId], (old) =>
        old?.map((o) => (o.id === id ? { ...o, stage_id } : o))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['opportunities', pipelineId], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['opportunities', pipelineId] }),
  });
}

export function useDeleteOpportunities(pipelineId?: number) {
  const invalidate = useInvalidateOpportunities(pipelineId);
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteOpportunities(ids),
    onSuccess: invalidate,
  });
}

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/opportunities';
import { Opportunity } from '../types/opportunity';

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: api.fetchPipelines,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.NewPipelinePayload) => api.createPipeline(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
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

// get-opportunities/get-stages only take a single pipeline_id — there's no
// "all pipelines" endpoint. These fan out one query per pipeline (reusing
// the same ['opportunities', id]/['stages', id] cache keys the single-
// pipeline hooks already use) and merge the results, for views like the
// Calendar's Deals mode that need every deal regardless of pipeline.
export function useAllOpportunities(pipelineIds: number[]) {
  const results = useQueries({
    queries: pipelineIds.map((id) => ({
      queryKey: ['opportunities', id],
      queryFn: () => api.fetchOpportunities(id),
    })),
  });
  return {
    data: results.flatMap((r) => r.data ?? []),
    isLoading: results.some((r) => r.isLoading),
  };
}

export function useAllStages(pipelineIds: number[]) {
  const results = useQueries({
    queries: pipelineIds.map((id) => ({
      queryKey: ['stages', id],
      queryFn: () => api.fetchStages(id),
    })),
  });
  return {
    data: results.flatMap((r) => r.data ?? []),
    isLoading: results.some((r) => r.isLoading),
  };
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

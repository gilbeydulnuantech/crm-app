import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import * as api from '../api/opportunities';
import { Opportunity } from '../types/opportunity';

// useQueries returns a new `results` array every render, and a plain
// `.flatMap()` over it would hand callers a brand-new array reference every
// 15s poll even when nothing actually changed — that unstable reference
// then cascades through every useMemo downstream (Calendar's allDeals /
// visibleDeals / weekDeals / dayDeals), forcing the deals grid to re-render
// on a timer and reading as a visible "blink". Individual `r.data`
// references ARE stable across unchanged refetches (React Query's
// structural sharing), so caching on those lets everything downstream skip
// the pointless recompute.
function useStableFlatData<T>(results: { data?: T[] }[]): T[] {
  const cache = useRef<{ sources: (T[] | undefined)[]; result: T[] }>({ sources: [], result: [] });
  const sources = results.map((r) => r.data);
  const changed =
    sources.length !== cache.current.sources.length || sources.some((s, i) => s !== cache.current.sources[i]);
  if (changed) {
    cache.current = { sources, result: results.flatMap((r) => r.data ?? []) };
  }
  return cache.current.result;
}

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

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: api.UpdatePipelinePayload }) =>
      api.updatePipeline(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });
}

export function useUpdatePipelineStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, stages }: { pipelineId: number; stages: api.StageDraftPayload[] }) =>
      api.updatePipelineStages(pipelineId, stages),
    onSuccess: (_data, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: ['stages', pipelineId] });
      qc.invalidateQueries({ queryKey: ['opportunities', pipelineId] });
    },
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deletePipeline(id),
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
    data: useStableFlatData(results),
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
    data: useStableFlatData(results),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Opportunity> }) =>
      api.updateOpportunity(id, payload),
    // Optimistic update so status changes (Mark Won/Lost) reflect immediately
    // in things like PipelineStatsBar instead of waiting on the mutation
    // round trip plus a second refetch — same pattern as
    // useMoveOpportunityStage.
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['opportunities', pipelineId] });
      const previous = qc.getQueryData<Opportunity[]>(['opportunities', pipelineId]);
      qc.setQueryData<Opportunity[]>(['opportunities', pipelineId], (old) =>
        old?.map((o) => (o.id === id ? { ...o, ...payload } : o))
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteOpportunities(ids),
    // Optimistic removal so the card/column updates immediately instead of
    // waiting on the next poll — same pattern as useMoveOpportunityStage.
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['opportunities', pipelineId] });
      const previous = qc.getQueryData<Opportunity[]>(['opportunities', pipelineId]);
      qc.setQueryData<Opportunity[]>(['opportunities', pipelineId], (old) =>
        old?.filter((o) => !ids.includes(o.id))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['opportunities', pipelineId], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['opportunities', pipelineId] }),
  });
}

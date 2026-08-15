import { apiFetch } from './client';
import { Opportunity, Pipeline, Stage } from '../types/opportunity';

export function fetchPipelines() {
  return apiFetch<Pipeline[]>('/webhook/get-pipelines');
}

export interface NewPipelineStage {
  name: string;
  win_probability: number;
}

export interface NewPipelinePayload {
  name: string;
  is_default: boolean;
  stages: NewPipelineStage[];
}

export interface NewPipelineResult {
  id: number;
  name: string;
  is_default: boolean;
  stages: Stage[];
}

export function createPipeline(payload: NewPipelinePayload) {
  return apiFetch<NewPipelineResult>('/webhook/pipeline-create-new', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdatePipelinePayload {
  name: string;
  is_default: boolean;
}

export function updatePipeline(id: number, payload: UpdatePipelinePayload) {
  return apiFetch<{ success: boolean; pipeline?: Pipeline; error?: string }>('/webhook/update-pipeline', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

export function deletePipeline(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-pipeline', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export function fetchStages(pipelineId: number) {
  return apiFetch<Stage[]>(`/webhook/get-stages?pipeline_id=${pipelineId}`);
}

export interface StageDraftPayload {
  id: number | null; // null = new stage to insert
  name: string;
  win_probability: number;
}

export function updatePipelineStages(pipelineId: number, stages: StageDraftPayload[]) {
  return apiFetch<{ success: boolean; stages?: Stage[]; error?: string }>('/webhook/update-pipeline-stages', {
    method: 'POST',
    body: JSON.stringify({ pipeline_id: pipelineId, stages }),
  });
}

export function fetchOpportunities(pipelineId: number) {
  return apiFetch<Opportunity[]>(`/webhook/get-opportunities?pipeline_id=${pipelineId}`);
}

export function fetchArchivedOpportunities(pipelineId: number) {
  return apiFetch<Opportunity[]>(`/webhook/get-archived-opportunities?pipeline_id=${pipelineId}`);
}

export function addOpportunity(payload: Partial<Opportunity>) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>(
    '/webhook/add-opportunity',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function updateOpportunity(id: number, payload: Partial<Opportunity>) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-opportunity', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

// Dedicated endpoint for drag-and-drop stage moves — smaller payload, and
// lets the backend auto-set closed_at/status when the target stage is a
// "Closed Won"/"Closed Lost" stage.
export function moveOpportunityStage(id: number, stage_id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/move-opportunity-stage', {
    method: 'POST',
    body: JSON.stringify({ id, stage_id }),
  });
}

export function deleteOpportunities(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-opportunities', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// Restricted server-side to non-Open deals (status != 'Open') — archiving is
// for clearing closed (Won/Lost) deals off the active board, not for hiding
// deals still in progress.
export function archiveOpportunities(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/archive-opportunities', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function restoreOpportunities(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/restore-opportunities', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// Reuses the same generic tag-entity/untag-entity endpoints contacts use
// (see api/contacts.ts tagContact/untagContact) — entity_type is just a
// passthrough param on the backend, and get-opportunities already joins
// opportunity taggables into `tags`.
export async function tagOpportunity(opportunityId: number, tagId: number) {
  const result = await apiFetch<{ success?: boolean; error?: string }>('/webhook/tag-entity', {
    method: 'POST',
    body: JSON.stringify({ entity_type: 'opportunity', entity_id: opportunityId, tag_id: tagId }),
  });
  if (result?.success === false) {
    throw new Error(result.error || 'tag-entity returned success: false');
  }
  return result;
}

export async function untagOpportunity(opportunityId: number, tagId: number) {
  const result = await apiFetch<{ success?: boolean; error?: string }>('/webhook/untag-entity', {
    method: 'POST',
    body: JSON.stringify({ entity_type: 'opportunity', entity_id: opportunityId, tag_id: tagId }),
  });
  if (result?.success === false) {
    throw new Error(result.error || 'untag-entity returned success: false');
  }
  return result;
}

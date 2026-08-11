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

export function fetchStages(pipelineId: number) {
  return apiFetch<Stage[]>(`/webhook/get-stages?pipeline_id=${pipelineId}`);
}

export function fetchOpportunities(pipelineId: number) {
  return apiFetch<Opportunity[]>(`/webhook/get-opportunities?pipeline_id=${pipelineId}`);
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

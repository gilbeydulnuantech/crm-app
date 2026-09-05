import { apiFetch } from './client';

export interface DraftDealFollowupResult {
  success: boolean;
  draft: string;
  error?: string;
}

// Runs against a self-hosted Ollama instance (llama3.1) — see the "Draft
// Deal Follow-Up" n8n workflow. Can take 10-50s depending on whether the
// model is already warm in Ollama's memory.
export function draftDealFollowup(dealId: number) {
  return apiFetch<DraftDealFollowupResult>('/webhook/draft-deal-followup', {
    method: 'POST',
    body: JSON.stringify({ deal_id: dealId }),
  });
}

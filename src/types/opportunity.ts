export const DEAL_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type DealPriority = (typeof DEAL_PRIORITIES)[number];

export const DEAL_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Social Media',
  'Advertisement',
  'Trade Show',
  'Other',
] as const;

export interface Stage {
  id: number;
  pipeline_id: number;
  name: string;
  display_order: number;
  win_probability: number;
}

export interface Pipeline {
  id: number;
  name: string;
  is_default: boolean;
}

export interface Opportunity {
  id: number;
  name: string;
  contact_id: number | null;
  contact_name?: string; // joined
  account_id?: number | null;
  company_name?: string; // joined
  pipeline_id?: number | null;
  stage_id: number;
  assigned_user?: number | null;
  assigned_user_name?: string; // joined
  assigned_user_color?: string; // joined from users.color
  assigned_user_avatar_url?: string | null; // joined from users.avatar_url
  created_by?: number | null;
  // Write-only: the creating user's id, sent on add-opportunity so the
  // backend can attribute the "created deal" system-audit entry.
  requester_id?: number | null;
  deal_value?: number | null;
  probability?: number;
  status: 'Open' | 'Won' | 'Lost';
  lost_reason?: string | null;
  expected_close?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  description?: string | null;
  source?: string | null;
  priority?: DealPriority | null;
  is_archived?: boolean;
  archived_at?: string | null;
  // Reuses the generic taggables system (entity_type = 'opportunity') the
  // same way contacts already do — see get-opportunities' SQL.
  tags?: { id: number; name: string }[];
  // The linked contact's own tags (entity_type = 'contact', keyed off
  // contact_id) — joined separately from the deal's own `tags` above so
  // deal cards can surface who this contact is without duplicating the
  // opportunity taggables.
  contact_tags?: { id: number; name: string }[];
}

export type PipelineViewMode = 'board' | 'list';

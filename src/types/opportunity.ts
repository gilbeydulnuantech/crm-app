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
  contact_id: number;
  contact_name?: string; // joined
  account_id?: number | null;
  company_name?: string; // joined
  pipeline_id?: number | null;
  stage_id: number;
  assigned_user?: number | null;
  assigned_user_name?: string; // joined
  assigned_user_color?: string; // joined from users.color
  created_by?: number | null;
  deal_value?: number | null;
  probability?: number;
  status: 'Open' | 'Won' | 'Lost';
  lost_reason?: string | null;
  expected_close?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Reuses the generic taggables system (entity_type = 'opportunity') the
  // same way contacts already do — see get-opportunities' SQL.
  tags?: { id: number; name: string }[];
}

export type PipelineViewMode = 'board' | 'list';

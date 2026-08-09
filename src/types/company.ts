export interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  owner_id?: number | null;
  owner_name?: string; // joined from users in get-companies
  created_by?: number | null;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed via JOIN/aggregate in get-companies — not real columns.
  contact_count?: number;
  opportunity_count?: number;
  tags?: { id: number; name: string }[];
}

export type CompaniesView = 'all' | 'mine' | 'archived';

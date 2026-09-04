export const COMPANY_TIERS = ['Tier 1 (Enterprise)', 'Tier 2', 'Tier 3'] as const;
export type CompanyTier = (typeof COMPANY_TIERS)[number];

export const COMPANY_STATUSES = ['Prospect', 'Customer - Active', 'Customer - Churned', 'Partner'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_HEALTH_STATUSES = ['Good Standing', 'At Risk', 'New'] as const;
export type CompanyHealthStatus = (typeof COMPANY_HEALTH_STATUSES)[number];

export const COMPANY_REVENUE_BANDS = [
  '<$1M',
  '$1M - $10M',
  '$10M - $50M',
  '$50M - $250M',
  '$250M+',
] as const;

export const COMPANY_EMPLOYEE_BANDS = ['1-10', '11-50', '51-250', '250-500', '500-1000', '1000+'] as const;

export interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  street_address?: string;
  zip_code?: string;
  phone?: string;
  // Set when this company was imported via Find Leads (Google Maps) —
  // see the "Google Maps Lead Import" n8n workflow.
  lead_source?: string;
  google_place_id?: string;
  google_maps_url?: string;
  google_rating?: number;
  google_reviews_count?: number;
  google_category?: string;
  owner_id?: number | null;
  owner_name?: string; // joined from users in get-companies
  owner_color?: string; // joined from users.color in get-companies
  created_by?: number | null;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
  // Hierarchy
  parent_company_id?: number | null;
  parent_company_name?: string; // joined from companies self-join in get-companies
  // Firmographics
  tier?: CompanyTier | string | null;
  account_status?: CompanyStatus | string | null;
  account_health?: CompanyHealthStatus | string | null;
  annual_revenue?: string | null;
  employee_count?: string | null;
  territory?: string | null;
  // Account team
  se_user_id?: number | null;
  se_user_name?: string; // joined in get-companies
  csm_user_id?: number | null;
  csm_user_name?: string; // joined in get-companies
  // Computed via JOIN/aggregate in get-companies — not real columns.
  contact_count?: number;
  opportunity_count?: number;
  tags?: { id: number; name: string }[];
}

export type CompaniesView = 'all' | 'mine' | 'archived';

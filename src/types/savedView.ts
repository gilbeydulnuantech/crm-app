export interface SavedView<TFilters = Record<string, unknown>> {
  id: number;
  entity_type: string;
  name: string;
  filters: TFilters;
  created_at: string;
  user_id: number;
  is_shared: boolean;
  owner_name?: string;
}

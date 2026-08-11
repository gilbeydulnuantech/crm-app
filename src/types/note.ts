// entity_type/entity_id mirrors the taggables table's polymorphic pattern —
// notes are scoped to 'contact' today but the shape already supports
// attaching them to other entities later without a schema change.
export interface Note {
  id: number;
  entity_type: string;
  entity_id: number;
  body: string;
  created_by?: number | null;
  created_by_name?: string; // joined
  created_at: string;
  updated_at?: string | null;
}

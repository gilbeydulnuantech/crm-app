export interface ContactRelated {
  company?: {
    id: number;
    name: string;
  } | null;
  deal?: {
    id: number;
    name: string;
    deal_value: number | null;
    stage_name: string;
  } | null;
  task?: {
    id: number;
    subject: string;
    due_at: string | null;
  } | null;
  event?: {
    id: number;
    subject: string;
    due_at: string | null;
  } | null;
}

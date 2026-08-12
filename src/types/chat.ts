export type ConversationType = 'dm' | 'channel' | 'context';

export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string | null; // channel display name; null for dm/context
  peer_id?: number | null; // dm only — the other participant
  peer_name?: string | null;
  peer_color?: string | null;
  last_message_body?: string | null;
  last_message_at?: string | null;
  last_message_sender_name?: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  sender_color?: string;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
  edited_at?: string | null;
}

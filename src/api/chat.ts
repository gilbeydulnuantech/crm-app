import { apiFetch } from './client';
import { ChatMessage, Conversation } from '../types/chat';

export async function fetchConversations() {
  const conversations = await apiFetch<Conversation[]>('/webhook/get-conversations');
  // Postgres COUNT(*) is bigint, which node-postgres serializes as a string
  // to avoid JS precision loss — without this, `total + c.unread_count` in
  // reducers silently does string concatenation ("0" + "0" + "1" = "001")
  // instead of addition. The SQL already casts to ::int, but coercing here
  // too means a future query change can't reintroduce the bug silently.
  return conversations.map((c) => ({ ...c, unread_count: Number(c.unread_count) }));
}

export function fetchMessages(conversationId: number) {
  return apiFetch<ChatMessage[]>(`/webhook/get-messages?conversation_id=${conversationId}`);
}

export function sendMessage(conversationId: number, body: string) {
  return apiFetch<ChatMessage>('/webhook/send-message', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId, body }),
  });
}

export function markConversationRead(conversationId: number) {
  return apiFetch<{ success: boolean }>('/webhook/mark-conversation-read', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}

export function startDm(peerUserId: number) {
  return apiFetch<{ id: number }>('/webhook/start-dm', {
    method: 'POST',
    body: JSON.stringify({ peer_user_id: peerUserId }),
  });
}

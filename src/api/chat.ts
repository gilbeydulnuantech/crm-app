import { apiFetch } from './client';
import { ChatMessage, Conversation } from '../types/chat';

export function fetchConversations() {
  return apiFetch<Conversation[]>('/webhook/get-conversations');
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

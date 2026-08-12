import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/chat';

// 20s poll for the sidebar list (unread badges, last-message previews) —
// tighter than Dashboard's 30s since chat state changes more often, but
// still just polling, matching this app's no-websocket architecture.
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: api.fetchConversations,
    refetchInterval: 20_000,
  });
}

// Backs the notification bell — shares the ['conversations'] cache key with
// useConversations() (same pattern as useUnreadEmailContacts sharing
// ['contacts']), just with its own polling so the badge updates even when
// the Team Chat page isn't open.
export function useUnreadChatCount() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.fetchConversations,
    refetchInterval: 60_000,
  });
  return conversations.reduce((total, c) => total + c.unread_count, 0);
}

// Short-interval poll while a conversation is actually open — there's no
// websocket layer in this app, so "live" means polling fast enough to feel
// responsive without hammering the n8n/ngrok backend.
export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.fetchMessages(conversationId!),
    enabled: conversationId != null,
    refetchInterval: 4_000,
  });
}

export function useSendMessage(conversationId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(conversationId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: number) => api.markConversationRead(conversationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useStartDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (peerUserId: number) => api.startDm(peerUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

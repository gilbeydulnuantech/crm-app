import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/tickets';
import { TicketCommentChannel } from '../types/ticket';

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: api.fetchTickets,
    refetchInterval: 30000,
  });
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.fetchTicket(id as number),
    enabled: id != null,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateTicket,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', variables.id] });
    },
  });
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, body, channel }: { ticketId: number; body: string; channel?: TicketCommentChannel }) =>
      api.addTicketComment(ticketId, body, channel),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useArchiveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archiveTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/emailTemplates';
import { EmailTemplate } from '../api/emailTemplates';

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['emailTemplates'],
    queryFn: api.fetchEmailTemplates,
  });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveEmailTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailTemplates'] }),
  });
}

export function useSetEmailTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => api.setEmailTemplateActive(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailTemplates'] }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEmailTemplate(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<EmailTemplate[]>({ queryKey: ['emailTemplates'] }, (old) => old?.filter((t) => t.id !== id));
      qc.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });
}

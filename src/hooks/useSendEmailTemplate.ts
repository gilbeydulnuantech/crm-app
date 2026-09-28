import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/emailTemplates';

export function useSendEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.SendEmailTemplatePayload) => api.sendEmailTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
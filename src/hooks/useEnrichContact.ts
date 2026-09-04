import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enrichContact } from '../api/enrichContact';

export function useEnrichContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrichContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

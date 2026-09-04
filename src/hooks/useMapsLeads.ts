import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/mapsLeads';

export function useImportMapsLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.importMapsLeads,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

import { useMutation } from '@tanstack/react-query';
import { bulkEnrichContacts } from '../api/bulkEnrichContacts';

export function useBulkEnrichContacts() {
  return useMutation({ mutationFn: bulkEnrichContacts });
}

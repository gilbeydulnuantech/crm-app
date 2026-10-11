import { useQuery } from '@tanstack/react-query';
import { fetchDocumentBranding } from '../api/branding';

// One shared, rarely-changing lookup. refetchInterval is off (the app-wide 15s default would keep the PDF renderer's
// network-idle wait from ever settling), and a failure just means "no header" — a document must never fail to show.
export function useDocumentBranding() {
  return useQuery({
    queryKey: ['document-branding'],
    queryFn: fetchDocumentBranding,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

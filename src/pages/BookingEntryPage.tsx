import { useQuery } from '@tanstack/react-query';
import { fetchBookingOptions } from '../api/booking';
import GenericBookingPage from './GenericBookingPage';
import ProviderBookingPage from './ProviderBookingPage';

// /book: the original inspection booking, unless the admin switched on online booking with a chosen staff member
// (Settings > Industry & features), in which case clients see services, staff and their open times instead.
export default function BookingEntryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['booking-options'],
    queryFn: fetchBookingOptions,
    retry: false,
    refetchInterval: false,
  });
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }
  if (data?.success && data.enabled) return <ProviderBookingPage options={data} />;
  return <GenericBookingPage />;
}

import { useState } from 'react';
import { useBookingReminderStatus, useForceRunBookingReminder } from '../../hooks/useBookingReminders';

interface Props {
  contactId: number;
}

type StepStatus = 'sent' | 'pending' | 'missed';

const STATUS_DOT: Record<StepStatus, string> = {
  sent: 'bg-emerald-500',
  pending: 'bg-slate-300',
  missed: 'bg-rose-500',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  sent: 'Sent',
  pending: 'Pending',
  missed: 'Missed / cancelled',
};

// Contact-scoped view of the "Book confirmed: email reminders" n8n
// workflow's own state — same idea as GHL's per-contact automation log:
// green once a step fired, gray while it's still waiting on its 24h/2h
// delay, red if the appointment was cancelled/passed before that step
// ever sent. Force Run sends the next non-final step immediately,
// bypassing the wait — calls the same force-run-booking-reminder webhook
// the workflow itself exposes for this.
export default function BookingReminderStatusPanel({ contactId }: Props) {
  const { data: status, isLoading } = useBookingReminderStatus(contactId);
  const forceRun = useForceRunBookingReminder();
  const [forceRunError, setForceRunError] = useState<string | null>(null);

  if (isLoading) return null;
  if (!status) return null; // no meeting booked for this contact — nothing to show

  const isCancelledOrMoved = status.opportunity_status !== 'Open' || status.stage_id !== 19;
  const appointmentPassed = new Date(status.due_at).getTime() <= Date.now();

  function stepStatus(sent: boolean): StepStatus {
    if (sent) return 'sent';
    if (isCancelledOrMoved || appointmentPassed) return 'missed';
    return 'pending';
  }

  const steps: { key: 'confirmation' | 'booking_reminder_24h' | 'booking_reminder_2h'; label: string; status: StepStatus }[] = [
    { key: 'confirmation', label: 'Booking Confirmation', status: 'sent' },
    { key: 'booking_reminder_24h', label: 'Reminder: 24 hours before', status: stepStatus(status.reminder_24h_sent) },
    { key: 'booking_reminder_2h', label: 'Reminder: 2 hours before', status: stepStatus(status.reminder_2h_sent) },
  ];

  const nextStep = steps.find((s) => s.status === 'pending' && s.key !== 'confirmation') as
    | { key: 'booking_reminder_24h' | 'booking_reminder_2h'; label: string; status: StepStatus }
    | undefined;

  function handleForceRun() {
    if (!nextStep) return;
    setForceRunError(null);
    forceRun.mutate(
      { activityId: status!.activity_id, reminderStep: nextStep.key },
      { onError: (err) => setForceRunError(err instanceof Error ? err.message : 'Failed to force-run.') }
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Event: Contact Booked — Confirmed
        </h3>
        <button
          type="button"
          onClick={handleForceRun}
          disabled={!nextStep || forceRun.isPending}
          title={nextStep ? `Force-send "${nextStep.label}" now` : 'Nothing left to force-run'}
          className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-md disabled:opacity-40"
        >
          {forceRun.isPending ? 'Sending...' : 'Force Run'}
        </button>
      </div>
      <div className="space-y-1.5">
        {steps.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s.status]}`} />
            <span className="text-slate-700">{s.label}</span>
            <span className="text-slate-400 ml-auto">{STATUS_LABEL[s.status]}</span>
          </div>
        ))}
      </div>
      {forceRunError && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-2">{forceRunError}</p>
      )}
    </div>
  );
}

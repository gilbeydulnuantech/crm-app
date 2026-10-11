import { useEffect, useState } from 'react';
import { useMessagingSettings, useReminderLog, useSaveMessagingSettings, useSendTestMessage } from '../../hooks/useMessaging';

interface Props {
  open: boolean;
  onClose: () => void;
}

const HOUR_CHOICES = [72, 48, 24, 12, 3, 2, 1];
const inputClass =
  'w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const WA_BODY_HINT =
  'Hello {{1}}, this is a reminder of your {{2}} on {{3}} at {{4}}{{5}}.';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export default function MessagingModal({ open, onClose }: Props) {
  const { data, isLoading } = useMessagingSettings(open);
  const { data: log } = useReminderLog(open);
  const save = useSaveMessagingSettings();
  const test = useSendTestMessage();

  const [enabled, setEnabled] = useState(false);
  const [order, setOrder] = useState('whatsapp_sms');
  const [hours, setHours] = useState<number[]>([24, 2]);
  const [cc, setCc] = useState('7');
  const [waPhone, setWaPhone] = useState('');
  const [waToken, setWaToken] = useState('');
  const [clearWa, setClearWa] = useState(false);
  const [waTemplate, setWaTemplate] = useState('');
  const [waLang, setWaLang] = useState('en');
  const [smsKey, setSmsKey] = useState('');
  const [clearSms, setClearSms] = useState(false);
  const [smsSender, setSmsSender] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('');
  const [testChannel, setTestChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [testTo, setTestTo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.success) return;
    setEnabled(data.enabled);
    setOrder(data.channel_order);
    setHours(data.hours_before ?? []);
    setCc(data.default_country_code || '7');
    setWaPhone(data.wa_phone_number_id ?? '');
    setWaTemplate(data.wa_template_name ?? '');
    setWaLang(data.wa_template_lang || 'en');
    setSmsSender(data.sms_sender ?? '');
    setSmsTemplate(data.sms_template ?? '');
    setWaToken('');
    setSmsKey('');
    setClearWa(false);
    setClearSms(false);
  }, [data, open]);

  if (!open) return null;

  const toggleHour = (h: number) =>
    setHours((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h].sort((a, b) => b - a)));

  function handleSave() {
    setError(null);
    setMessage(null);
    if (hours.length > 4) return setError('Choose at most 4 reminder times.');
    save.mutate(
      {
        enabled,
        channel_order: order,
        hours_before: hours,
        default_country_code: cc,
        wa_phone_number_id: waPhone,
        wa_template_name: waTemplate,
        wa_template_lang: waLang,
        sms_sender: smsSender,
        sms_template: smsTemplate,
        ...(waToken ? { wa_token: waToken } : {}),
        ...(clearWa ? { clear_wa_token: true } : {}),
        ...(smsKey ? { sms_api_key: smsKey } : {}),
        ...(clearSms ? { clear_sms_key: true } : {}),
      },
      {
        onSuccess: (res) => (res.success ? setMessage('Saved.') : setError(res.error || 'Could not save.')),
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save.'),
      }
    );
  }

  function handleTest() {
    setError(null);
    setMessage(null);
    test.mutate(
      { channel: testChannel, to: testTo },
      {
        onSuccess: (res) => {
          if (res.error) return setError(res.error);
          const ok = res.status === 'sent' || res.success === true;
          (ok ? setMessage : setError)(res.detail || (ok ? 'Test message sent.' : 'The test message was not sent.'));
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Test failed.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Appointment reminders</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Clients get a WhatsApp and/or SMS before their appointment. Nothing is sent until you switch this on. Stored keys are never shown again.
        </p>

        {isLoading && <div className="text-sm text-slate-400">Loading…</div>}

        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded border-slate-300 text-[var(--theme-accent)]" />
          <span className="text-sm font-medium text-slate-700">Send reminders automatically</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Channels">
            <select value={order} onChange={(e) => setOrder(e.target.value)} className={inputClass}>
              <option value="whatsapp_sms">WhatsApp first, SMS if it fails</option>
              <option value="whatsapp">WhatsApp only</option>
              <option value="sms">SMS only</option>
            </select>
          </Field>
          <Field label="Default country code" hint="Used for numbers typed without one. Kazakhstan: 7">
            <input value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ''))} maxLength={4} className={inputClass} />
          </Field>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-600 mb-1">Send reminder before the appointment (up to 4)</div>
          <div className="flex flex-wrap gap-3">
            {HOUR_CHOICES.map((h) => (
              <label key={h} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={hours.includes(h)} onChange={() => toggleHour(h)} className="rounded border-slate-300 text-[var(--theme-accent)]" />
                {h} h
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Reminders can be sent at any hour, including at night.</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">WhatsApp (Meta Cloud API)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Phone number ID">
              <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Access token" hint={data?.has_wa_token ? 'A token is saved. Type a new one to replace it.' : 'Not set'}>
              <input type="password" autoComplete="new-password" value={waToken} onChange={(e) => setWaToken(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Template name">
              <input value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Template language">
              <input value={waLang} onChange={(e) => setWaLang(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {data?.has_wa_token && (
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={clearWa} onChange={(e) => setClearWa(e.target.checked)} /> Remove the saved token
            </label>
          )}
          <p className="text-[11px] text-slate-400 mt-2">
            Create a Utility template in Meta with 5 variables (client, service, date, time, therapist). Suggested body: <em>{WA_BODY_HINT}</em>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">SMS (Mobizon)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="API key" hint={data?.has_sms_key ? 'A key is saved. Type a new one to replace it.' : 'Not set'}>
              <input type="password" autoComplete="new-password" value={smsKey} onChange={(e) => setSmsKey(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Sender name (optional)">
              <input value={smsSender} onChange={(e) => setSmsSender(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {data?.has_sms_key && (
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer mb-2">
              <input type="checkbox" checked={clearSms} onChange={(e) => setClearSms(e.target.checked)} /> Remove the saved key
            </label>
          )}
          <Field label="SMS text" hint="Tokens: {{client_name}} {{service}} {{date}} {{time}} {{staff_part}} {{branch}} {{company}}">
            <textarea value={smsTemplate} onChange={(e) => setSmsTemplate(e.target.value)} rows={3} className={inputClass} />
          </Field>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">Send a test message</div>
          <p className="text-[11px] text-slate-400 mb-2">Save your settings first. The test uses what is saved.</p>
          <div className="flex gap-2">
            <select value={testChannel} onChange={(e) => setTestChannel(e.target.value as 'whatsapp' | 'sms')} className={inputClass + ' !w-32'}>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Phone number" className={inputClass} />
            <button
              type="button"
              onClick={handleTest}
              disabled={test.isPending || !testTo.trim()}
              className="shrink-0 px-3 py-1.5 text-sm font-medium border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50"
            >
              {test.isPending ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </div>

        {message && <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{message}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}

        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Recent reminders</div>
          {log && log.length > 0 ? (
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {log.map((r) => (
                <div key={r.id} className="px-3 py-1.5 text-xs flex items-center justify-between gap-3">
                  <span className="truncate text-slate-700">
                    {r.client || 'Client'} · {r.subject || 'Appointment'} · {r.hours_before} h before
                  </span>
                  <span className={'shrink-0 ' + (r.status === 'sent' ? 'text-green-600' : r.status === 'failed' ? 'text-red-600' : 'text-slate-400')} title={r.detail ?? ''}>
                    {r.status}{r.channel ? ` · ${r.channel}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400">Nothing sent yet.</div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="px-4 py-1.5 text-sm font-medium bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

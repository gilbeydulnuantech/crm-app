import { CardDisplaySettings, CardTextSize } from '../api/cardDisplay';
import { useCardDisplay, useSaveCardDisplay } from '../hooks/useCardDisplay';
import { useStaffFeature } from '../hooks/useIndustry';

const SIZES: { value: CardTextSize; label: string; px: number }[] = [
  { value: 'small', label: 'Small', px: 11 },
  { value: 'medium', label: 'Medium', px: 13 },
  { value: 'large', label: 'Large', px: 15 },
  { value: 'xlarge', label: 'Extra large', px: 17 },
];

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
      />
      {label}
    </label>
  );
}

// How event cards (calendar) and deal cards (calendar and Sales Pipeline) look for the signed-in person.
// Changes apply and save immediately.
export default function CardDisplayPanel() {
  const current = useCardDisplay();
  const staff = useStaffFeature();
  const save = useSaveCardDisplay();
  const settings: CardDisplaySettings = {
    text_size: current.text_size,
    bold_title: current.bold_title,
    show_time: current.show_time,
    show_contact: current.show_contact,
    show_price: current.show_price,
    show_staff: current.show_staff,
    show_commission: current.show_commission,
  };
  const update = (patch: Partial<CardDisplaySettings>) => save.mutate({ ...settings, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Text size</div>
        <div className="flex items-end gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ text_size: s.value })}
              aria-pressed={settings.text_size === s.value}
              title={s.label}
              className={`flex-1 py-1.5 rounded-lg border text-slate-700 leading-none ${
                settings.text_size === s.value
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)] font-semibold'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
              style={{ fontSize: s.px }}
            >
              Aa
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Show on cards</div>
        <Check checked={settings.bold_title} onChange={(v) => update({ bold_title: v })} label="Service name in bold" />
        <Check checked={settings.show_time} onChange={(v) => update({ show_time: v })} label="Time" />
        <Check checked={settings.show_contact} onChange={(v) => update({ show_contact: v })} label="Contact name" />
        <Check checked={settings.show_price} onChange={(v) => update({ show_price: v })} label="Price / deal value" />
        {staff.enabled && <Check checked={settings.show_staff} onChange={(v) => update({ show_staff: v })} label={staff.label} />}
        {staff.enabled && <Check checked={settings.show_commission} onChange={(v) => update({ show_commission: v })} label={`${staff.label} commission`} />}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Preview</div>
        <div className="rounded border-l-4 border-amber-400 bg-amber-100/70 px-2 py-1.5 text-slate-800 overflow-hidden" style={{ fontSize: 11 }}>
          <div style={current.zoomStyle}>
            {(settings.show_time || settings.show_price) && (
              <div className="font-medium flex items-center justify-between gap-2">
                <span>{settings.show_time ? '15:30 – 17:30' : ''}</span>
                {settings.show_price && <span>$25.00</span>}
              </div>
            )}
            <div style={{ fontWeight: settings.bold_title ? 700 : undefined }}>Oil Massage</div>
            {settings.show_contact && <div className="opacity-70">Jazzie Dronio</div>}
            {settings.show_staff && <div className="opacity-70">with Maria</div>}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Saved for you only. Deal names are always bold.</p>
      </div>
    </div>
  );
}

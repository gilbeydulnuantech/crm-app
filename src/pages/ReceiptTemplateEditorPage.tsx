import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReceiptTemplates, useSaveReceiptTemplate } from '../hooks/useReceiptTemplates';
import { DynamicField, insertAtCursor } from '../components/DynamicFieldDropdown';
import DynamicFieldsPanel from '../components/DynamicFieldsPanel';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Payments' "Send Receipt" action only fills these tokens — deal/contact
// tokens elsewhere in the app don't apply to a payment record.
const RECEIPT_FIELDS: DynamicField[] = [
  { token: '{{first_name}}', label: 'First Name', group: 'Contact' },
  { token: '{{deal_name}}', label: 'Deal Name', group: 'Deal' },
  { token: '{{payment_number}}', label: 'Payment Number', group: 'Payment' },
  { token: '{{amount}}', label: 'Amount', group: 'Payment' },
  { token: '{{payment_date}}', label: 'Payment Date', group: 'Payment' },
  { token: '{{company_name}}', label: 'Company Name', group: 'User' },
];

export default function ReceiptTemplateEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: templates = [] } = useReceiptTemplates();
  const saveTemplate = useSaveReceiptTemplate();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body' | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, templates, id]);

  function insertIntoActiveField(token: string) {
    if (activeField === 'subject') {
      insertAtCursor(subjectRef.current, subject, token, setSubject);
    } else if (activeField === 'body') {
      insertAtCursor(bodyRef.current, body, token, setBody);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give this template a name.');
    if (!subject.trim()) return setError('Write a subject line.');
    if (!body.trim()) return setError('Write the receipt body.');

    saveTemplate.mutate(
      { id: isEdit ? Number(id) : undefined, name: name.trim(), subject: subject.trim(), body },
      {
        onSuccess: () => navigate('/documents/templates'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/templates')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Receipt Template"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveTemplate.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveTemplate.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
            {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <input
                ref={subjectRef}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setActiveField('subject')}
                placeholder="e.g. Receipt for {{payment_number}}"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setActiveField('body')}
                rows={10}
                placeholder="Hi {{first_name}}, thanks for your payment of {{amount}} on {{payment_date}}."
                className={inputClass}
              />
            </div>
          </form>
        </div>

        <DynamicFieldsPanel fields={RECEIPT_FIELDS} activeField={activeField} onInsert={insertIntoActiveField} />
      </div>
    </div>
  );
}

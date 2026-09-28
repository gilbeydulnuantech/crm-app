import { FormEvent, useEffect, useRef, useState } from 'react';
import { Contact } from '../../types/contact';
import { useSendContactEmail } from '../../hooks/useContacts';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { useAuth } from '../../context/AuthContext';
import { fillContactEmailTokens } from '../../utils/emailTemplateTokens';

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

// Attachments are base64-encoded client-side and stored inline as data: URLs
// on the email_logs entry (jsonb) — no file storage/S3 exists for this app,
// so this keeps it self-contained. Caps exist to avoid bloating the contacts
// row: 4MB/file (grows ~33% as base64) and 3 files, well under typical
// webhook body-size limits (n8n/ngrok) but not unlimited.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 3;

interface PendingAttachment {
  name: string;
  url: string; // data: URL
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export default function ComposeEmailPopover({ contact, open, onClose }: Props) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendEmail = useSendContactEmail();
  const { data: templates = [] } = useEmailTemplates();
  const { data: companyProfile } = useCompanyProfile(open);

  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setAttachments([]);
      setError(null);
      setTemplateId('');
    }
  }, [open]);

  function handleTemplateSelect(id: string) {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setSubject(fillContactEmailTokens(t.subject, contact, companyProfile?.company_name || ''));
    setMessage(fillContactEmailTokens(t.body, contact, companyProfile?.company_name || ''));
  }

  if (!open) return null;

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const incoming = Array.from(files);
    if (attachments.length + incoming.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const tooBig = incoming.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is over the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const read = await Promise.all(
        incoming.map(async (f) => ({ name: f.name, url: await readFileAsDataUrl(f) }))
      );
      setAttachments((prev) => [...prev, ...read]);
    } catch {
      setError('Failed to read one of the selected files.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAttachment(name: string) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user?.email) {
      setError('Your account has no email on file — cannot set a sender address.');
      return;
    }
    sendEmail.mutate(
      { contactId: contact.id, subject, message, to: contact.email!, from: user.email, attachments },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send email.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Send Email</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {!contact.email ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2.5">
            This contact has no email address on file.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
              <input
                disabled
                value={contact.email}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-500"
              />
            </div>
            {templates.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Template</label>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                >
                  <option value="">Write from scratch...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject</label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Attachments</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFilesSelected(e.target.files)}
                disabled={attachments.length >= MAX_FILES}
                className="block w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border file:border-dashed file:border-slate-300 file:bg-white file:text-xs file:text-slate-600 hover:file:border-[var(--theme-accent)] hover:file:text-[var(--theme-accent)] disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Up to {MAX_FILES} files, {MAX_FILE_BYTES / (1024 * 1024)}MB each.
              </p>
              {attachments.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {attachments.map((a) => (
                    <li
                      key={a.name}
                      className="flex items-center justify-between gap-2 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
                    >
                      <span className="flex items-center gap-1.5 min-w-0 text-slate-600">
                        <i className="fa-solid fa-paperclip text-[10px] shrink-0" />
                        <span className="truncate">{a.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.name)}
                        className="text-slate-400 hover:text-rose-600 shrink-0"
                      >
                        <i className="fa-solid fa-xmark text-[10px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="p-2 text-xs rounded-md text-center bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendEmail.isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-md"
              >
                {sendEmail.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

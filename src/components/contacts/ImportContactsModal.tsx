import { ChangeEvent, useRef, useState } from 'react';
import { IMPORT_CONTACTS_MAX_ROWS, ImportContactRow, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { useImportContacts } from '../../hooks/useContacts';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TEMPLATE_HEADERS = ['first_name', 'last_name', 'email', 'phone', 'company_name', 'city', 'country', 'lead_status'];

// Minimal RFC4180-ish CSV parser — handles quoted fields (including embedded
// commas/newlines and "" escaped quotes), which a plain split(',') would
// mangle on anything exported from Excel/Sheets.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function rowsToContacts(rows: string[][]): ImportContactRow[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  return rows.slice(1).map((cells) => {
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const idx = headers.indexOf(key);
        if (idx !== -1) return (cells[idx] ?? '').trim();
      }
      return '';
    };
    return {
      first_name: get('first_name'),
      last_name: get('last_name'),
      email: get('email'),
      phone: get('phone'),
      company_name: get('company_name', 'company'),
      city: get('city'),
      country: get('country'),
      lead_status: get('lead_status') || LEAD_STATUS_OPTIONS[0],
    };
  });
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), 'Jane,Doe,jane@example.com,555-0100,Acme Roofing,Austin,USA,New'].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportContactsModal({ open, onClose }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportContactRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importContacts = useImportContacts();

  if (!open) return null;

  const validRows = rows.filter((r) => r.first_name);

  function reset() {
    setFileName(null);
    setRows([]);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = rowsToContacts(parseCsv(text));
      if (parsed.length === 0) {
        setError('No rows found in that file.');
        setRows([]);
        return;
      }
      if (parsed.length > IMPORT_CONTACTS_MAX_ROWS) {
        setError(`This file has ${parsed.length} rows — the importer accepts up to ${IMPORT_CONTACTS_MAX_ROWS} at a time.`);
        setRows([]);
        return;
      }
      setRows(parsed);
    } catch {
      setError('Could not read that file.');
      setRows([]);
    }
  }

  function handleImport() {
    setError(null);
    importContacts.mutate(validRows, {
      onSuccess: (res) => {
        setResult({ inserted: res.inserted_count, total: validRows.length });
        setRows([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to import contacts.'),
    });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Import Contacts</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              CSV with a header row: {TEMPLATE_HEADERS.join(', ')}. Only{' '}
              <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">first_name</code> is required.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="shrink-0 text-xs font-medium text-[var(--theme-accent)] hover:underline ml-3"
            >
              Download template
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelected}
            className="block w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border file:border-dashed file:border-slate-300 file:bg-white file:text-xs file:text-slate-600 hover:file:border-[var(--theme-accent)] hover:file:text-[var(--theme-accent)]"
          />

          {fileName && !error && rows.length > 0 && (
            <div className="p-2.5 text-xs rounded-lg bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)] border border-[var(--theme-accent-tint)]">
              {fileName}: {validRows.length} of {rows.length} row{rows.length === 1 ? '' : 's'} ready to import
              {validRows.length < rows.length &&
                ` (${rows.length - validRows.length} skipped — missing first name)`}
              .
            </div>
          )}

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {result && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-emerald-50 text-emerald-700 border border-emerald-200">
              Imported {result.inserted} of {result.total} contact{result.total === 1 ? '' : 's'}.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button
                type="button"
                disabled={validRows.length === 0 || importContacts.isPending}
                onClick={handleImport}
                className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
              >
                {importContacts.isPending ? 'Importing...' : `Import ${validRows.length || ''} Contact${validRows.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

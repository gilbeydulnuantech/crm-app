import { useState } from 'react';
import { useAddNote } from '../../hooks/useNotes';
import { useAuth } from '../../context/AuthContext';

interface Props {
  opportunityId: number | null;
  dealName?: string;
  onClose: () => void;
}

export default function AddDealNoteModal({ opportunityId, dealName, onClose }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addNote = useAddNote('opportunity', opportunityId);

  if (opportunityId == null) return null;

  function handleSubmit() {
    if (!body.trim()) return;
    setError(null);
    addNote.mutate(
      { body: body.trim(), requesterId: user?.id },
      {
        onSuccess: () => {
          setBody('');
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add note.'),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-800 mb-3">Add Note{dealName ? ` — ${dealName}` : ''}</h3>

        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note about this deal..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />

        {error && (
          <div className="mt-2 p-2 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || addNote.isPending}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
          >
            {addNote.isPending ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

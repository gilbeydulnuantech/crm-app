import { FormEvent, useState } from 'react';
import { useChangePassword } from '../../hooks/useContacts';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to change password.'),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <i className="fa-solid fa-circle-check text-emerald-500 text-2xl mb-2" />
            <p className="text-sm text-slate-700">Password updated.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
              <p className="text-[11px] text-slate-400 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={changePassword.isPending}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {changePassword.isPending && <i className="fa-solid fa-spinner fa-spin" />}
                Update Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import { useAuth } from '../../context/AuthContext';
import { useAllUsers, useUpdateUserRole, useUpdateUserActive } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import Avatar from '../Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UserManagementModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [], isLoading } = useAllUsers(open);
  const updateRole = useUpdateUserRole();
  const updateActive = useUpdateUserActive();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">User Management</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          New teammates create their own account on the sign-up page — manage their role and access here
          once they exist.
        </p>

        <div className="flex-1 overflow-y-auto px-6 mt-4 pb-6 space-y-1.5">
          {isLoading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading...</p>
          ) : (
            users.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg ${
                    u.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <Avatar name={u.name} size="sm" avatarUrl={u.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {toTitleCase(u.name)}
                      {isSelf && <span className="text-slate-400 font-normal"> (you)</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>

                  <select
                    value={u.role || 'user'}
                    disabled={isSelf || updateRole.isPending}
                    onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value as 'admin' | 'user' })}
                    className="px-2 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    type="button"
                    disabled={isSelf || updateActive.isPending}
                    onClick={() => updateActive.mutate({ userId: u.id, active: !u.active })}
                    title={isSelf ? 'You cannot deactivate your own account' : undefined}
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-40 ${
                      u.active
                        ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {u.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

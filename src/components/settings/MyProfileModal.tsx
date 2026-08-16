import { useAuth } from '../../context/AuthContext';
import { useUsers, useUpdateUserColor } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR } from '../../utils/userColor';
import Avatar from '../Avatar';
import UserColorPicker from '../calendar/UserColorPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MyProfileModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const updateUserColor = useUpdateUserColor();
  const currentUser = users.find((u) => u.id === user?.id);

  if (!open) return null;

  const fullName = user?.name ? toTitleCase(user.name) : '--';
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'User';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">My Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar name={user?.name ?? ''} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-slate-800">{fullName}</p>
              {currentUser && (
                <UserColorPicker
                  color={currentUser.color || DEFAULT_USER_COLOR}
                  onChange={(hex) => updateUserColor.mutate({ userId: currentUser.id, color: hex })}
                />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Role:{' '}
              <span className="font-medium text-slate-700">{roleLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

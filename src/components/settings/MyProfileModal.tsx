import { ChangeEvent, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUsers, useUpdateUserColor, useUploadAvatar } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR } from '../../utils/userColor';
import Avatar from '../Avatar';
import UserColorPicker from '../calendar/UserColorPicker';
import AvatarCropModal from './AvatarCropModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function MyProfileModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const updateUserColor = useUpdateUserColor();
  const uploadAvatar = useUploadAvatar();
  const currentUser = users.find((u) => u.id === user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  if (!open) return null;

  const fullName = user?.name ? toTitleCase(user.name) : '--';
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'User';

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo is too large (max 5MB).');
      return;
    }
    setCropFile(file);
  }

  function handleCropConfirm(croppedFile: File) {
    uploadAvatar.mutate(croppedFile, {
      onSuccess: () => setCropFile(null),
      onError: (err) => {
        setPhotoError(err instanceof Error ? err.message : 'Failed to upload photo.');
        setCropFile(null);
      },
    });
  }

  return (
    <>
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
          <div className="relative shrink-0">
            <Avatar name={user?.name ?? ''} size="lg" avatarUrl={currentUser?.avatar_url} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              title="Change photo"
              className="absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm disabled:opacity-50"
            >
              <i className={`fa-solid ${uploadAvatar.isPending ? 'fa-spinner fa-spin' : 'fa-camera'} text-[10px]`} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
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

        {photoError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-3">
            {photoError}
          </p>
        )}

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

      <AvatarCropModal
        file={cropFile}
        isSaving={uploadAvatar.isPending}
        onCancel={() => setCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

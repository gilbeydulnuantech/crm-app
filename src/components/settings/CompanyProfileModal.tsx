import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useCompanyProfile, useSaveCompanyProfile, useUploadCompanyLogo } from '../../hooks/useCompanyProfile';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function CompanyProfileModal({ open, onClose }: Props) {
  const { data, isLoading } = useCompanyProfile(open);
  const saveProfile = useSaveCompanyProfile();
  const uploadLogo = useUploadCompanyLogo();

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_LOGO_BYTES = 5 * 1024 * 1024;

  function handleLogoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLogoError(null);
    if (!file.type.startsWith('image/')) return setLogoError('Please choose an image file.');
    if (file.size > MAX_LOGO_BYTES) return setLogoError('Logo is too large (max 5MB).');

    uploadLogo.mutate(file, {
      onError: (err) => setLogoError(err instanceof Error ? err.message : 'Failed to upload logo.'),
    });
  }

  useEffect(() => {
    if (data) {
      setCompanyName(data.company_name);
      setEmail(data.email);
      setPhone(data.phone);
    }
  }, [data]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    saveProfile.mutate(
      { company_name: companyName.trim(), email: email.trim(), phone: phone.trim() },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">Company Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          Your own company's info — auto-fills the "Contractor" details on every new proposal, though each one
          still saves its own copy so past proposals stay accurate if you update this later.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {data?.logo_url ? (
                    <img src={data.logo_url} alt="Company logo" className="w-full h-full object-contain" />
                  ) : (
                    <i className="fa-solid fa-image text-slate-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                    className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {uploadLogo.isPending ? 'Uploading...' : data?.logo_url ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-0.5">Appears at the top of every proposal.</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              </div>
              {logoError && <p className="text-[11px] text-rose-600 mt-1">{logoError}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>

            {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}
            {saved && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">Saved.</p>
            )}

            <button
              type="submit"
              disabled={saveProfile.isPending}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveProfile.isPending ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

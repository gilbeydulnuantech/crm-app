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
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [brandColor, setBrandColor] = useState('#2563EB');
  const [timezone, setTimezone] = useState('America/New_York');
  const [emailBranding, setEmailBranding] = useState(false);
  const [footerNote, setFooterNote] = useState('');
  const [documentBranding, setDocumentBranding] = useState(false);
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
      setAddress(data.address || '');
      setWebsite(data.website || '');
      setBrandColor(data.brand_color || '#2563EB');
      setTimezone(data.timezone || 'America/New_York');
      setEmailBranding(data.email_branding_enabled === true);
      setFooterNote(data.email_footer_note || '');
      setDocumentBranding(data.document_branding_enabled === true);
    }
  }, [data]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    saveProfile.mutate(
      {
        company_name: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
        brand_color: brandColor,
        timezone,
        email_branding_enabled: emailBranding,
        email_footer_note: footerNote.trim(),
        document_branding_enabled: documentBranding,
      },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Company / Business Profile</h3>
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
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Branding</p>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Logo</label>
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
                    className="text-xs font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-50"
                  >
                    {uploadLogo.isPending ? 'Uploading...' : data?.logo_url ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-0.5">Appears at the top of every proposal and invoice.</p>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} placeholder="123 Business Street, City, State, ZIP" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://yourcompany.com" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-8 w-10 rounded border border-slate-200 shrink-0"
                />
                <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className={inputClass} />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Default accent color for new invoice templates.</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={documentBranding} onChange={(e) => setDocumentBranding(e.target.checked)} className="mt-0.5 rounded border-slate-300" />
                <span>
                  <span className="font-semibold">Show company header and footer on proposals and contracts</span>
                  <span className="block text-[11px] text-slate-400">
                    Adds your logo and company name at the top, and your address, phone, website and email at the bottom, on the page the
                    customer opens, the internal views, the editor previews and the signed PDF. Uses the same footer note as emails.
                  </span>
                </span>
              </label>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2.5 bg-slate-50">
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={emailBranding} onChange={(e) => setEmailBranding(e.target.checked)} className="mt-0.5 rounded border-slate-300" />
                <span>
                  <span className="font-semibold">Add company branding and signatures to emails</span>
                  <span className="block text-[11px] text-slate-400">
                    Puts your logo and company name at the top, your address, phone and website at the bottom, and the sender's
                    signature (set in My Profile) on every email the system sends.
                  </span>
                </span>
              </label>
              {emailBranding && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Footer note (optional)</label>
                    <textarea
                      value={footerNote}
                      onChange={(e) => setFooterNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className={inputClass}
                      placeholder="e.g. Licensed and insured. Reply to this email any time."
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 mb-1">Preview</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-[13px] text-slate-700">
                      <div className="pb-2 mb-3" style={{ borderBottom: `3px solid ${brandColor}` }}>
                        {data?.logo_url && <img src={data.logo_url} alt="" className="max-h-12 max-w-[180px] mb-1" />}
                        {companyName && (
                          <div className="font-bold text-base" style={{ color: brandColor }}>
                            {companyName}
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500">Your email text appears here…</p>
                      <p className="mt-2 text-slate-500 whitespace-pre-line">Sender's name{'\n'}Title · phone</p>
                      <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        {[address, phone, website, email].filter(Boolean).join(' · ')}
                        {footerNote && <div className="mt-1 whitespace-pre-line">{footerNote}</div>}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Applies to emails sent from automations, the template editor and the contact Send Email box.</p>
                  </div>
                </>
              )}
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

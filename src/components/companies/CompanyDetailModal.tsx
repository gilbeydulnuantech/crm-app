import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company } from '../../types/company';
import { Contact } from '../../types/contact';
import { useContacts } from '../../hooks/useContacts';
import { usePipelines, useAllOpportunities, useAllStages } from '../../hooks/useOpportunities';
import { useEntityActivity } from '../../hooks/useActivity';
import { useAddNote, useDeleteNote, useNotes, useUpdateNote } from '../../hooks/useNotes';
import { useUpdateCompany } from '../../hooks/useCompanies';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import DealFormModal from '../pipeline/DealFormModal';
import AddContactModal from '../contacts/AddContactModal';
import LogCallModal from '../LogCallModal';
import ComposeEmailPopover from '../contacts/ComposeEmailPopover';
import ActivityTimeline from '../ActivityTimeline';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Active: 'bg-blue-100 text-blue-800',
  Customer: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-slate-200 text-slate-600',
  Unqualified: 'bg-rose-100 text-rose-700',
  'Do Not Contact': 'bg-red-100 text-red-800',
};

const DEAL_SECTION_COLORS: Record<string, { text: string; border: string }> = {
  active: { text: 'text-blue-600', border: 'border-blue-200' },
  won: { text: 'text-emerald-600', border: 'border-emerald-200' },
  lost: { text: 'text-rose-600', border: 'border-rose-200' },
};

interface Props {
  company: Company | null;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onContactClick?: (contactId: number) => void;
  onViewHierarchy?: (company: Company) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

export default function CompanyDetailModal({
  company,
  onClose,
  onEdit,
  onContactClick,
  onViewHierarchy,
  isAdmin,
  currentUserId,
}: Props) {
  const navigate = useNavigate();
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const { data: allContacts = [], isLoading: contactsLoading } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  // Fan out across every pipeline (not just the default one) so a deal
  // living in any pipeline still shows up here — matches ContactDetailModal.
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: opportunities = [], isLoading: oppsLoading } = useAllOpportunities(pipelineIds);
  const { data: stages = [] } = useAllStages(pipelineIds);
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('company', company?.id ?? null);
  const { data: notes = [], isLoading: notesLoading } = useNotes('company', company?.id ?? null);
  const addNote = useAddNote('company', company?.id ?? null);
  const updateNote = useUpdateNote('company', company?.id ?? null);
  const deleteNote = useDeleteNote('company', company?.id ?? null);
  const updateCompany = useUpdateCompany();

  if (!company) return null;

  // View All, Edit Owned Only: matches Contacts/Companies table policy.
  const canEdit = isAdmin || company.owner_id === currentUserId;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);
  const companyOpportunities = opportunities.filter((o) => o.account_id === company.id);
  // Grouped into sections (Active, Closed Won, Closed Lost) instead of one
  // flat list, so closed deals are easy to spot separately from open ones.
  const dealSections = [
    { key: 'active', label: 'Active', items: companyOpportunities.filter((d) => d.status === 'Open') },
    { key: 'won', label: 'Closed Won', items: companyOpportunities.filter((d) => d.status === 'Won') },
    { key: 'lost', label: 'Closed Lost', items: companyOpportunities.filter((d) => d.status === 'Lost') },
  ].filter((section) => section.items.length > 0);
  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.name ?? '--';

  function openAddDeal() {
    setDealFormOpen(true);
  }

  // Takes over the deal's real pipeline (it may not be the default one) and
  // switches the board to it, scrolling the specific card into view and
  // ringing it for a few seconds (Pipeline.tsx's ?highlight= deep link) —
  // matches ContactDetailModal's openPipelineView.
  function openPipelineView(dealId: number, dealPipelineId?: number | null) {
    onClose();
    const pid = dealPipelineId ?? defaultPipelineId;
    navigate(`/pipeline?pipeline=${pid}&highlight=${dealId}`);
  }

  function handleClaimOwnership() {
    if (!currentUserId) return;
    updateCompany.mutate({ id: company!.id, payload: { owner_id: currentUserId } });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — just the close button; company identity/actions now live at the top of the left column */}
        <div className="flex justify-end px-4 py-2 shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* 3-column body */}
        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Column 1: Identity + Firmographics + Contacts + Opportunities */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-5">
            <div className="border border-slate-200 rounded-xl p-4 space-y-1.5">
              <h2 className="text-base font-bold text-slate-800 truncate flex items-center gap-1.5">
                {toTitleCase(company.name)}
                {company.tier && <span className="text-xs text-slate-400 font-medium">({company.tier})</span>}
                {canEdit && (
                  <button
                    onClick={() => onEdit(company)}
                    className="text-slate-300 hover:text-indigo-600"
                    title="Edit company"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                )}
                {onViewHierarchy && (
                  <button
                    onClick={() => onViewHierarchy(company)}
                    className="text-slate-300 hover:text-indigo-600"
                    title="View account hierarchy"
                  >
                    <i className="fa-solid fa-sitemap text-xs" />
                  </button>
                )}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                {company.parent_company_name && <span>Parent: {toTitleCase(company.parent_company_name)}</span>}
                {company.parent_company_name && company.industry && <span className="text-slate-300">|</span>}
                {company.industry && <span>Industry: {toTitleCase(company.industry)}</span>}
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1.5">
                  Owner:
                  {company.owner_name ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full"
                      style={{
                        backgroundColor: hexToRgba(company.owner_color || DEFAULT_USER_COLOR, 0.14),
                        color: company.owner_color || DEFAULT_USER_COLOR,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: company.owner_color || DEFAULT_USER_COLOR }}
                      />
                      {toTitleCase(company.owner_name)}
                    </span>
                  ) : (
                    'Unassigned'
                  )}
                </span>
                {!company.owner_id && currentUserId && (
                  <button
                    onClick={handleClaimOwnership}
                    className="ml-1 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50"
                  >
                    Claim Ownership
                  </button>
                )}
              </p>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Firmographics</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <DetailField label="Website" value={company.website} />
                  <DetailField label="Phone" value={company.phone} />
                  <DetailField label="Revenue" value={company.annual_revenue ?? undefined} />
                  <DetailField label="Employees" value={company.employee_count ?? undefined} />
                  <DetailField
                    label="Location"
                    value={toTitleCase(
                      [company.street_address, company.city, company.state, company.zip_code, company.country]
                        .filter(Boolean)
                        .join(', ')
                    )}
                  />
                  <DetailField label="Region" value={company.territory ?? undefined} />
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      company.is_archived ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${company.is_archived ? 'bg-slate-400' : 'bg-emerald-500'}`}
                    />
                    {company.is_archived ? 'Archived' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Associated Contacts ({companyContacts.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setAddContactOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Add
                  </button>
                )}
              </div>

              {contactsLoading ? (
                <p className="text-sm text-slate-400">Loading contacts...</p>
              ) : companyContacts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No contacts linked to this company yet. Add or edit a contact and pick this
                  company to link them here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {companyContacts.map((c) => {
                    const fullName = toTitleCase(`${c.first_name} ${c.last_name}`.trim()) || 'No Name';
                    const status = c.lead_status || 'New';
                    return (
                      <button
                        key={c.id}
                        onClick={() => onContactClick?.(c.id)}
                        className="w-full text-left px-3 py-2.5 space-y-1 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate hover:text-indigo-600">
                            {fullName}
                            {(c.company_role || c.job_title) && (
                              <span className="text-slate-400 font-normal">
                                {' '}
                                ({toTitleCase(c.company_role || c.job_title || '')})
                              </span>
                            )}
                          </p>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                              STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400 truncate">{c.email || '--'}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogCallOpen(true);
                              }}
                              title="Log a call"
                              className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <i className="fa-solid fa-phone text-[10px]" />
                            </span>
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.email) setEmailContact(c);
                              }}
                              title="Email"
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 ${
                                !c.email ? 'opacity-30 pointer-events-none' : ''
                              }`}
                            >
                              <i className="fa-solid fa-envelope text-[10px]" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Opportunities ({companyOpportunities.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={openAddDeal}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + New Deal
                  </button>
                )}
              </div>

              {oppsLoading ? (
                <p className="text-sm text-slate-400">Loading opportunities...</p>
              ) : companyOpportunities.length === 0 ? (
                <p className="text-xs text-slate-400">No opportunities for this company yet.</p>
              ) : (
                <div className="space-y-4">
                  {dealSections.map((section) => {
                    const color = DEAL_SECTION_COLORS[section.key] ?? { text: 'text-slate-400', border: 'border-slate-200' };
                    return (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${color.text}`}>
                          {section.label}
                        </span>
                        <div className={`flex-1 border-t ${color.border}`} />
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {section.items.map((d) => {
                          const isClosed = d.status !== 'Open';
                          const closeDate = isClosed ? d.closed_at ?? d.created_at : d.expected_close;
                          return (
                            <div key={d.id} className="px-3 py-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{toTitleCase(d.name)}</p>
                                <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                  {d.deal_value != null
                                    ? `$${Number(d.deal_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : '--'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate">
                                Stage: {stageName(d.stage_id)}
                                {closeDate &&
                                  ` | ${isClosed ? 'Closed' : 'Close'}: ${new Date(closeDate).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: '2-digit',
                                    year: 'numeric',
                                  })}`}
                              </p>
                              {d.status === 'Lost' && d.lost_reason && (
                                <p className="text-xs text-rose-600">Lost Reason: {d.lost_reason}</p>
                              )}
                              <button
                                onClick={() => openPipelineView(d.id, d.pipeline_id)}
                                className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                              >
                                View Deal
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Activity Timeline */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Activity Timeline</h3>
            <ActivityTimeline activity={activity} isLoading={activityLoading} onEmailClick={() => {}} />
          </div>

          {/* Column 3: Notes & Account Team */}
          <div className="overflow-y-auto p-5 space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</h3>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a note about this company..."
                rows={4}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {noteError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-1.5">
                  {noteError}
                </p>
              )}
              <button
                disabled={!canEdit || !noteDraft.trim() || addNote.isPending}
                onClick={() => {
                  setNoteError(null);
                  addNote.mutate(
                    { body: noteDraft.trim(), requesterId: currentUserId },
                    {
                      onSuccess: () => setNoteDraft(''),
                      onError: (err) => setNoteError(err instanceof Error ? err.message : 'Failed to add note.'),
                    }
                  );
                }}
                className="w-full mt-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addNote.isPending ? 'Adding...' : '+ Add Note'}
              </button>

              <div className="space-y-2 pt-2">
                {notesLoading ? (
                  <p className="text-xs text-slate-400 italic">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes yet.</p>
                ) : (
                  notes.map((note) => {
                    const canEditNote = isAdmin || note.created_by === currentUserId;
                    const isEditing = editingNoteId === note.id;
                    return (
                      <div key={note.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {note.created_by_name ? toTitleCase(note.created_by_name) : 'Unknown'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                            {note.updated_at ? ' (edited)' : ''}
                          </span>
                        </div>
                        {isEditing ? (
                          <>
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              rows={3}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex justify-end gap-3 pt-0.5">
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() =>
                                  updateNote.mutate(
                                    { id: note.id, body: editDraft.trim() },
                                    { onSuccess: () => setEditingNoteId(null) }
                                  )
                                }
                                disabled={!editDraft.trim() || updateNote.isPending}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-600 text-xs whitespace-pre-wrap">{note.body}</p>
                            {canEditNote && (
                              <div className="flex justify-end gap-3 pt-0.5">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditDraft(note.body);
                                  }}
                                  className="text-[10px] font-medium text-slate-400 hover:text-indigo-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this note?')) deleteNote.mutate(note.id);
                                  }}
                                  className="text-[10px] font-medium text-slate-400 hover:text-rose-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Account Team</h3>
              <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                <TeamMemberRow
                  label="Owner"
                  name={company.owner_name}
                  color={company.owner_color}
                />
                <TeamMemberRow label="SE" name={company.se_user_name} />
                <TeamMemberRow label="CS Rep" name={company.csm_user_name} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={null}
          pipelineId={defaultPipelineId}
          defaultAccountId={company.id}
          defaultCompanyName={company.name}
          onClose={() => setDealFormOpen(false)}
        />
      )}
      <AddContactModal
        open={addContactOpen}
        defaultAccountId={company.id}
        defaultCompanyName={company.name}
        onClose={() => setAddContactOpen(false)}
      />
      <LogCallModal
        open={logCallOpen}
        entityType="company"
        entityId={company.id}
        entityLabel={company.name}
        onClose={() => setLogCallOpen(false)}
      />
      {emailContact && (
        <ComposeEmailPopover contact={emailContact} open onClose={() => setEmailContact(null)} />
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700 break-words">{value || '--'}</p>
    </div>
  );
}

function TeamMemberRow({ label, name, color }: { label: string; name?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}:</span>
      {name ? (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
          style={{
            backgroundColor: hexToRgba(color || DEFAULT_USER_COLOR, 0.14),
            color: color || DEFAULT_USER_COLOR,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color || DEFAULT_USER_COLOR }} />
          {toTitleCase(name)}
        </span>
      ) : (
        <span className="text-slate-400 text-[11px]">Unassigned</span>
      )}
    </div>
  );
}

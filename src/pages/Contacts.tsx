import { useEffect, useMemo, useState } from 'react';
import { Contact, ContactsView } from '../types/contact';
import { useAuth } from '../context/AuthContext';
import {
  useArchivedContacts,
  useArchiveContacts,
  useContacts,
  useContactIdsByTag,
  useDeleteContacts,
  useRestoreContacts,
  useTags,
  useUsers,
} from '../hooks/useContacts';
import { usePipelines, useStages } from '../hooks/useOpportunities';
import { useCompanies } from '../hooks/useCompanies';
import ContactsStatsBar from '../components/contacts/ContactsStatsBar';
import ContactsTabs from '../components/contacts/ContactsTabs';
import ContactsFilterRow from '../components/contacts/ContactsFilterRow';
import ContactsFilterModal, { AdvancedFilterValue } from '../components/contacts/ContactsFilterModal';
import ManageColumnsModal, { DEFAULT_VISIBLE_COLUMNS } from '../components/contacts/ManageColumnsModal';
import ContactsTable from '../components/contacts/ContactsTable';
import ArchivedContactsTable from '../components/contacts/ArchivedContactsTable';
import BulkActionsMenu from '../components/contacts/BulkActionsMenu';
import AddContactModal from '../components/contacts/AddContactModal';
import ContactDetailModal from '../components/contacts/ContactDetailModal';
import ArchiveReasonModal from '../components/contacts/ArchiveReasonModal';
import SearchToolbar from '../components/SearchToolbar';

const EMPTY_FILTERS = { tag: '', owner: '', company: '', status: '' };
const EMPTY_ADVANCED_FILTERS: AdvancedFilterValue = { company: '', stage: '', task: '' };
const COLUMNS_STORAGE_KEY = 'contacts-visible-columns';

function loadVisibleColumns(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    return raw ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(raw) } : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export default function Contacts() {
  const { user, isAdmin } = useAuth();

  const [view, setView] = useState<ContactsView>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValue>(EMPTY_ADVANCED_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(loadVisibleColumns);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [archiveTargetIds, setArchiveTargetIds] = useState<number[] | null>(null);

  const { data: allContacts = [], isLoading } = useContacts();
  const { data: archivedContacts = [], isLoading: isLoadingArchived } = useArchivedContacts(
    view === 'archived'
  );
  const { data: users = [] } = useUsers();
  const { data: tags = [] } = useTags();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  const { data: stages = [] } = useStages(defaultPipelineId);

  const archiveContacts = useArchiveContacts();
  const deleteContacts = useDeleteContacts();
  const restoreContacts = useRestoreContacts();

  // Persist column visibility across sessions.
  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Keep the detail modal's contact object reactive to list updates (tag
  // assignment, owner change, status change) instead of showing a stale
  // snapshot from the moment the row was clicked.
  const activeContact = useMemo(
    () => allContacts.find((c) => c.id === activeContactId) ?? null,
    [allContacts, activeContactId]
  );

  function changeView(next: ContactsView) {
    setView(next);
    setSelectedIds(new Set());
  }

  function openEditModal(contact: Contact) {
    setEditingContact(contact);
    setAddOpen(true);
  }

  function openAddModal() {
    setEditingContact(null);
    setAddOpen(true);
  }

  function handleDeleteOne(contact: Contact) {
    if (isAdmin) {
      const fullName = `${contact.first_name} ${contact.last_name}`.trim();
      if (!confirm(`PERMANENT DELETE: Remove ${fullName || 'this contact'} forever?`)) return;
      deleteContacts.mutate([contact.id]);
    } else {
      setArchiveTargetIds([contact.id]);
    }
  }

  // Company options come from the real companies table, not from contacts'
  // (possibly-unjoined) company_name field — otherwise this dropdown stays
  // empty until get-contacts is updated to embed it.
  const { data: allCompaniesForFilter = [] } = useCompanies();
  const companies = useMemo(
    () => allCompaniesForFilter.map((c) => ({ value: String(c.id), label: c.name })),
    [allCompaniesForFilter]
  );

  const stageOptions = useMemo(
    () => stages.map((s) => ({ value: s.name, label: s.name })),
    [stages]
  );

  const ownerOptions = users.map((u) => ({ value: String(u.id), label: u.name }));
  // Tag id, not name — filter-contacts-by-tag takes an id, and matching by
  // name against contact.tags never worked since that field isn't in the
  // get-contacts list payload (see n8n-workflows/README.md).
  const tagOptions = tags.map((t) => ({ value: t.name, label: t.name }));
  const statusOptions = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Customer'].map((s) => ({
    value: s,
    label: s,
  }));

  const tagFilterName = filters.tag || null;
  const { data: taggedContactIds } = useContactIdsByTag(tagFilterName);

  const visibleContacts = useMemo(() => {
    let list = view === 'mine' ? allContacts.filter((c) => c.owner_id === user?.id) : allContacts;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        `${c.first_name} ${c.last_name} ${c.email ?? ''} ${c.company_name ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (filters.owner) list = list.filter((c) => String(c.owner_id) === filters.owner);
    if (filters.company) list = list.filter((c) => String(c.account_id) === filters.company);
    if (filters.status) list = list.filter((c) => c.lead_status === filters.status);
    if (filters.tag) {
      // While the lookup is loading, show nothing rather than everything —
      // avoids a flash of unfiltered results.
      list = list.filter((c) => taggedContactIds?.has(c.id) ?? false);
    }

    // Advanced filters (Company / Pipeline Stage / Task), from the Filters button.
    if (advancedFilters.company) {
      list = list.filter((c) => String(c.account_id) === advancedFilters.company);
    }
    if (advancedFilters.stage) {
      // Requires get-contacts to join in stage_name — see AdvancedFilterValue
      // note / n8n-workflows/README.md. Falls back to matching nothing if
      // the backend hasn't been updated yet, rather than showing wrong results.
      list = list.filter((c) => c.stage_name === advancedFilters.stage);
    }
    if (advancedFilters.task === 'has_task') {
      list = list.filter((c) => c.has_open_task);
    } else if (advancedFilters.task === 'no_task') {
      list = list.filter((c) => !c.has_open_task);
    } else if (advancedFilters.task === 'overdue') {
      // Same backend-join caveat — has_open_task doesn't distinguish overdue
      // vs upcoming yet without an additional field.
      list = list.filter((c) => c.has_open_task);
    }

    return list;
  }, [allContacts, view, user, search, filters, advancedFilters, taggedContactIds]);

  // Non-admins only see archived contacts tied to them (owned by them, or
  // archived by them) — admins see every archived contact across all users.
  const visibleArchivedContacts = useMemo(() => {
    if (isAdmin) return archivedContacts;
    return archivedContacts.filter(
      (c) => c.owner_id === user?.id || c.archived_by === user?.id
    );
  }, [archivedContacts, isAdmin, user]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: allContacts.length,
      mine: allContacts.filter((c) => c.owner_id === user?.id).length,
      archived: visibleArchivedContacts.length,
      newToday: allContacts.filter(
        (c) => c.created_at && new Date(c.created_at).toDateString() === today
      ).length,
    };
  }, [allContacts, visibleArchivedContacts, user]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const list = view === 'archived' ? visibleArchivedContacts : visibleContacts;
    setSelectedIds((prev) =>
      list.every((c) => prev.has(c.id)) ? new Set() : new Set(list.map((c) => c.id))
    );
  }

  function handleArchive() {
    if (selectedIds.size === 0) return;
    setArchiveTargetIds(Array.from(selectedIds));
  }

  function handleConfirmArchive(reason: string) {
    if (!archiveTargetIds) return;
    archiveContacts.mutate(
      { ids: archiveTargetIds, reason },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setArchiveTargetIds(null);
        },
      }
    );
  }

  function handleRestore() {
    if (selectedIds.size === 0) return;
    restoreContacts.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleDeletePermanently() {
    if (selectedIds.size === 0) return;
    if (!confirm(`PERMANENT DELETE: Remove ${selectedIds.size} contact(s) forever?`)) return;
    deleteContacts.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleExport() {
    const list = view === 'archived' ? visibleArchivedContacts : visibleContacts;
    if (list.length === 0) return;
    const rows = list.map((c) => ({
      Name: `${c.first_name} ${c.last_name}`.trim(),
      Company: c.company_name ?? '',
      Email: c.email ?? '',
      Phone: c.phone ?? '',
      Status: c.lead_status ?? '',
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800">Contacts</h1>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Contact</span>
        </button>
      </div>

      <ContactsStatsBar {...stats} />
      <ContactsTabs view={view} onChange={changeView} />

      {view !== 'archived' && (
        <>
          <SearchToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search contacts..."
            onFiltersClick={() => setFilterModalOpen(true)}
            onColumnsClick={() => setColumnsModalOpen(true)}
          />
          <ContactsFilterRow
            tags={tagOptions}
            owners={ownerOptions}
            companies={companies}
            statuses={statusOptions}
            value={filters}
            onChange={setFilters}
          />
          <ContactsTable
            contacts={visibleContacts}
            selectedIds={selectedIds}
            visibleColumns={visibleColumns}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={(c) => setActiveContactId(c.id)}
            onEdit={openEditModal}
            onDelete={handleDeleteOne}
            isLoading={isLoading}
          />
        </>
      )}

      {view === 'archived' && (
        <ArchivedContactsTable
          contacts={visibleArchivedContacts}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          isLoading={isLoadingArchived}
        />
      )}

      <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-slate-400 font-medium">
              {selectedIds.size} selected
            </span>
          )}
          <BulkActionsMenu
            view={view}
            selectedCount={selectedIds.size}
            isAdmin={isAdmin}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDeletePermanently={handleDeletePermanently}
            onExport={handleExport}
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing {view === 'archived' ? visibleArchivedContacts.length : visibleContacts.length} of{' '}
          {view === 'archived' ? visibleArchivedContacts.length : allContacts.length}
        </span>
      </div>

      <AddContactModal
        open={addOpen}
        contact={editingContact}
        onClose={() => {
          setAddOpen(false);
          setEditingContact(null);
        }}
      />
      <ContactDetailModal contact={activeContact} onClose={() => setActiveContactId(null)} />
      <ContactsFilterModal
        open={filterModalOpen}
        value={advancedFilters}
        companies={companies}
        stages={stageOptions}
        onChange={setAdvancedFilters}
        onClose={() => setFilterModalOpen(false)}
      />
      <ManageColumnsModal
        open={columnsModalOpen}
        visible={visibleColumns}
        onChange={setVisibleColumns}
        onClose={() => setColumnsModalOpen(false)}
      />
      <ArchiveReasonModal
        open={archiveTargetIds !== null}
        count={archiveTargetIds?.length ?? 0}
        isSubmitting={archiveContacts.isPending}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTargetIds(null)}
      />
    </div>
  );
}

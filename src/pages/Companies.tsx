import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VisibilityState } from '@tanstack/react-table';
import { Company, CompaniesView } from '../types/company';
import { useAuth } from '../context/AuthContext';
import {
  useArchivedCompanies,
  useArchiveCompanies,
  useCompanies,
  useDeleteCompanies,
  useRestoreCompanies,
} from '../hooks/useCompanies';
import { useContacts, useUsers } from '../hooks/useContacts';
import CompaniesTabs from '../components/companies/CompaniesTabs';
import CompaniesFilterRow, {
  CompaniesFilterValue,
} from '../components/companies/CompaniesFilterRow';
import CompaniesTable, {
  CompaniesColumnsMenu,
  DEFAULT_COMPANY_COLUMN_VISIBILITY,
} from '../components/companies/CompaniesTable';
import CompaniesBulkActionsMenu from '../components/companies/CompaniesBulkActionsMenu';
import CompanyFormModal from '../components/companies/CompanyFormModal';
import CompanyDetailModal from '../components/companies/CompanyDetailModal';
import CompanyHierarchyModal from '../components/companies/CompanyHierarchyModal';
import ContactDetailModal from '../components/contacts/ContactDetailModal';
import SearchToolbar from '../components/SearchToolbar';
import ConfirmDialog from '../components/ConfirmDialog';

const EMPTY_FILTERS: CompaniesFilterValue = { industry: '', owner: '', tag: '' };
const DENSITY_STORAGE_KEY = 'companies-row-density';

export default function Companies() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<CompaniesView>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CompaniesFilterValue>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [hierarchyCompanyId, setHierarchyCompanyId] = useState<number | null>(null);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [bulkArchiveConfirmOpen, setBulkArchiveConfirmOpen] = useState(false);
  const [bulkArchiveError, setBulkArchiveError] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleteTargetError, setDeleteTargetError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COMPANY_COLUMN_VISIBILITY);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    () => (localStorage.getItem(DENSITY_STORAGE_KEY) as 'comfortable' | 'compact' | null) ?? 'comfortable'
  );

  function changeDensity(next: 'comfortable' | 'compact') {
    setDensity(next);
    localStorage.setItem(DENSITY_STORAGE_KEY, next);
  }

  const { data: allCompanies = [], isLoading } = useCompanies();
  const { data: archivedCompanies = [], isLoading: isLoadingArchived } = useArchivedCompanies(
    view === 'archived'
  );
  const { data: allContacts = [] } = useContacts();
  const { data: teamUsers = [] } = useUsers();
  const archiveCompanies = useArchiveCompanies();
  const restoreCompanies = useRestoreCompanies();
  const deleteCompanies = useDeleteCompanies();

  // Reactive like Contacts' activeContact — always reflects the latest data
  // instead of a stale snapshot from the moment the row was clicked.
  const activeCompany = useMemo(
    () => allCompanies.find((c) => c.id === activeCompanyId) ?? null,
    [allCompanies, activeCompanyId]
  );
  const hierarchyCompany = useMemo(
    () => allCompanies.find((c) => c.id === hierarchyCompanyId) ?? null,
    [allCompanies, hierarchyCompanyId]
  );
  const activeContact = useMemo(
    () => allContacts.find((c) => c.id === activeContactId) ?? null,
    [allContacts, activeContactId]
  );

  // Deep link from other pages (e.g. a deal's quick view) — ?companyId=<id>
  // opens that company's detail modal once the list has loaded, then clears
  // the param so a refresh/back-nav doesn't keep reopening it. Mirrors
  // Contacts.tsx's ?contactId= handling.
  useEffect(() => {
    const companyIdParam = searchParams.get('companyId');
    if (!companyIdParam) return;
    const id = Number(companyIdParam);
    if (!allCompanies.some((c) => c.id === id)) return;
    setActiveCompanyId(id);
    const next = new URLSearchParams(searchParams);
    next.delete('companyId');
    setSearchParams(next, { replace: true });
  }, [searchParams, allCompanies, setSearchParams]);

  // Covers the table with a spinner instead of letting it flash underneath
  // while a deep-linked company is still resolving — mirrors Contacts.tsx.
  const pendingCompanyId = searchParams.get('companyId');
  const companyDeepLinkPending =
    !!pendingCompanyId &&
    activeCompanyId == null &&
    (isLoading || allCompanies.some((c) => c.id === Number(pendingCompanyId)));

  function changeView(next: CompaniesView) {
    setView(next);
    setSelectedIds(new Set());
  }

  function openAddModal() {
    setEditingCompany(null);
    setFormOpen(true);
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);
    setFormOpen(true);
  }

  const industries = useMemo(() => {
    const set = new Set(allCompanies.map((c) => c.industry).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ value: v, label: v }));
  }, [allCompanies]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    allCompanies.forEach((c) => {
      if (c.owner_id && c.owner_name) map.set(String(c.owner_id), c.owner_name);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [allCompanies]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    allCompanies.forEach((c) => c.tags?.forEach((t) => set.add(t.name)));
    return Array.from(set).map((v) => ({ value: v, label: v }));
  }, [allCompanies]);

  const visibleCompanies = useMemo(() => {
    let list =
      view === 'mine' ? allCompanies.filter((c) => c.owner_id === user?.id) : allCompanies;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filters.industry) list = list.filter((c) => c.industry === filters.industry);
    if (filters.owner) list = list.filter((c) => String(c.owner_id) === filters.owner);
    if (filters.tag) list = list.filter((c) => c.tags?.some((t) => t.name === filters.tag));

    return list;
  }, [allCompanies, view, user, search, filters]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const list = view === 'archived' ? archivedCompanies : visibleCompanies;
    setSelectedIds((prev) =>
      list.every((c) => prev.has(c.id)) ? new Set() : new Set(list.map((c) => c.id))
    );
  }

  function handleArchiveSelected() {
    if (selectedIds.size === 0) return;
    setBulkArchiveError(null);
    setBulkArchiveConfirmOpen(true);
  }

  function confirmArchiveSelected() {
    setBulkArchiveError(null);
    archiveCompanies.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkArchiveConfirmOpen(false);
      },
      onError: (err) => setBulkArchiveError(err instanceof Error ? err.message : 'Failed to archive.'),
    });
  }

  function handleRestoreSelected() {
    if (selectedIds.size === 0) return;
    restoreCompanies.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleRestoreOne(company: Company) {
    restoreCompanies.mutate([company.id]);
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setBulkDeleteError(null);
    setBulkDeleteConfirmOpen(true);
  }

  function confirmDeleteSelected() {
    setBulkDeleteError(null);
    deleteCompanies.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkDeleteConfirmOpen(false);
      },
      onError: (err) => setBulkDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  function handleDeleteOne(company: Company) {
    setDeleteTargetError(null);
    setDeleteTarget(company);
  }

  function confirmDeleteOne() {
    if (!deleteTarget) return;
    setDeleteTargetError(null);
    deleteCompanies.mutate([deleteTarget.id], {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => setDeleteTargetError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  function handleExport() {
    const list = view === 'archived' ? archivedCompanies : visibleCompanies;
    if (list.length === 0) return;
    const rows = list.map((c) => ({
      Company: c.name,
      Industry: c.industry ?? '',
      Owner: c.owner_name ?? '',
      Website: c.website ?? '',
      Phone: c.phone ?? '',
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {companyDeepLinkPending && (
        <div className="absolute inset-0 z-[90] bg-white flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500" />
        </div>
      )}
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800">Companies</h1>
        <button
          onClick={openAddModal}
          className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Company</span>
        </button>
      </div>

      <CompaniesTabs view={view} onChange={changeView} />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search companies..."
        density={density}
        onDensityChange={changeDensity}
        endExtra={
          <CompaniesColumnsMenu
            visibility={columnVisibility}
            onToggle={(id) => setColumnVisibility((v) => ({ ...v, [id]: v[id] === false }))}
          />
        }
      />

      {view !== 'archived' && (
        <>
          <CompaniesFilterRow
            industries={industries}
            owners={owners}
            tags={tagOptions}
            value={filters}
            onChange={setFilters}
          />
          <CompaniesTable
            companies={visibleCompanies}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={(c) => setActiveCompanyId(c.id)}
            onEdit={openEditModal}
            onDelete={handleDeleteOne}
            isLoading={isLoading}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            users={teamUsers}
            density={density}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </>
      )}

      {view === 'archived' && (
        <CompaniesTable
          companies={archivedCompanies}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onRowClick={(c) => setActiveCompanyId(c.id)}
          onEdit={openEditModal}
          onDelete={handleDeleteOne}
          onRestore={handleRestoreOne}
          view={view}
          isLoading={isLoadingArchived}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          users={teamUsers}
          density={density}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      )}

      <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-slate-400 font-medium">
              {selectedIds.size} selected
            </span>
          )}
          <CompaniesBulkActionsMenu
            view={view}
            selectedCount={selectedIds.size}
            onArchiveSelected={handleArchiveSelected}
            onRestoreSelected={handleRestoreSelected}
            onDeleteSelected={handleDeleteSelected}
            onExport={handleExport}
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing {(view === 'archived' ? archivedCompanies : visibleCompanies).length} of{' '}
          {(view === 'archived' ? archivedCompanies : allCompanies).length} Companies
        </span>
      </div>

      <CompanyFormModal
        open={formOpen}
        company={editingCompany}
        onClose={() => setFormOpen(false)}
      />
      <CompanyDetailModal
        company={activeCompany}
        onClose={() => setActiveCompanyId(null)}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onEdit={(company) => {
          setActiveCompanyId(null);
          openEditModal(company);
        }}
        onContactClick={(contactId) => {
          setActiveCompanyId(null);
          setActiveContactId(contactId);
        }}
        onViewHierarchy={(company) => setHierarchyCompanyId(company.id)}
      />
      <ContactDetailModal contact={activeContact} onClose={() => setActiveContactId(null)} />
      <CompanyHierarchyModal
        company={hierarchyCompany}
        onClose={() => setHierarchyCompanyId(null)}
        onSelectCompany={(company: Company) => {
          setHierarchyCompanyId(null);
          setActiveCompanyId(company.id);
        }}
      />
      <ConfirmDialog
        open={bulkArchiveConfirmOpen}
        title={`Archive ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'}?`}
        body="Archived companies are hidden from the main list but not deleted — you can restore them later from the Archived tab."
        confirmLabel="Archive"
        danger={false}
        isSubmitting={archiveCompanies.isPending}
        error={bulkArchiveError}
        onConfirm={confirmArchiveSelected}
        onCancel={() => setBulkArchiveConfirmOpen(false)}
      />
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title={`Permanently delete ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'}?`}
        body="This cannot be undone."
        confirmLabel="Delete Forever"
        isSubmitting={deleteCompanies.isPending}
        error={bulkDeleteError}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : 'Delete company?'}
        body="This cannot be undone."
        confirmLabel="Delete"
        isSubmitting={deleteCompanies.isPending}
        error={deleteTargetError}
        onConfirm={confirmDeleteOne}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

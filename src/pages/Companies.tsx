import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Company, CompaniesView } from '../types/company';
import { useAuth } from '../context/AuthContext';
import {
  useArchivedCompanies,
  useArchiveCompanies,
  useCompanies,
  useDeleteCompanies,
} from '../hooks/useCompanies';
import { useContacts } from '../hooks/useContacts';
import CompaniesStatsBar from '../components/companies/CompaniesStatsBar';
import CompaniesTabs from '../components/companies/CompaniesTabs';
import CompaniesFilterRow, {
  CompaniesFilterValue,
} from '../components/companies/CompaniesFilterRow';
import CompaniesTable from '../components/companies/CompaniesTable';
import CompaniesBulkActionsMenu from '../components/companies/CompaniesBulkActionsMenu';
import CompanyFormModal from '../components/companies/CompanyFormModal';
import CompanyDetailModal from '../components/companies/CompanyDetailModal';
import CompanyHierarchyModal from '../components/companies/CompanyHierarchyModal';
import ContactDetailModal from '../components/contacts/ContactDetailModal';
import SearchToolbar from '../components/SearchToolbar';

const EMPTY_FILTERS: CompaniesFilterValue = { industry: '', owner: '', tag: '' };

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

  const { data: allCompanies = [], isLoading } = useCompanies();
  const { data: archivedCompanies = [], isLoading: isLoadingArchived } = useArchivedCompanies(
    view === 'archived'
  );
  const { data: allContacts = [] } = useContacts();
  const archiveCompanies = useArchiveCompanies();
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

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: allCompanies.length,
      mine: allCompanies.filter((c) => c.owner_id === user?.id).length,
      newThisMonth: allCompanies.filter((c) => {
        if (!c.created_at) return false;
        const d = new Date(c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      archived: archivedCompanies.length,
    };
  }, [allCompanies, archivedCompanies, user]);

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
    if (!confirm(`Archive ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'}?`)) return;
    archiveCompanies.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `PERMANENT DELETE: Remove ${selectedIds.size} compan${selectedIds.size === 1 ? 'y' : 'ies'} forever?`
      )
    )
      return;
    deleteCompanies.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }

  function handleDeleteOne(company: Company) {
    if (!confirm(`Delete ${company.name}? This cannot be undone.`)) return;
    deleteCompanies.mutate([company.id]);
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

      <CompaniesStatsBar {...stats} />
      <CompaniesTabs view={view} onChange={changeView} />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search companies..."
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
            onExport={handleExport}
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
          isLoading={isLoadingArchived}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onExport={handleExport}
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
            onDeleteSelected={handleDeleteSelected}
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
    </div>
  );
}

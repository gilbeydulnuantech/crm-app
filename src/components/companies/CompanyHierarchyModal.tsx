import { useMemo } from 'react';
import { Company } from '../../types/company';
import { useCompanies } from '../../hooks/useCompanies';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { toTitleCase } from '../../utils/text';

interface Props {
  company: Company | null;
  onClose: () => void;
  onSelectCompany: (company: Company) => void;
}

interface TreeNode {
  company: Company;
  children: TreeNode[];
}

// Sums this node's own open pipeline / closed-won ARR plus every
// descendant's — used only on the root so "Total Open Pipeline"/"Total
// Account ARR" reads as a true family-wide rollup, not just its own deals.
function rollup(
  node: TreeNode,
  ownValues: Map<number, { pipeline: number; arr: number }>
): { pipeline: number; arr: number } {
  const own = ownValues.get(node.company.id) ?? { pipeline: 0, arr: 0 };
  return node.children.reduce(
    (acc, child) => {
      const childRollup = rollup(child, ownValues);
      return { pipeline: acc.pipeline + childRollup.pipeline, arr: acc.arr + childRollup.arr };
    },
    { ...own }
  );
}

export default function CompanyHierarchyModal({ company, onClose, onSelectCompany }: Props) {
  const { data: allCompanies = [] } = useCompanies();
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);

  const ownValues = useMemo(() => {
    const map = new Map<number, { pipeline: number; arr: number }>();
    for (const c of allCompanies) {
      const deals = allOpportunities.filter((o) => o.account_id === c.id);
      const pipeline = deals.filter((d) => d.status === 'Open').reduce((s, d) => s + Number(d.deal_value ?? 0), 0);
      const arr = deals.filter((d) => d.status === 'Won').reduce((s, d) => s + Number(d.deal_value ?? 0), 0);
      map.set(c.id, { pipeline, arr });
    }
    return map;
  }, [allCompanies, allOpportunities]);

  const root = useMemo(() => {
    if (!company) return null;
    let current = company;
    const seen = new Set<number>([current.id]);
    // Walk up parent_company_id until there isn't one — guards against a
    // cyclic parent link (shouldn't happen, but a self-referencing FK chain
    // with no depth limit is exactly the kind of thing that can loop forever).
    while (current.parent_company_id && !seen.has(current.parent_company_id)) {
      const parent = allCompanies.find((c) => c.id === current.parent_company_id);
      if (!parent) break;
      seen.add(parent.id);
      current = parent;
    }
    return current;
  }, [company, allCompanies]);

  const tree = useMemo(() => {
    if (!root) return null;
    // Guards against a cyclic parent_company_id chain (e.g. A's parent is B
    // and B's parent is A) — without this, a company reachable via more than
    // one path down the tree would recurse forever instead of just being
    // skipped the second time.
    function build(c: Company, ancestors: Set<number>): TreeNode {
      const nextAncestors = new Set(ancestors).add(c.id);
      const children = allCompanies
        .filter((child) => child.parent_company_id === c.id && !nextAncestors.has(child.id))
        .map((child) => build(child, nextAncestors));
      return { company: c, children };
    }
    return build(root, new Set());
  }, [root, allCompanies]);

  if (!company || !root || !tree) return null;

  const totals = rollup(tree, ownValues);
  const isSingleNode = tree.children.length === 0 && !company.parent_company_id;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[105] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Corporate Structure / Account Hierarchy
            </p>
            <h3 className="text-sm font-bold text-slate-800 truncate">{toTitleCase(root.name)}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isSingleNode ? (
            <p className="text-sm text-slate-400">
              {toTitleCase(company.name)} has no parent company or subsidiaries linked yet — set "Parent
              Company" on this or another company's Edit form to build out the hierarchy.
            </p>
          ) : (
            <TreeRow
              node={tree}
              depth={0}
              currentId={company.id}
              isRoot
              totals={totals}
              ownValues={ownValues}
              onSelectCompany={onSelectCompany}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  currentId,
  isRoot,
  totals,
  ownValues,
  onSelectCompany,
}: {
  node: TreeNode;
  depth: number;
  currentId: number;
  isRoot: boolean;
  totals: { pipeline: number; arr: number };
  ownValues: Map<number, { pipeline: number; arr: number }>;
  onSelectCompany: (company: Company) => void;
}) {
  const { company, children } = node;
  const own = ownValues.get(company.id) ?? { pipeline: 0, arr: 0 };
  const isCurrent = company.id === currentId;

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l border-slate-200 mt-3' : ''}>
      <div
        className={`rounded-lg border p-3 ${
          isCurrent ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <i className={`fa-solid ${isRoot ? 'fa-building-columns' : 'fa-industry'} text-slate-400 text-xs`} />
          <button
            onClick={() => onSelectCompany(company)}
            className="text-sm font-semibold text-indigo-600 hover:underline truncate"
          >
            {toTitleCase(company.name)}
          </button>
          <span className="text-[10px] text-slate-400 shrink-0">
            {isRoot ? '(Ultimate Parent)' : company.parent_company_id ? '(Subsidiary)' : '(Independent)'}
          </span>
          {isCurrent && (
            <span className="text-[10px] font-semibold text-indigo-600 shrink-0">&larr; CURRENT RECORD</span>
          )}
        </div>

        {isRoot ? (
          <p className="text-xs text-slate-500 mt-1">
            {company.annual_revenue && `Revenue: ${company.annual_revenue} | `}
            Total Open Pipeline: ${totals.pipeline.toLocaleString()} | Total Account ARR: $
            {totals.arr.toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-1">
            Owner: {company.owner_name ? toTitleCase(company.owner_name) : 'Unassigned'} | Pipeline: $
            {own.pipeline.toLocaleString()}
            {own.arr > 0 && ` | ARR: $${own.arr.toLocaleString()}`}
          </p>
        )}
      </div>

      {children.map((child) => (
        <TreeRow
          key={child.company.id}
          node={child}
          depth={depth + 1}
          currentId={currentId}
          isRoot={false}
          totals={totals}
          ownValues={ownValues}
          onSelectCompany={onSelectCompany}
        />
      ))}
    </div>
  );
}

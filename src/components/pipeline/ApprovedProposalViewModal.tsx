import { useRef } from 'react';
import { useApprovedProposal } from '../../hooks/useProposals';
import FillableFieldsRenderer, { FieldValue } from '../richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../../utils/mergeFields';

interface Props {
  proposalId: number | null;
  onClose: () => void;
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Admin/rep-facing read view of an approved proposal — the template with
// the actual client's merge fields and filled-in interactive fields
// resolved and locked. Same modal pattern as SignedContractViewModal.
export default function ApprovedProposalViewModal({ proposalId, onClose }: Props) {
  const { data, isLoading, error } = useApprovedProposal(proposalId, proposalId != null);
  const contentRef = useRef<HTMLDivElement>(null);

  if (proposalId == null) return null;

  const resolvedHtml = data
    ? fillMergeFields(data.content_html, {
        client_name: data.client_name,
        client_company_name: data.client_company_name,
        client_address: data.client_address,
        client_email: data.client_email,
        client_phone: data.client_phone,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        inspection_date: data.inspection_date,
        deal_value: data.deal_value,
        deal_name: data.deal_name,
        deal_created_at: data.deal_created_at,
        deal_due_at: data.deal_due_at,
        down_payment_amount: data.down_payment_amount,
        down_payment_paid_at: data.down_payment_paid_at,
        balance_amount: data.balance_amount,
        balance_paid_at: data.balance_paid_at,
      })
    : '';

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[130] flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700">
            Approved
          </span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : error || !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">
            {error instanceof Error ? error.message : 'Failed to load this proposal.'}
          </p>
        ) : (
          <>
            <div
              ref={contentRef}
              className="rte-content mt-5 bg-slate-50 border border-slate-100 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: resolvedHtml }}
            />
            <FillableFieldsRenderer
              containerRef={contentRef}
              contentHtml={resolvedHtml}
              values={(data.field_values as Record<string, FieldValue>) || {}}
              onChange={() => {}}
              readOnly
            />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            {data.approved_at && (
              <p className="text-xs text-slate-400 mt-6 pt-6 border-t border-slate-100">
                Approved {new Date(data.approved_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

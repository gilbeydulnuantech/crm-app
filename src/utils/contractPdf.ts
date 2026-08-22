import { jsPDF } from 'jspdf';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The draft preview PDF is a plain-text summary, not a pixel-perfect render
// of the rich content — good enough for a quick local check while editing,
// and avoids trying to lay out arbitrary HTML (tables included) inside
// jsPDF. Block-level tags are converted to newlines first — textContent
// alone collapses <p>/<br> boundaries into one run-on line. The signed
// contract's real PDF is generated server-side via Puppeteer instead (see
// api/contracts.ts generateContractPdf), which renders the actual page.
export function htmlToPlainText(html: string): string {
  const withBreaks = (html || '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const el = document.createElement('div');
  el.innerHTML = withBreaks;
  return (el.textContent || el.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
}

// A quick local export for a draft still being edited — same plain-text
// layout as the signed contract PDF, minus the signature block.
export function buildDraftPdf(title: string, contentHtml: string, totalAmount: number) {
  const safeTitle = typeof title === 'string' && title ? title : 'Untitled';

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  let y = margin;

  doc.setFontSize(16);
  doc.text(safeTitle, margin, y);
  y += 28;

  doc.setFontSize(10);
  const lines = doc.splitTextToSize(htmlToPlainText(contentHtml || ''), 515);
  doc.text(lines, margin, y);
  y += lines.length * 13 + 20;

  doc.setFontSize(11);
  doc.text(`Total: ${money(totalAmount)}`, margin, y);

  return doc;
}

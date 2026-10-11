import type { EmailTemplate } from '../api/emailTemplates';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Legacy plain-text templates become paragraphs when someone opens them in the formatted editor.
export function plainTextToHtml(text: string): string {
  const t = (text || '').replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  return t
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Mirrors the server's emailHtmlToText — used for the plain-text copy of an email and wherever a formatted
// template has to be shown or sent in a plain-text field.
export function htmlToPlainText(html: string): string {
  return (html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]*>/g, '').trim() || href} (${href})`)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The text to use where a template is dropped into a plain-text field (compose box, proposal/contract email
// bodies, stage reminders): formatted templates lose their formatting there, plain ones are unchanged.
export function templatePlainBody(t: Pick<EmailTemplate, 'body' | 'is_html'>): string {
  return t.is_html ? htmlToPlainText(t.body) : t.body;
}

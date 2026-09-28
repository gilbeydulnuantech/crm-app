import { Contact } from '../types/contact';
import { toTitleCase } from './text';

// Fills the subset of merge tokens a contact-only send (no deal/opportunity
// in context) can actually resolve — {{contact.*}}/{{company.*}}/{{user.*}}
// namespaced tokens only (see AUTOMATION_DYNAMIC_FIELDS in
// DynamicFieldDropdown.tsx). None of this app's send workflows
// (contacts-mail-send.json) substitute these server-side, so every token
// used in a template body must be resolved here before sending or it leaks
// into the email literally.
//
// {{user.company_name}} is the sender's OWN organization — the same
// company_profile row contacts-mail-send.json substitutes it from
// elsewhere — while {{company.name}} is the contact's own company. Names are
// title-cased same as everywhere else they're displayed in this app.
export function fillContactEmailTokens(text: string, contact: Contact, ownCompanyName = ''): string {
  const firstName = toTitleCase(contact.first_name);
  const lastName = toTitleCase(contact.last_name);
  const fullName = toTitleCase(`${contact.first_name} ${contact.last_name}`.trim());
  const contactCompanyName = toTitleCase(contact.company_name);
  const replacements: Record<string, string> = {
    'contact.first_name': firstName,
    'contact.last_name': lastName,
    'contact.full_name': fullName,
    'contact.email': contact.email || '',
    'contact.phone': contact.phone || '',
    'company.name': contactCompanyName,
    'user.company_name': toTitleCase(ownCompanyName),
  };
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match
  );
}

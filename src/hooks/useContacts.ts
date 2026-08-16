import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/contacts';
import { Contact, DncChannel, ImportContactRow } from '../types/contact';
import { getContactsWithUnreadEmail } from '../utils/emailLogs';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: api.fetchContacts,
  });
}

// Backs the notification bell — active contacts already carry email_logs
// (get-contacts is `SELECT c.*`), so no dedicated endpoint is needed. Shares
// the ['contacts'] cache key with useContacts(), just adds polling so a
// reply landing in another tab/session shows up without visiting Contacts.
function useContactsForNotifications() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: api.fetchContacts,
    refetchInterval: 60_000,
  }).data ?? [];
}

export function useUnreadEmailContacts() {
  return getContactsWithUnreadEmail(useContactsForNotifications());
}

export function useArchivedContacts(enabled: boolean) {
  return useQuery({
    queryKey: ['contacts', 'archived'],
    queryFn: api.fetchArchivedContacts,
    enabled,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.fetchUsers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, color }: { userId: number; color: string }) => api.updateUserColor(userId, color),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUserTheme() {
  return useMutation({
    mutationFn: ({ userId, theme }: { userId: number; theme: api.UserTheme }) =>
      api.updateUserTheme(userId, theme),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferences: api.NotificationPreferences) => api.updateNotificationPreferences(preferences),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useAllUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: api.fetchAllUsers,
    enabled,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'admin' | 'user' }) => api.updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'all'] });
    },
  });
}

export function useUpdateUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) => api.updateUserActive(userId, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'all'] });
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: api.fetchTags,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateContacts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['contacts'] });
  };
}

export function useAddContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (payload: Partial<Contact>) => api.addContact(payload),
    onSuccess: invalidate,
  });
}

export function useImportContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (contacts: ImportContactRow[]) => api.importContacts(contacts),
    onSuccess: invalidate,
  });
}

export function useUpdateContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Contact> }) =>
      api.updateContact(id, payload),
    onSuccess: invalidate,
  });
}

export function useArchiveContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: number[]; reason?: string }) =>
      api.archiveContacts(ids, reason),
    onSuccess: invalidate,
  });
}

export function useDeleteContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteContacts(ids),
    onSuccess: invalidate,
  });
}

export function useRestoreContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (ids: number[]) => api.restoreContacts(ids),
    onSuccess: invalidate,
  });
}

export function useSendContactEmail() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({
      contactId,
      subject,
      message,
      to,
      from,
      attachments,
    }: {
      contactId: number;
      subject: string;
      message: string;
      to: string;
      from: string;
      attachments: { name: string; url: string }[];
    }) => api.sendContactEmail(contactId, subject, message, to, from, attachments),
    onSuccess: invalidate,
  });
}

export function useMarkContactEmailRead() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ contactId, logId }: { contactId: number; logId: string }) =>
      api.markContactEmailRead(contactId, logId),
    onSuccess: invalidate,
  });
}

export function useAssignOwner() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ contactId, ownerId }: { contactId: number; ownerId: number | null }) =>
      api.assignContactOwner(contactId, ownerId),
    onSuccess: invalidate,
  });
}

export function useMergeContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ primaryId, duplicateId }: { primaryId: number; duplicateId: number }) =>
      api.mergeContacts(primaryId, duplicateId),
    onSuccess: invalidate,
  });
}

export function useToggleDoNotContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ contactId, value }: { contactId: number; value: boolean }) =>
      api.toggleDoNotContact(contactId, value),
    onSuccess: invalidate,
  });
}

export function useToggleContactDncChannel() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: ({ contactId, channel, value }: { contactId: number; channel: DncChannel; value: boolean }) =>
      api.toggleContactDncChannel(contactId, channel, value),
    onSuccess: invalidate,
  });
}

export function useContactRelated(contactId: number | null) {
  return useQuery({
    queryKey: ['contact-related', contactId],
    queryFn: () => api.fetchContactRelated(contactId!),
    enabled: !!contactId,
  });
}

export function useContactIdsByTag(tagName: string | null) {
  return useQuery({
    queryKey: ['contact-ids-by-tag', tagName],
    queryFn: async () => {
      const raw = await api.fetchContactIdsByTag(tagName!);
      // Normalize — the webhook might return [{id: 1}, ...] or [1, 2, ...].
      return new Set(raw.map((item) => (typeof item === 'number' ? item : item.id)));
    },
    enabled: !!tagName,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createTag(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useTagContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: number; tagId: number }) =>
      api.tagContact(contactId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUntagContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: number; tagId: number }) =>
      api.untagContact(contactId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

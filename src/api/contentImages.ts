import { apiFetch } from './client';
import { readFileAsDataUrl } from '../utils/file';

export async function uploadContentImage(file: File) {
  const url = await readFileAsDataUrl(file);
  return apiFetch<{ success: boolean; url?: string; error?: string }>('/webhook/upload-content-image', {
    method: 'POST',
    body: JSON.stringify({ photo: { name: file.name, url } }),
  });
}

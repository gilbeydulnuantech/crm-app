import { apiFetch } from './client';
import { Resource } from '../types/resource';

export function fetchResources() {
  return apiFetch<Resource[]>('/webhook/get-resources');
}

export function addResource(name: string, type: string) {
  return apiFetch<Resource>('/webhook/add-resource', {
    method: 'POST',
    body: JSON.stringify({ name, type }),
  });
}

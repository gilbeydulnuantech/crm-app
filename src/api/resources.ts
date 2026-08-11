import { apiFetch } from './client';
import { Resource } from '../types/resource';

export function fetchResources() {
  return apiFetch<Resource[]>('/webhook/get-resources');
}

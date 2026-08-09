import { apiFetch } from './client';
import {
  ActivitiesReport,
  ContactsReport,
  OverviewReport,
  PipelineReport,
  SalesReport,
  TeamReportRow,
} from '../types/report';

export function fetchOverviewReport(days: number) {
  return apiFetch<OverviewReport>(`/webhook/get-report-overview?days=${days}`);
}

export function fetchSalesReport(days: number) {
  return apiFetch<SalesReport>(`/webhook/get-report-sales?days=${days}`);
}

export function fetchPipelineReport() {
  return apiFetch<PipelineReport>('/webhook/get-report-pipeline');
}

export function fetchContactsReport(days: number) {
  return apiFetch<ContactsReport>(`/webhook/get-report-contacts?days=${days}`);
}

export function fetchTeamReport(days: number) {
  return apiFetch<TeamReportRow[]>(`/webhook/get-report-team?days=${days}`);
}

export function fetchActivitiesReport(days: number) {
  return apiFetch<ActivitiesReport>(`/webhook/get-report-activities?days=${days}`);
}

import { apiFetch } from './client';

export type CardTextSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface CardDisplaySettings {
  text_size: CardTextSize;
  bold_title: boolean; // service name on event cards (deal names are always bold)
  show_time: boolean;
  show_contact: boolean;
  show_price: boolean;
  show_staff: boolean;
  show_commission: boolean;
}

export const DEFAULT_CARD_DISPLAY: CardDisplaySettings = {
  text_size: 'small',
  bold_title: false,
  show_time: true,
  show_contact: true,
  show_price: true,
  show_staff: true,
  show_commission: true,
};

export async function fetchCardDisplay(): Promise<CardDisplaySettings> {
  const res = await apiFetch<{ success: boolean; settings?: Partial<CardDisplaySettings> }>('/webhook/get-card-display');
  return { ...DEFAULT_CARD_DISPLAY, ...(res?.settings ?? {}) };
}

export function saveCardDisplay(settings: CardDisplaySettings) {
  return apiFetch<{ success: boolean; settings?: CardDisplaySettings; error?: string }>('/webhook/save-card-display', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

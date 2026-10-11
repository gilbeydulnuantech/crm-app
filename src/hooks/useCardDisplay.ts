import { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/cardDisplay';
import { CardDisplaySettings, CardTextSize, DEFAULT_CARD_DISPLAY } from '../api/cardDisplay';
import { getCurrentUser } from '../api/client';
import { readCache, writeCache } from '../utils/queryCache';

const TEXT_SCALE: Record<CardTextSize, number> = { small: 1, medium: 1.15, large: 1.3, xlarge: 1.5 };

// Card display is a per-user choice, so the remembered copy is kept per user too.
const cardCacheKey = () => `card-display.${getCurrentUser()?.id ?? 0}`;

export function useCardDisplay() {
  const cacheKey = cardCacheKey();
  const { data } = useQuery({
    queryKey: ['card-display'],
    queryFn: async () => {
      const fresh = await api.fetchCardDisplay();
      writeCache(cacheKey, fresh);
      return fresh;
    },
    // The last saved choice shows immediately; the server copy replaces it when it arrives.
    placeholderData: () => readCache<CardDisplaySettings>(cacheKey),
    staleTime: 10 * 60 * 1000,
  });
  const settings: CardDisplaySettings = data ?? DEFAULT_CARD_DISPLAY;
  const scale = TEXT_SCALE[settings.text_size] ?? 1;
  return {
    ...settings,
    // Scales everything inside a card (text, badges, icons) together. Put it on an inner wrapper, not on a
    // card that is dragged or absolutely positioned.
    zoomStyle: (scale === 1 ? undefined : { zoom: scale }) as CSSProperties | undefined,
    titleWeight: (settings.bold_title ? 700 : undefined) as CSSProperties['fontWeight'],
  };
}

export function useSaveCardDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveCardDisplay,
    // Show the change straight away; the server copy replaces it when the save returns.
    onMutate: (next) => {
      qc.setQueryData(['card-display'], next);
      writeCache(cardCacheKey(), next);
    },
    onSuccess: (res) => {
      if (res.success && res.settings) {
        const saved = { ...DEFAULT_CARD_DISPLAY, ...res.settings };
        qc.setQueryData(['card-display'], saved);
        writeCache(cardCacheKey(), saved);
      }
    },
    onError: () => qc.invalidateQueries({ queryKey: ['card-display'] }),
  });
}

/**
 * Support card trigger (docs/08 §9.3). In-memory only: shown at most once per app open,
 * and the matched word is never stored anywhere.
 */
import { create } from 'zustand';
import { SUPPORT_KEYWORDS } from '../content/th/safety';

let shownThisSession = false;

export const useSupportCard = create<{ open: boolean; close: () => void }>()((set) => ({
  open: false,
  close: () => set({ open: false }),
}));

export function containsSupportKeyword(text: string): boolean {
  const t = text.replace(/\s+/g, '');
  return SUPPORT_KEYWORDS.some((k) => t.includes(k.replace(/\s+/g, '')));
}

/** Call with free text the player has just saved. Never blocks and never records anything. */
export function checkSupportKeywords(text: string | undefined | null) {
  if (!text || shownThisSession || !containsSupportKeyword(text)) return;
  shownThisSession = true;
  useSupportCard.setState({ open: true });
}

/** Tests only. */
export function resetSupportCardSession() {
  shownThisSession = false;
  useSupportCard.setState({ open: false });
}

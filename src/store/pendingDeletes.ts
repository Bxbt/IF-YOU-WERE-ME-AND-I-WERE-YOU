/**
 * Answer deletions wait 5 s so the player can undo (docs/08 §7). Pending deletions are
 * executed immediately if the page is hidden/closed, so "deleted" always means deleted.
 */
import { create } from 'zustand';
import { deleteAnswer } from './actions';

interface Pending { ownerId: string; layer: 'self' | 'perceived'; aboutId?: string; questionId: string; timer: ReturnType<typeof setTimeout> }

export const usePendingDeletes = create<{ items: Record<string, Pending> }>()(() => ({ items: {} }));

export const pendingKey = (ownerId: string, layer: string, aboutId: string | undefined, qid: string) =>
  `${ownerId}|${layer}|${aboutId ?? ''}|${qid}`;

function run(key: string) {
  const p = usePendingDeletes.getState().items[key];
  if (!p) return;
  clearTimeout(p.timer);
  deleteAnswer(p.ownerId, p.layer, p.aboutId, p.questionId);
  const items = { ...usePendingDeletes.getState().items };
  delete items[key];
  usePendingDeletes.setState({ items });
}

export function scheduleDelete(ownerId: string, layer: 'self' | 'perceived', aboutId: string | undefined, questionId: string, ms = 5000) {
  const key = pendingKey(ownerId, layer, aboutId, questionId);
  const timer = setTimeout(() => run(key), ms);
  usePendingDeletes.setState((s) => ({ items: { ...s.items, [key]: { ownerId, layer, aboutId, questionId, timer } } }));
  return key;
}

export function undoDelete(key: string) {
  const p = usePendingDeletes.getState().items[key];
  if (!p) return;
  clearTimeout(p.timer);
  const items = { ...usePendingDeletes.getState().items };
  delete items[key];
  usePendingDeletes.setState({ items });
}

export function flushPendingDeletes() {
  Object.keys(usePendingDeletes.getState().items).forEach(run);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingDeletes);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushPendingDeletes());
}

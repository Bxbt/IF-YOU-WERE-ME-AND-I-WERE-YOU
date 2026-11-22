/**
 * Journey List (S1b, Phase 2 — M11b). Several journeys can be kept; one is active at a time
 * (docs/07 §1, A-23). Deleting removes the journey's answers for real (docs/08 §7).
 */
import type { SaveRoot } from '../persistence/schema';
import { purgeBackup } from '../persistence/persist';
import { nowIso } from '../lib/ids';
import { useGame } from './game';

export const MAX_JOURNEYS = 5;

/** Makes `jid` the active journey; the current active one is kept as archived. */
export function activateJourney(save: SaveRoot, jid: string): SaveRoot {
  const target = save.journeys[jid];
  if (!target || target.status === 'active') return save;
  const t = nowIso();
  const journeys = Object.fromEntries(
    Object.entries(save.journeys).map(([k, j]) => [
      k,
      k === jid
        ? { ...j, status: 'active' as const, updatedAt: t, lastPlayedAt: t }
        : j.status === 'active'
          ? { ...j, status: 'archived' as const, updatedAt: t }
          : j,
    ]),
  );
  return { ...save, journeys, settings: { ...save.settings, lastJourneyId: jid } };
}

/** Deletes a journey (its story answers, mirror items, reveals and next-conversation list). Players and profiles stay. */
export function deleteJourney(jid: string) {
  useGame.getState().update((s) => {
    if (!s.journeys[jid]) return s;
    const journeys = { ...s.journeys };
    delete journeys[jid];
    const settings = { ...s.settings };
    if (settings.lastJourneyId === jid) delete settings.lastJourneyId;
    const memories = Object.fromEntries(
      Object.entries(s.memories).map(([k, m]) => {
        if (m.journeyId !== jid) return [k, m];
        const { journeyId: _j, ...rest } = m;
        void _j;
        return [k, rest];
      }),
    );
    return { ...s, journeys, settings, memories };
  });
  useGame.getState().flush();
  purgeBackup();
}

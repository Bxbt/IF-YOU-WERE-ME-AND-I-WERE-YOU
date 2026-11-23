import { useSyncExternalStore } from 'react';
import { ui } from '../content/th/ui';
import { CHAPTER_BY_ID } from '../content/th/chapters';
import type { ChapterId } from '../content/types';
import { useGame } from '../store/game';
import { apply, setPendingPrivate } from '../store/story';
import { currentLink } from '../live/sync';
import { declineItem } from '../live/merge';
import { router } from '../routes';
import { chapterHref } from '../screens/ChaptersScreen';
import { ConfirmDialog } from './ConfirmDialog';

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

/**
 * Live (3C): the partner started a chapter and waits for this player — ask on any screen whether
 * to start it together (docs/05 §5.3 "เริ่มบท"). Not while this player is still reading another
 * chapter (it shows once they finish), and not again after "ขอเวลาก่อน" until invited anew.
 */
export function LiveInvite() {
  const save = useGame((s) => s.save);
  const hash = useSyncExternalStore(subscribe, getHash);
  const link = currentLink(save);
  const journey = link ? save.journeys[link.journeyId] : undefined;
  if (!link || !journey) return null;
  const me = link.localPlayerId;
  const partner = journey.playerIds.find((x) => x !== me);
  if (!partner) return null;

  let invite: { ch: ChapterId; startedAt?: string } | null = null;
  for (const [id, p] of Object.entries(journey.chapterProgress)) {
    if (p.status !== 'in_progress') continue;
    const ready = p.pendingPrivateSteps?.find((x) => x.itemId === 'ready');
    if (!ready?.playerIds.includes(me)) continue;
    if (p.pendingPrivateSteps?.some((x) => x.itemId === declineItem(p.startedAt) && x.playerIds.includes(me)))
      continue;
    if (!invite || (p.startedAt ?? '') > (invite.startedAt ?? ''))
      invite = { ch: id as ChapterId, startedAt: p.startedAt };
  }
  if (!invite) return null;
  const meta = CHAPTER_BY_ID[invite.ch];
  if (!meta) return null;

  // Where is this player now? Already in the invited chapter → nothing to ask. Reading another
  // chapter that they have not finished → ask once they reach its end.
  const here = /#\/j\/[^/]+\/play\/([a-z0-9]+)/.exec(hash)?.[1];
  if (here === invite.ch) return null;
  if (here) {
    const p = journey.chapterProgress[here];
    if (p && p.status !== 'completed' && !p.livePos?.[me]?.end) return null;
  }

  const { ch, startedAt } = invite;
  const name = save.players[partner]?.nickname ?? '';
  const t = ui.live;
  const teller =
    meta.storyline === 'other' && journey.otherSide
      ? save.players[journey.otherSide.tellerPlayerId]?.nickname
      : undefined;
  return (
    <ConfirmDialog
      open
      title={t.inviteTitle(name)}
      body={
        <div className="flex flex-col gap-1" data-testid="live-invite">
          <p className="m-0">
            {t.inviteBody(ui.chapters.storyline[meta.storyline], meta.number, meta.titleTh)}
          </p>
          {teller && <p className="m-0 text-sm text-lavender">{t.inviteTeller(teller)}</p>}
        </div>
      }
      confirmLabel={t.inviteJoin}
      cancelLabel={t.inviteLater}
      onConfirm={() => void router.navigate(chapterHref(journey, meta))}
      onCancel={() => apply((s) => setPendingPrivate(s, journey.id, ch, declineItem(startedAt), [me], true))}
    />
  );
}

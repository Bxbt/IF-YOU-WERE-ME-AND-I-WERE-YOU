/**
 * S8 (Play Together): each player privately picks which of their personality answers (Q01–Q36,
 * self + what they think about the partner) may be opened in this journey (docs/04 §6.3.0, M10b).
 * A question opens only when both picked it. Nothing is preselected. PIN gate if the player set one.
 * The partner's picks are never shown — only questions both opened appear in the comparison.
 */
import { useState } from 'react';
import { Lock, ListChecks } from 'lucide-react';
import type { GameSession } from '../persistence/schema';
import { ui } from '../content/th/ui';
import { DIMENSIONS, QUESTIONS } from '../content/th/questions';
import { PixelButton } from './PixelButton';
import { PlayerGate } from './PlayerGate';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { apply, offerProfileAnswers } from '../store/story';
import { profileRevision } from '../engine/compare';

const t = ui.profileReveal;

export function ProfileOffer({ journey }: { journey: GameSession }) {
  const save = useGame((s) => s.save);
  const [a, b] = journey.playerIds;
  const [choosing, setChoosing] = useState<string | null>(null);
  const name = (id: string) => save.players[id]?.nickname ?? '';

  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="offer-h" data-testid="profile-offer">
      <h2 id="offer-h" className="m-0 text-lg font-semibold">
        {t.heading}
      </h2>
      <p className="m-0 text-sm">{t.body}</p>
      <p className="m-0 text-[13px] text-lavender">{t.privateNote}</p>
      {choosing ? (
        <PlayerGate
          playerId={choosing}
          onCancel={() => {
            setChoosing(null);
            useSession.getState().lock();
          }}
        >
          <OfferList
            journey={journey}
            playerId={choosing}
            otherId={choosing === a ? b : a}
            onDone={() => {
              setChoosing(null);
              useSession.getState().lock(); // back to the shared screen
            }}
          />
        </PlayerGate>
      ) : (
        <div className="flex flex-wrap gap-2">
          {[a, b].map((pid) => (
            <PixelButton
              key={pid}
              variant="ghost"
              icon={
                save.players[pid]?.pin ? (
                  <Lock aria-hidden className="h-4 w-4" />
                ) : (
                  <ListChecks aria-hidden className="h-4 w-4" />
                )
              }
              onClick={() => setChoosing(pid)}
            >
              {t.choose(name(pid))}
            </PixelButton>
          ))}
        </div>
      )}
    </section>
  );
}

function OfferList({
  journey,
  playerId,
  otherId,
  onDone,
}: {
  journey: GameSession;
  playerId: string;
  otherId: string;
  onDone: () => void;
}) {
  const save = useGame((s) => s.save);
  const live = save.journeys[journey.id] ?? journey;
  const answerable = QUESTIONS.filter((q) => profileRevision(save, playerId, otherId, q.id) > 0);
  const offeredNow = new Set(
    answerable.filter((q) => live.mirrorItems[q.id]?.entries[playerId]?.submittedAt).map((q) => q.id),
  );
  // "Opened" only while both players' current answers are the versions that were opened (R7).
  const revealed = new Set(
    answerable
      .filter((q) => {
        const it = live.mirrorItems[q.id];
        return (
          it?.state === 'revealed' &&
          it.revealedRevision?.[playerId] === profileRevision(save, playerId, otherId, q.id) &&
          it.revealedRevision?.[otherId] === profileRevision(save, otherId, playerId, q.id)
        );
      })
      .map((q) => q.id),
  );
  const [picked, setPicked] = useState<Set<string>>(new Set(offeredNow));
  const name = save.players[playerId]?.nickname ?? '';
  const other = save.players[otherId]?.nickname ?? '';

  function confirm() {
    const offer = [...picked].filter((id) => !offeredNow.has(id) || !revealed.has(id));
    const withdraw = [...offeredNow].filter((id) => !picked.has(id) && !revealed.has(id));
    apply((s) => offerProfileAnswers(s, journey.id, playerId, offer, withdraw));
    useGame.getState().flush();
    onDone();
  }

  return (
    <div className="flex flex-col gap-3" data-testid="offer-list">
      <h3 className="m-0 text-base font-semibold">{t.listHeading(name)}</h3>
      <p className="m-0 text-[13px] text-lavender">{t.warning(other)}</p>
      {answerable.length === 0 ? (
        <p className="m-0 text-sm">{t.nothing}</p>
      ) : (
        DIMENSIONS.map((d) => {
          const qs = answerable.filter((q) => q.dimension === d.id);
          if (qs.length === 0) return null;
          return (
            <fieldset key={d.id} className="m-0 flex flex-col gap-1 border-0 border-t border-lavender/20 p-0 pt-2">
              <legend className="p-0 text-[13px] text-lavender">{d.name}</legend>
              {qs.map((q) => {
                const isRevealed = revealed.has(q.id);
                return (
                  <label key={q.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={picked.has(q.id) || isRevealed}
                      disabled={isRevealed}
                      onChange={() =>
                        setPicked((p) => {
                          const n = new Set(p);
                          if (n.has(q.id)) n.delete(q.id);
                          else n.add(q.id);
                          return n;
                        })
                      }
                      className="h-5 w-5 shrink-0 accent-[rgb(var(--c-orange))]"
                    />
                    <span>
                      {q.self}
                      {isRevealed && <span className="ml-2 text-[13px] text-lavender">· {ui.labels.revealed}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          );
        })
      )}
      <div className="flex flex-wrap gap-2">
        <PixelButton onClick={confirm}>{t.save}</PixelButton>
        <PixelButton variant="ghost" onClick={onDone}>
          {ui.cancel}
        </PixelButton>
      </div>
    </div>
  );
}

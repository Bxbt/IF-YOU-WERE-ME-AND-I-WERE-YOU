/**
 * Profile Hub: "รูปแบบที่เกมสังเกต" for one player (docs/04 §5, M11b). Private — behind the
 * player's PIN gate, collapsed until opened. Cards say "อาจ"; the player confirms, rejects or hides.
 */
import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { ui } from '../content/th/ui';
import { SIGNALS } from '../content/th/signals';
import { CHAPTERS } from '../content/th/chapters';
import type { ChapterContent } from '../content/types';
import { dimensionName } from '../engine/personality';
import { observedCards, observedSignals, tagIndex, type TagIndex } from '../engine/observed';
import { setObservedFeedback } from '../store/actions';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { PixelButton } from './PixelButton';
import { PlayerGate } from './PlayerGate';

const o = ui.observed;
let cachedIndex: TagIndex | null = null;

async function loadIndex(): Promise<TagIndex> {
  if (cachedIndex) return cachedIndex;
  const contents = (await Promise.all(CHAPTERS.map((c) => c.load?.()))).filter((c): c is ChapterContent => !!c);
  cachedIndex = tagIndex(contents);
  return cachedIndex;
}

export function ObservedSection({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <PixelButton variant="ghost" className="self-start text-sm" icon={<Eye aria-hidden className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {o.open}
      </PixelButton>
    );
  }
  const close = () => {
    setOpen(false);
    useSession.getState().lock();
  };
  return (
    <PlayerGate playerId={playerId} onCancel={close}>
      <ObservedList playerId={playerId} onClose={close} />
    </PlayerGate>
  );
}

function ObservedList({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const save = useGame((s) => s.save);
  const [idx, setIdx] = useState<TagIndex | null>(cachedIndex);
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => {
    if (!idx) void loadIndex().then(setIdx);
  }, [idx]);

  if (!idx) return <p className="m-0 text-sm text-lavender">{o.loading}</p>;
  const profile = save.profiles[`${playerId}:self`];
  const hidden = new Set(profile && 'hiddenObservedCards' in profile ? profile.hiddenObservedCards : []);
  const confirmed = profile && 'confirmedObserved' in profile ? profile.confirmedObserved : {};
  const cards = observedCards(observedSignals(save, playerId, idx));
  const shown = cards.filter((c) => showHidden || !hidden.has(c.key));
  const act = (key: string, a: Parameters<typeof setObservedFeedback>[3]) =>
    useGame.getState().update((s) => setObservedFeedback(s, playerId, key, a));

  return (
    <section className="flex flex-col gap-3 border-t border-lavender/20 pt-3" aria-labelledby={`obs-${playerId}`} data-testid="observed">
      <h3 id={`obs-${playerId}`} className="m-0 text-base font-semibold">{o.heading}</h3>
      <p className="m-0 text-[13px] text-lavender">{o.intro}</p>
      {cards.length === 0 && <p className="m-0 text-sm">{o.none}</p>}
      {shown.map((c) => (
        <article key={c.key} className="flex flex-col gap-2 rounded-btn border-2 border-lavender/30 bg-navy p-3">
          <p className="m-0">
            {c.signal ? o.card(SIGNALS[c.key] ?? c.key) : o.varied(dimensionName(c.dimension))}
          </p>
          {confirmed[c.key] !== undefined && (
            <p className="m-0 text-[13px] text-lavender">{confirmed[c.key] ? o.confirmed : o.rejected}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <PixelButton variant="ghost" className="text-sm" aria-pressed={confirmed[c.key] === true} onClick={() => act(c.key, 'confirm')}>
              {o.confirm}
            </PixelButton>
            <PixelButton variant="ghost" className="text-sm" aria-pressed={confirmed[c.key] === false} onClick={() => act(c.key, 'reject')}>
              {o.reject}
            </PixelButton>
            {hidden.has(c.key) ? (
              <PixelButton variant="ghost" className="text-sm" onClick={() => act(c.key, 'unhide')}>{o.unhide}</PixelButton>
            ) : (
              <PixelButton variant="ghost" className="text-sm" onClick={() => act(c.key, 'hide')}>{o.hide}</PixelButton>
            )}
          </div>
        </article>
      ))}
      <div className="flex flex-wrap gap-2">
        {hidden.size > 0 && !showHidden && (
          <PixelButton variant="ghost" className="text-sm" onClick={() => setShowHidden(true)}>{o.showHidden(hidden.size)}</PixelButton>
        )}
        <PixelButton variant="ghost" className="text-sm" onClick={onClose}>{o.close}</PixelButton>
      </div>
    </section>
  );
}

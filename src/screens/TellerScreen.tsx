import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Dices } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useGame } from '../store/game';
import { apply, setTeller, tellerResetsProgress } from '../store/story';

type Who = 'me' | 'other' | 'random';

/** Only same-app routes are allowed as `next` (no open redirect). */
function safeNext(v: string | null, fallback: string): string {
  return v && v.startsWith('/j/') ? v : fallback;
}

/** S20 — who tells storyline 2 "อีกด้านของเรื่อง" (docs/06 S20, docs/02 เส้นเรื่องที่ 2). */
export function TellerScreen() {
  const { journeyId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const journey = useGame((s) => s.save.journeys[journeyId]);
  const players = useGame((s) => s.save.players);

  const localId = journey?.mode === 'remote_online' ? journey.remote?.localPlayerId : undefined;
  const prev = journey?.otherSide;
  const [who, setWho] = useState<Who | null>(() =>
    prev
      ? prev.randomized
        ? 'random'
        : prev.tellerPlayerId === (localId ?? journey?.playerIds[0])
          ? 'me'
          : 'other'
      : null,
  );
  const [rolled, setRolled] = useState<string | null>(() => (prev?.randomized ? prev.tellerPlayerId : null));
  const [confirmReset, setConfirmReset] = useState(false);
  // Live (3C): the partner may pick first — then follow them into the story.
  const [hadTeller] = useState(!!prev);
  const committed = useRef(false);
  const nextParam = params.get('next');
  useEffect(() => {
    if (journey?.mode === 'remote_online' && !hadTeller && !committed.current && journey.otherSide)
      navigate(safeNext(nextParam, `/j/${journey.id}/chapters?line=other`), { replace: true });
  }, [journey?.mode, journey?.otherSide, journey?.id, hadTeller, nextParam, navigate]);

  if (!journey) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <ScreenHeader title="" />
        <EmptyState
          title={ui.chapters.noJourney}
          body={ui.chapters.noJourneyBody}
          action={
            <Link to="/" className="btn btn-primary no-underline">
              {ui.home}
            </Link>
          }
        />
      </main>
    );
  }

  const t = ui.teller;
  const [meId, otherId] = localId
    ? [localId, journey.playerIds.find((x) => x !== localId)!]
    : journey.playerIds;
  const chaptersHref = `/j/${journey.id}/chapters?line=other`;
  const next = safeNext(nextParam, chaptersHref);

  function roll() {
    setRolled(Math.random() < 0.5 ? meId : otherId);
  }
  function choose(w: Who) {
    setWho(w);
    if (w === 'random' && !rolled) roll();
  }

  const tellerId = who === 'me' ? meId : who === 'other' ? otherId : rolled;
  const changes = !!prev && prev.tellerPlayerId !== tellerId;

  function commit() {
    if (!tellerId) return;
    committed.current = true;
    const jid = journey!.id;
    apply((s) => setTeller(s, jid, { tellerPlayerId: tellerId, randomized: who === 'random' }));
    useGame.getState().flush();
    navigate(next, { replace: true });
  }

  function onSubmit() {
    if (!tellerId || !journey) return;
    if (changes && tellerResetsProgress(journey)) setConfirmReset(true);
    else commit();
  }

  const option = (active: boolean) =>
    `btn w-full justify-start text-left ${active ? 'border-orange bg-orange/15' : 'bg-navy'}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8" data-testid="teller">
      <ScreenHeader title={t.heading} backTo={chaptersHref} />
      <p className="m-0 text-lavender">{t.intro}</p>
      <p className="m-0 text-sm text-lavender">{t.topics}</p>

      <fieldset className="panel m-0 flex flex-col gap-3">
        <legend className="sr-only">{t.whoQ}</legend>
        <p aria-hidden className="m-0 font-semibold">
          {t.whoQ}
        </p>
        <div className="flex flex-col gap-2" role="group" aria-label={t.whoQ}>
          <button
            type="button"
            aria-pressed={who === 'me'}
            className={option(who === 'me')}
            onClick={() => choose('me')}
          >
            {t.me}
          </button>
          <button
            type="button"
            aria-pressed={who === 'other'}
            className={option(who === 'other')}
            onClick={() => choose('other')}
          >
            {players[otherId]?.nickname ?? ''}
          </button>
          <button
            type="button"
            aria-pressed={who === 'random'}
            className={option(who === 'random')}
            onClick={() => choose('random')}
          >
            <Dices aria-hidden className="h-5 w-5" />
            {t.random}
          </button>
        </div>
        {who === 'random' && rolled && (
          <div className="flex flex-wrap items-center gap-3" aria-live="polite">
            <p className="m-0 font-semibold text-orange">{t.randomResult(players[rolled]?.nickname ?? '')}</p>
            <PixelButton variant="ghost" className="text-sm" onClick={roll}>
              {t.reroll}
            </PixelButton>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <PixelButton
          onClick={onSubmit}
          disabled={!tellerId}
          aria-describedby={tellerId ? undefined : 'teller-need'}
          className="self-start"
        >
          {prev ? t.save : t.start}
        </PixelButton>
        {!tellerId && (
          <p id="teller-need" className="m-0 text-[13px] text-lavender">
            {t.need}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t.resetTitle}
        body={t.resetBody}
        confirmLabel={t.resetConfirm}
        onConfirm={commit}
        onCancel={() => setConfirmReset(false)}
      />
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Dices } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useGame } from '../store/game';
import { apply, scenarioResetsProgress, setScenario } from '../store/story';

type Who = 'me' | 'other' | 'random';

/** Only same-app routes are allowed as `next` (no open redirect). */
function safeNext(v: string | null, fallback: string): string {
  return v && v.startsWith('/j/') ? v : fallback;
}

/** S5a — Scenario Setup (docs/02 §0.3, docs/06 S5a). */
export function ScenarioScreen() {
  const { journeyId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const journey = useGame((s) => s.save.journeys[journeyId]);
  const players = useGame((s) => s.save.players);

  const prev = journey?.scenario;
  const [who, setWho] = useState<Who | null>(() =>
    prev
      ? prev.randomized
        ? 'random'
        : prev.insiderPlayerId === journey?.playerIds[0]
          ? 'me'
          : 'other'
      : null,
  );
  const [rolled, setRolled] = useState<string | null>(() => (prev?.randomized ? prev.insiderPlayerId : null));
  const [warned, setWarned] = useState<boolean>(prev?.priorWarning ?? true);
  const [confirmReset, setConfirmReset] = useState(false);

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

  const [meId, otherId] = journey.playerIds;
  const other = players[otherId]?.nickname ?? '';
  const chaptersHref = `/j/${journey.id}/chapters`;
  const next = safeNext(params.get('next'), chaptersHref);

  function roll() {
    setRolled(Math.random() < 0.5 ? meId : otherId);
  }
  function choose(w: Who) {
    setWho(w);
    if (w === 'random' && !rolled) roll();
  }

  const insiderId = who === 'me' ? meId : who === 'other' ? otherId : rolled;
  const ready = !!insiderId;
  const changes = !!prev && (prev.insiderPlayerId !== insiderId || prev.priorWarning !== warned);

  function commit() {
    if (!insiderId) return;
    const jid = journey!.id;
    apply((s) =>
      setScenario(s, jid, { insiderPlayerId: insiderId, priorWarning: warned, randomized: who === 'random' }),
    );
    useGame.getState().flush();
    navigate(next, { replace: true });
  }

  function onSubmit() {
    if (!ready || !journey) return;
    if (changes && scenarioResetsProgress(journey)) setConfirmReset(true);
    else commit();
  }

  const option = (active: boolean) =>
    `btn w-full justify-start text-left ${active ? 'border-orange bg-orange/15' : 'bg-navy'}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.scenario.heading} backTo={chaptersHref} />
      <p className="m-0 text-lavender">{ui.scenario.intro}</p>

      <fieldset className="panel m-0 flex flex-col gap-3">
        <legend className="sr-only">{ui.scenario.whoQ}</legend>
        <p aria-hidden className="m-0 font-semibold">
          {ui.scenario.whoQ}
        </p>
        <div className="flex flex-col gap-2" role="group" aria-label={ui.scenario.whoQ}>
          <button
            type="button"
            aria-pressed={who === 'me'}
            className={option(who === 'me')}
            onClick={() => choose('me')}
          >
            {ui.scenario.me}
          </button>
          <button
            type="button"
            aria-pressed={who === 'other'}
            className={option(who === 'other')}
            onClick={() => choose('other')}
          >
            {other}
          </button>
          <button
            type="button"
            aria-pressed={who === 'random'}
            className={option(who === 'random')}
            onClick={() => choose('random')}
          >
            <Dices aria-hidden className="h-5 w-5" />
            {ui.scenario.random}
          </button>
        </div>
        {who === 'random' && rolled && (
          <div className="flex flex-wrap items-center gap-3" aria-live="polite">
            <p className="m-0 font-semibold text-orange">
              {ui.scenario.randomResult(players[rolled]?.nickname ?? '')}
            </p>
            <PixelButton variant="ghost" className="text-sm" onClick={roll}>
              {ui.scenario.reroll}
            </PixelButton>
          </div>
        )}
      </fieldset>

      <fieldset className="panel m-0 flex flex-col gap-3">
        <legend className="sr-only">{ui.scenario.warnQ}</legend>
        <p aria-hidden className="m-0 font-semibold">
          {ui.scenario.warnQ}
        </p>
        <div className="flex flex-col gap-2" role="group" aria-label={ui.scenario.warnQ}>
          <button
            type="button"
            aria-pressed={warned}
            className={option(warned)}
            onClick={() => setWarned(true)}
          >
            {ui.scenario.warnYes}
          </button>
          <button
            type="button"
            aria-pressed={!warned}
            className={option(!warned)}
            onClick={() => setWarned(false)}
          >
            {ui.scenario.warnNo}
          </button>
        </div>
      </fieldset>

      <p className="m-0 text-sm text-lavender">{ui.scenario.note}</p>
      <div className="flex flex-col gap-1">
        <PixelButton
          onClick={onSubmit}
          disabled={!ready}
          aria-describedby={ready ? undefined : 'scenario-need'}
          className="self-start"
        >
          {prev ? ui.scenario.save : ui.scenario.start}
        </PixelButton>
        {!ready && (
          <p id="scenario-need" className="m-0 text-[13px] text-lavender">
            {ui.scenario.needBoth}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={ui.scenario.resetTitle}
        body={ui.scenario.resetBody}
        confirmLabel={ui.scenario.resetConfirm}
        onConfirm={commit}
        onCancel={() => setConfirmReset(false)}
      />
    </main>
  );
}

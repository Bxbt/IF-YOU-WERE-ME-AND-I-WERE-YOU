/**
 * Consent-based reveal on the shared screen (docs/04 §6, docs/06 S7 Consent/Reveal, M10).
 * Shows no answer until the engine says the item is revealed. Consent is per player; a player with
 * a PIN passes the PIN gate before consenting (honest limit: on one device consent is only as strong
 * as the PIN — docs/08 §4). Colours never mean right/wrong; no counts (docs/06 S7 "ห้าม").
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Eye, Lock } from 'lucide-react';
import type { GameSession, PersonalityAnswer, SharedAnswer } from '../persistence/schema';
import type { QuestionContent } from '../content/types';
import { ui } from '../content/th/ui';
import { PixelButton } from './PixelButton';
import { PlayerGate } from './PlayerGate';
import { useGame } from '../store/game';
import { apply, consentItems, setRevealMode } from '../store/story';
import { entryFor, revealPairs, statementsVisibleTo, type MaskedAnswer } from '../engine/reveal';
import type { ChapterId } from '../content/types';

const r = ui.reveal;

export function describeAnswer(q: QuestionContent | undefined, a: MaskedAnswer | undefined): string {
  if (!a) return r.notAnswered;
  if ('preferNot' in a) return ui.answer.meta.prefer_not;
  if ('skipped' in a) return ui.answer.meta.skipped;
  if (a.status === 'skipped') return ui.answer.meta.skipped;
  if (a.meta) return ui.answer.meta[a.meta];
  const picked = q ? q.options.filter((o) => a.selected.includes(o.id)).map((o) => o.text) : [];
  const free = a.freeText?.trim() ? `“${a.freeText.trim()}”` : '';
  return [...picked, free].filter(Boolean).join(' · ') || r.notAnswered;
}

/** Runs once after the PIN gate opens, then reports back. */
function AfterUnlock({ run }: { run: () => void }) {
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export interface RevealPanelProps {
  journey: GameSession;
  ch: ChapterId;
  keys: string[];
  mode: 'single' | 'group' | 'statements';
  names: Record<string, string>;
  questionFor: (key: string) => QuestionContent | undefined;
  /** Ch4 only: ask "per question / end of chapter" before the first reveal. */
  askMode?: boolean;
  onDone: () => void;
}

export function RevealPanel({ journey, ch, keys, mode, names, questionFor, askMode, onDone }: RevealPanelProps) {
  const items = useGame((s) => s.save.journeys[journey.id]?.mirrorItems ?? {});
  const players = useGame((s) => s.save.players);
  const [a, b] = journey.playerIds;
  const [gate, setGate] = useState<{ playerId: string; consent: boolean } | null>(null);
  const [excluded, setExcluded] = useState<Record<string, string[]>>({ [a]: [], [b]: [] });

  if (askMode) {
    return (
      <section className="panel flex flex-col gap-3" aria-labelledby="reveal-mode-h">
        <h2 id="reveal-mode-h" className="m-0 text-lg font-semibold">
          {r.modeQuestion}
        </h2>
        <div className="flex flex-wrap gap-2">
          <PixelButton onClick={() => apply((s) => setRevealMode(s, journey.id, ch, 'per_question'))}>
            {r.modePer}
          </PixelButton>
          <PixelButton
            variant="ghost"
            onClick={() => {
              apply((s) => setRevealMode(s, journey.id, ch, 'end_of_chapter'));
              onDone();
            }}
          >
            {r.modeEnd}
          </PixelButton>
        </div>
      </section>
    );
  }

  const list = keys.map((k) => items[k]).filter((x): x is SharedAnswer => !!x);
  const open = list.filter((x) => x.state === 'awaiting_consent');
  // Nothing left to consent to → show the results (anything not revealed is shown as pending).
  const done = list.length > 0 && open.length === 0;

  function doConsent(playerId: string, consent: boolean) {
    apply((s) => consentItems(s, journey.id, keys, playerId, consent, consent ? (excluded[playerId] ?? []) : []));
    useGame.getState().flush();
  }
  function ask(playerId: string, consent: boolean) {
    if (players[playerId]?.pin) setGate({ playerId, consent });
    else doConsent(playerId, consent);
  }

  if (list.length === 0) {
    return (
      <section className="panel flex flex-col gap-3">
        <p className="m-0">{r.nothingToReveal}</p>
        <PixelButton className="self-start" onClick={onDone}>
          {r.next}
        </PixelButton>
      </section>
    );
  }

  const heading = mode === 'statements' ? r.statementsHeading : mode === 'group' ? r.groupHeading : r.heading;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="reveal-h" data-testid="reveal-panel">
      <h2 id="reveal-h" className="m-0 text-lg font-semibold">
        {done ? ui.labels.revealed : heading}
      </h2>

      {!done && (
        <div className="panel flex flex-col gap-4">
          <p className="m-0 text-sm">{r.bothAnswered}</p>
          {mode === 'statements' && <p className="m-0 text-sm text-lavender">{r.statementsNote}</p>}
          {[a, b].map((pid) => {
            const other = pid === a ? b : a;
            const consented = open.length > 0 && open.every((x) => x.entries[pid]?.consent || !x.entries[pid]);
            return (
              <div key={pid} className="flex flex-col gap-2 border-t border-lavender/20 pt-3 first:border-0 first:pt-0">
                <p className="m-0 flex items-center gap-2 text-sm" data-testid={`consent-status-${pid}`}>
                  {consented ? (
                    <CheckCircle2 aria-hidden className="h-4 w-4 text-orange" />
                  ) : (
                    <Circle aria-hidden className="h-4 w-4 text-lavender" />
                  )}
                  {consented ? r.consented(names[pid] ?? '') : r.notYet(names[pid] ?? '')}
                </p>
                {mode === 'group' && !consented && (
                  <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
                    <legend className="mb-1 p-0 text-[13px] text-lavender">{r.includeLabel(names[pid] ?? '')}</legend>
                    {open.map((x) => {
                      const on = !(excluded[pid] ?? []).includes(x.key);
                      return (
                        <label key={x.key} className="flex min-h-[44px] items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setExcluded((e) => ({
                                ...e,
                                [pid]: on ? [...(e[pid] ?? []), x.key] : (e[pid] ?? []).filter((k) => k !== x.key),
                              }))
                            }
                            className="h-5 w-5 accent-[rgb(var(--c-orange))]"
                          />
                          {questionFor(x.key)?.self.replaceAll('{other}', names[other] ?? '') ?? x.key}
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                <p className="m-0 text-[13px] text-lavender">{r.warning(names[other] ?? '')}</p>
                {consented ? (
                  <PixelButton variant="ghost" className="self-start" onClick={() => ask(pid, false)}>
                    {r.withdraw(names[pid] ?? '')}
                  </PixelButton>
                ) : (
                  <PixelButton
                    className="self-start"
                    icon={players[pid]?.pin ? <Lock aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                    onClick={() => ask(pid, true)}
                  >
                    {r.consent(names[pid] ?? '')}
                  </PixelButton>
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-1 border-t border-lavender/20 pt-3">
            <PixelButton variant="ghost" className="self-start" onClick={onDone}>
              {r.keep}
            </PixelButton>
            <p className="m-0 text-[13px] text-lavender">{r.keepNote}</p>
          </div>
        </div>
      )}

      {done && (
        <>
          {mode === 'statements' ? (
            <StatementsResult items={list} a={a} b={b} names={names} />
          ) : (
            list.map((x) => <MirrorResult key={x.key} item={x} a={a} b={b} names={names} q={questionFor(x.key)} />)
          )}
          <PixelButton className="self-start" onClick={onDone}>
            {r.next}
          </PixelButton>
        </>
      )}

      {gate && (
        <PlayerGate playerId={gate.playerId} onCancel={() => setGate(null)}>
          <AfterUnlock
            run={() => {
              doConsent(gate.playerId, gate.consent);
              setGate(null);
            }}
          />
        </PlayerGate>
      )}
    </section>
  );
}

function MirrorResult({
  item,
  a,
  b,
  names,
  q,
}: {
  item: SharedAnswer;
  a: string;
  b: string;
  names: Record<string, string>;
  q: QuestionContent | undefined;
}) {
  const title = q?.self ?? item.key;
  if (item.state === 'skipped') {
    return (
      <article className="panel">
        <p className="m-0 font-semibold">{title}</p>
        <p className="m-0 text-sm text-lavender">{r.bothSkipped}</p>
      </article>
    );
  }
  if (item.state !== 'revealed') {
    return (
      <article className="panel" data-testid={`reveal-pending-${item.key}`}>
        <p className="m-0 font-semibold">{title}</p>
        <p className="m-0 text-sm text-lavender">{r.pending}</p>
      </article>
    );
  }
  const pairs = revealPairs(item, a, b);
  // Each owner's entry as the other player may see it (masks prefer_not / skipped — R4, R5).
  const seen = { [a]: entryFor(item, a, b), [b]: entryFor(item, b, a) };
  return (
    <article className="panel flex flex-col gap-3" data-testid={`reveal-result-${item.key}`}>
      <p className="m-0 font-semibold">{title}</p>
      {[a, b].map((owner) => {
        const viewer = owner === a ? b : a;
        const e = seen[owner];
        if (e && 'preferNot' in e) return <p key={owner} className="m-0 text-sm">{r.preferNot(names[owner] ?? '')}</p>;
        if (e && 'skipped' in e) return <p key={owner} className="m-0 text-sm">{r.skipped(names[owner] ?? '')}</p>;
        const other = seen[viewer];
        const guess = other && 'visible' in other ? other.perceived : undefined;
        const said = e && 'visible' in e ? e.self : undefined;
        const pair = pairs.find((p) => p.kind === (owner === a ? 'a_view' : 'b_view'));
        const msg =
          pair?.category === 'similar'
            ? r.reflection.similar(names[viewer] ?? '', names[owner] ?? '')
            : pair?.category === 'different'
              ? r.reflection.different
              : r.reflection.ask;
        return (
          <div key={owner} className="grid gap-2 border-t border-lavender/20 pt-3 first:border-0 first:pt-0 md:grid-cols-2">
            <Card title={r.saidLabel(names[owner] ?? '')} body={describeAnswer(q, said as PersonalityAnswer | undefined)} />
            <Card
              title={r.thinksLabel(names[viewer] ?? '', names[owner] ?? '')}
              body={describeAnswer(q, guess as PersonalityAnswer | undefined)}
            />
            <p className="m-0 text-sm italic text-lavender md:col-span-2">{msg}</p>
          </div>
        );
      })}
    </article>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-btn border-2 border-lavender/30 bg-navy p-3">
      <span className="text-[13px] text-lavender">{title}</span>
      <span>{body}</span>
    </div>
  );
}

function StatementsResult({
  items,
  a,
  b,
  names,
}: {
  items: SharedAnswer[];
  a: string;
  b: string;
  names: Record<string, string>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[a, b].map((owner) => {
        const viewer = owner === a ? b : a;
        const shown = statementsVisibleTo(items, viewer, owner);
        return (
          <article key={owner} className="panel flex flex-col gap-2" data-testid={`statements-${owner}`}>
            <h3 className="m-0 text-base font-semibold">{r.statementsOf(names[owner] ?? '')}</h3>
            {shown.length === 0 ? (
              <p className="m-0 text-sm text-lavender">{r.noShared(names[owner] ?? '')}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {shown.map((s) => (
                  <li key={s.key} className="rounded-btn border border-orange/40 p-2">
                    {s.text}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

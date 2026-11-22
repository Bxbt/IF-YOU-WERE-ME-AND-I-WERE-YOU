import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ui } from '../content/th/ui';
import { templates } from '../content/th/templates';
import { MIRRORS } from '../content/th/questions';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { RevealPanel, describeAnswer } from '../components/Reveal';
import { ProfileOffer } from '../components/ProfileOffer';
import { PixelButton } from '../components/PixelButton';
import { useGame } from '../store/game';
import { compareTogether, optionTexts, sharedTexts, type TogetherItem, type TogetherView } from '../engine/compare';
import { dimensionName } from '../engine/personality';
import type { GameSession } from '../persistence/schema';

const c = templates.compare;

/**
 * S8 in Play Together (docs/06 S8, docs/04 §7): only items both players agreed to open. No counts,
 * no colours meaning right/wrong. Items still awaiting consent can be opened here (shared screen).
 */
export function CompareTogether({ journey }: { journey: GameSession }) {
  const save = useGame((s) => s.save);
  const players = save.players;
  const live = save.journeys[journey.id] ?? journey;
  const cmp = useMemo(() => compareTogether(live, save), [live, save]);
  const [view, setView] = useState<TogetherView | 'all'>('all');
  const [opening, setOpening] = useState(false);
  const [a, b] = live.playerIds;
  const name = (id: string) => players[id]?.nickname ?? '';
  const back = `/j/${live.id}/chapters`;

  const filter = (items: TogetherItem[]) => (view === 'all' ? items : items.filter((i) => i.view === view));
  const sentence = (i: TogetherItem) => {
    const dim = dimensionName(i.dimension) || i.question.self;
    if (i.category === 'similar' && i.x && i.y)
      return c.togetherSimilar(dim, sharedTexts(i.question, i.x, i.y), name(i.xOwner), name(i.yOwner), i.view);
    if (i.category === 'different' && i.x && i.y)
      return c.togetherDifferent(
        dim,
        optionTexts(i.question, i.x.selected),
        optionTexts(i.question, i.y.selected),
        name(i.xOwner),
        name(i.yOwner),
        i.view,
      );
    return i.question.reflectionPrompt || i.question.self;
  };

  const sections = [
    { id: 'similar', title: c.similarTitle, items: filter(cmp.similar), intro: undefined },
    { id: 'different', title: c.differentTitle, items: filter(cmp.different), intro: c.differentIntro },
    { id: 'ask', title: c.askTitle, items: filter(cmp.ask), intro: undefined },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={c.heading} backTo={back} />
      <p className="m-0 text-lavender">{c.intro}</p>
      <p className="m-0 text-sm">{c.togetherIntro}</p>

      {cmp.pending.length > 0 && (
        <section className="panel flex flex-col gap-2" aria-labelledby="pending-h" data-testid="compare-pending">
          <h2 id="pending-h" className="m-0 text-lg font-semibold">
            {c.pendingTitle}
          </h2>
          <p className="m-0 text-sm text-lavender">{c.pendingBody}</p>
          <ul className="m-0 pl-5 text-sm">
            {cmp.pending.map((k) => (
              <li key={k}>{MIRRORS.find((m) => m.id === k)?.self ?? k}</li>
            ))}
          </ul>
          {opening ? (
            <RevealPanel
              journey={live}
              ch="ch4"
              keys={cmp.pending}
              mode="group"
              names={{ [a]: name(a), [b]: name(b) }}
              questionFor={(k) => MIRRORS.find((m) => m.id === k)}
              onDone={() => setOpening(false)}
            />
          ) : (
            <PixelButton className="self-start" onClick={() => setOpening(true)}>
              {c.pendingOpen}
            </PixelButton>
          )}
        </section>
      )}

      <ProfileOffer journey={live} />

      {!cmp.comparable ? (
        <EmptyState
          art="waiting"
          title={c.emptyTogether}
          body={c.emptyTogetherBody}
          action={
            <Link to={back} className="btn btn-primary no-underline">
              {ui.chapters.heading}
            </Link>
          }
        />
      ) : (
        <>
          <div role="group" aria-label={c.views.all} className="flex flex-wrap gap-2">
            {(
              [
                ['all', c.views.all],
                ['a_view', c.views.a_view(name(a))],
                ['b_view', c.views.b_view(name(b))],
                ['direct', c.views.direct],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={`min-h-[44px] rounded-full border-2 px-3 text-sm ${view === id ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {sections.map((sec) => (
              <details key={sec.id} open className="panel" data-testid={`compare-${sec.id}`}>
                <summary className="min-h-[44px] cursor-pointer text-lg font-semibold">{sec.title}</summary>
                {sec.intro && sec.items.length > 0 && (
                  <p className="m-0 mt-2 text-sm italic text-lavender">{sec.intro}</p>
                )}
                <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                  {sec.items.length === 0 && <li className="text-sm text-lavender">{c.emptyCategory}</li>}
                  {sec.items.map((i) => (
                    <li key={`${sec.id}-${i.question.id}-${i.view}`}>
                      <article className="flex flex-col gap-1 rounded-btn border-2 border-lavender/30 bg-navy p-3">
                        <span className="text-[13px] text-lavender">
                          {dimensionName(i.dimension)} ·{' '}
                          {i.view === 'direct' ? c.views.direct : c.views[i.view](name(i.yOwner))}
                        </span>
                        <p className="m-0">{sentence(i)}</p>
                        {sec.id === 'ask' && (
                          <p className="m-0 text-[13px] text-lavender">
                            {name(i.xOwner)}: {describeAnswer(i.question, i.x)} · {name(i.yOwner)}:{' '}
                            {describeAnswer(i.question, i.y)}
                          </p>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

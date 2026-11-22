import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, MessageCirclePlus } from 'lucide-react';
import { ui } from '../content/th/ui';
import { templates } from '../content/th/templates';
import { DIMENSIONS } from '../content/th/questions';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { AssumptionTag } from '../components/Labels';
import { PixelButton } from '../components/PixelButton';
import { useGame } from '../store/game';
import { addNextConversation, apply } from '../store/story';
import { compareSolo, optionTexts, sharedTexts, type CompareItem } from '../engine/compare';
import { dimensionName } from '../engine/personality';
import { CHAPTER_BY_ID } from '../content/th/chapters';
import { chapterHref } from './ChaptersScreen';

const c = templates.compare;

/** S8 — Personality Comparison (docs/06 S8, docs/04 §7). Solo rules; never shows counts. */
export function CompareScreen() {
  const { journeyId = '' } = useParams();
  const save = useGame((s) => s.save);
  const journey = save.journeys[journeyId];
  const [dim, setDim] = useState<string | null>(null);
  const comparison = useMemo(() => (journey ? compareSolo(save, journey) : null), [save, journey]);

  if (!journey || !comparison) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <ScreenHeader title="" />
        <EmptyState
          title={ui.chapters.noJourney}
          action={
            <Link to="/" className="btn btn-primary no-underline">
              {ui.home}
            </Link>
          }
        />
      </main>
    );
  }
  const [selfId, partnerId] = journey.playerIds;
  const other = save.players[partnerId]?.nickname ?? '';
  const back = `/j/${journey.id}/chapters`;

  if (!comparison.comparable) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <ScreenHeader title={c.heading} backTo={back} />
        <EmptyState
          title={c.emptyTitle}
          body={c.emptyBody(other)}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to={`/profile/${selfId}/self?set=quick`} className="btn btn-primary no-underline">
                {c.emptyQuick}
              </Link>
              <Link
                to={chapterHref(
                  journey,
                  CHAPTER_BY_ID.ch4,
                  journey.chapterProgress.ch4?.status === 'in_progress' ? '' : '?start=1',
                )}
                className="btn btn-ghost no-underline"
              >
                {c.emptyCh4}
              </Link>
            </div>
          }
        />
      </main>
    );
  }

  const filter = (items: CompareItem[]) => (dim ? items.filter((i) => i.dimension === dim) : items);
  const added = (qid: string) =>
    journey.nextConversation.some((n) => n.sourceRef === qid && n.source === 'comparison');
  const add = (item: CompareItem) =>
    item.question.reflectionPrompt &&
    apply((s) =>
      addNextConversation(
        s,
        journey.id,
        selfId,
        item.question.reflectionPrompt!,
        'comparison',
        item.question.id,
      ),
    );

  const sentence = (i: CompareItem): string => {
    const name = dimensionName(i.dimension) || i.question.self;
    if (i.category === 'similar' && i.x && i.y)
      return c.similar(name, sharedTexts(i.question, i.x, i.y), other);
    if (i.category === 'different' && i.x && i.y)
      return c.different(
        name,
        optionTexts(i.question, i.x.selected),
        optionTexts(i.question, i.y.selected),
        other,
      );
    return i.question.reflectionPrompt || i.question.self;
  };
  const reason = (i: CompareItem) =>
    i.reason === 'solo_unknown' ? c.askReason.solo_unknown(other) : i.reason ? c.askReason[i.reason] : '';

  const sections = [
    { id: 'similar', title: c.soloSimilarTitle, items: filter(comparison.similar), intro: undefined },
    {
      id: 'different',
      title: c.soloDifferentTitle,
      items: filter(comparison.different),
      intro: c.differentIntro,
    },
    { id: 'ask', title: c.askTitle, items: filter(comparison.ask), intro: undefined },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={c.heading} backTo={back} />
      <p className="m-0 text-lavender">{c.intro}</p>
      <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
        <AssumptionTag />
        {c.soloIntro(other)}
      </p>

      <div role="group" aria-label={ui.chapters.compare} className="flex flex-wrap gap-2">
        {[
          { id: null, name: c.allDims },
          ...DIMENSIONS.map((d) => ({ id: d.id as string | null, name: d.name })),
        ].map((d) => (
          <button
            key={d.id ?? 'all'}
            type="button"
            aria-pressed={dim === d.id}
            onClick={() => setDim(d.id)}
            className={`min-h-[44px] rounded-full border-2 px-3 text-sm ${dim === d.id ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {sections.map((sec) => (
          <details key={sec.id} open className="panel group" data-testid={`compare-${sec.id}`}>
            <summary className="min-h-[44px] cursor-pointer text-lg font-semibold">{sec.title}</summary>
            {sec.intro && sec.items.length > 0 && (
              <p className="m-0 mt-2 text-sm italic text-lavender">{sec.intro}</p>
            )}
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {sec.items.length === 0 && <li className="text-sm text-lavender">{c.emptyCategory}</li>}
              {sec.items.map((i) => (
                <li key={`${sec.id}-${i.question.id}`}>
                  <CompareCard
                    dimension={dimensionName(i.dimension)}
                    sentence={sentence(i)}
                    reason={sec.id === 'ask' ? reason(i) : undefined}
                    question={i.question.self}
                    youSaid={i.x ? describe(i.question, i.x) : undefined}
                    youThink={i.y ? describe(i.question, i.y) : undefined}
                    other={other}
                    canAdd={!!i.question.reflectionPrompt}
                    added={added(i.question.id)}
                    onAdd={() => add(i)}
                  />
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <Link to={`/j/${journey.id}/report/${selfId}`} className="btn btn-primary self-start no-underline">
        <FileText aria-hidden className="h-5 w-5" />
        {ui.chapters.report}
      </Link>
    </main>
  );
}

function describe(q: CompareItem['question'], a: NonNullable<CompareItem['x']>): string {
  if (a.status === 'skipped') return ui.answer.meta.skipped;
  if (a.meta) return ui.answer.meta[a.meta];
  return [optionTexts(q, a.selected), a.freeText ? `“${a.freeText}”` : ''].filter(Boolean).join(' · ');
}

function CompareCard(p: {
  dimension: string;
  sentence: string;
  reason?: string;
  question: string;
  youSaid?: string;
  youThink?: string;
  other: string;
  canAdd: boolean;
  added: boolean;
  onAdd: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex flex-col gap-2 rounded-btn border-2 border-lavender/30 bg-navy p-3">
      <div className="flex flex-wrap items-center gap-2">
        {p.dimension && <span className="text-[13px] text-lavender">{p.dimension}</span>}
        <AssumptionTag />
      </div>
      <p className="m-0">{p.sentence}</p>
      {p.reason && <p className="m-0 text-[13px] text-lavender">{p.reason}</p>}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] self-start text-sm text-lavender underline"
      >
        {templates.compare.seeQuestion}
      </button>
      {open && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="m-0 font-semibold">{p.question.replaceAll('{other}', p.other)}</p>
          {p.youSaid && (
            <p className="m-0">
              <span className="text-lavender">{templates.compare.youSaid}: </span>
              {p.youSaid}
            </p>
          )}
          {p.youThink && (
            <p className="m-0">
              <span className="text-lavender">{templates.compare.youThink(p.other)}: </span>
              {p.youThink}
            </p>
          )}
          {p.canAdd && (
            <PixelButton
              variant="ghost"
              className="mt-1 self-start text-sm"
              disabled={p.added}
              onClick={p.onAdd}
              icon={<MessageCirclePlus aria-hidden className="h-4 w-4" />}
            >
              {p.added ? templates.compare.added : templates.compare.addToNext}
            </PixelButton>
          )}
        </div>
      )}
    </article>
  );
}

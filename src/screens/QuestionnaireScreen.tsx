import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldAlert, Trash2, X } from 'lucide-react';
import { ui } from '../content/th/ui';
import { useGame } from '../store/game';
import { draftKey, getAnswers, profileKey, saveAnswer, saveDraft } from '../store/actions';
import { scheduleDelete, undoDelete } from '../store/pendingDeletes';
import { QUESTION_BY_ID, dimensionName, progress, questionText, setIds, type QuestionSet } from '../engine/personality';
import { canProceed, emptyDraft, toggleOption, type AnswerDraft } from '../engine/answers';
import { ChoiceList, FreeTextField, MetaOptions } from '../components/Answering';
import { AssumptionTag } from '../components/Labels';
import { PixelButton } from '../components/PixelButton';
import { toast } from '../components/toast';
import type { PersonalityAnswer } from '../persistence/schema';

let metaToastShown = false;

function toDraft(a: PersonalityAnswer | undefined, draftText: string | undefined): AnswerDraft {
  if (!a) return { ...emptyDraft(), freeText: draftText ?? '' };
  return { selected: [...a.selected], meta: a.meta, freeText: a.freeText ?? draftText ?? '' };
}

/**
 * S4 Personality Setup (docs/06 S4). Routes:
 *   /profile/:playerId/self?set=quick|full[&q=Q13&single=1]
 *   /profile/:playerId/perceived/:aboutId?set=...
 */
export function QuestionnaireScreen({ layer }: { layer: 'self' | 'perceived' }) {
  const { playerId = '', aboutId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const owner = useGame((s) => s.save.players[playerId]);
  const about = useGame((s) => (aboutId ? s.save.players[aboutId] : undefined));
  const set = (params.get('set') as QuestionSet | null) ?? null;
  const single = params.get('single') === '1';
  const focusQ = params.get('q');

  if (!owner || (layer === 'perceived' && !about)) return <Navigate to="/profile" replace />;
  if (!set || (set !== 'quick' && set !== 'full')) return <ChooseSet />;
  return (
    <Runner
      key={`${layer}-${set}-${focusQ ?? ''}-${single}`}
      ownerId={playerId}
      layer={layer}
      aboutId={aboutId}
      aboutName={about?.nickname ?? ''}
      set={set}
      single={single}
      focusQ={focusQ}
      onExit={() => navigate(single ? answersPath(playerId, layer, aboutId) : '/profile')}
    />
  );
}

export const answersPath = (ownerId: string, layer: 'self' | 'perceived', aboutId?: string) =>
  layer === 'self' ? `/profile/${ownerId}/self/answers` : `/profile/${ownerId}/perceived/${aboutId}/answers`;

function ChooseSet() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 py-8">
      <h1 className="m-0 text-2xl font-semibold">{ui.quiz.chooseHeading}</h1>
      <p className="m-0 text-lavender">{ui.quiz.chooseBody}</p>
      <Link to="?set=quick" className="btn btn-primary no-underline">{ui.hub.quick}</Link>
      <Link to="?set=full" className="btn btn-ghost no-underline">{ui.hub.full}</Link>
      <Link to="/profile" className="text-sm text-lavender underline">{ui.back}</Link>
    </main>
  );
}

interface RunnerProps {
  ownerId: string;
  layer: 'self' | 'perceived';
  aboutId?: string;
  aboutName: string;
  set: QuestionSet;
  single: boolean;
  focusQ: string | null;
  onExit: () => void;
}

function Runner({ ownerId, layer, aboutId, aboutName, set, single, focusQ, onExit }: RunnerProps) {
  const ids = useMemo(() => (single && focusQ ? [focusQ] : setIds(set)), [set, single, focusQ]);
  const key = profileKey(ownerId, layer, aboutId);
  const answers = useGame((s) => getAnswers(s.save, key));
  const drafts = useGame((s) => s.save.drafts);
  const startIndex = useMemo(() => {
    if (focusQ && !single) return Math.max(0, ids.indexOf(focusQ));
    const p = progress(useGame.getState().save.profiles[key]?.answers ?? {}, ids);
    return p.firstOpen === -1 ? (single ? 0 : ids.length) : p.firstOpen;
  }, [ids, key, focusQ, single]);
  const [index, setIndex] = useState(startIndex);
  const done = index >= ids.length;
  const qid = ids[Math.min(index, ids.length - 1)]!;
  const q = QUESTION_BY_ID[qid]!;
  const dKey = draftKey(ownerId, layer, aboutId, qid);
  const [draft, setDraft] = useState<AnswerDraft>(() => toDraft(answers[qid], drafts[dKey]?.text));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loadedQid = useRef(qid);

  // Load the saved answer when the question changes. Skipped on mount: useState already did it,
  // and re-running it there can wipe a selection the player made before effects flushed.
  useEffect(() => {
    if (done || loadedQid.current === qid) return;
    loadedQid.current = qid;
    const s = useGame.getState().save;
    setDraft(toDraft(getAnswers(s, key)[qid], s.drafts[draftKey(ownerId, layer, aboutId, qid)]?.text));
    headingRef.current?.focus();
  }, [qid, done, key, ownerId, layer, aboutId]);

  // Free-text drafts survive a closed tab (docs/05 §6), saved every 2 s while typing.
  useEffect(() => {
    if (done) return;
    const saved = useGame.getState().save.profiles[key]?.answers[qid]?.freeText ?? '';
    if (draft.freeText === saved) return;
    const t = setTimeout(() => saveDraft(ownerId, dKey, draft.freeText), 2000);
    return () => clearTimeout(t);
  }, [draft.freeText, dKey, ownerId, key, qid, done]);

  function commit(): boolean {
    if (!canProceed(draft)) return false;
    saveAnswer(ownerId, layer, aboutId, qid, draft);
    return true;
  }
  function next() {
    if (!commit()) return;
    if (single) {
      useGame.getState().flush();
      onExit();
      return;
    }
    setIndex((i) => i + 1);
  }
  function prev() {
    commit();
    setIndex((i) => Math.max(0, i - 1));
  }
  function exit() {
    commit();
    useGame.getState().flush();
    onExit();
  }
  function onChange(d: AnswerDraft) {
    if (d.meta && !draft.meta && draft.selected.length > 0 && !metaToastShown) {
      metaToastShown = true;
      toast(ui.quiz.firstMetaToast);
    }
    setDraft(d);
  }

  // Keyboard: digits pick options, Enter goes next (outside text fields).
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) {
        onChange(toggleOption(draft, q.options[n - 1]!, q.options, q.maxSelect));
      } else if (e.key === 'Enter' && t.tagName !== 'BUTTON' && t.tagName !== 'A') {
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (done) {
    const p = progress(answers, ids);
    const firstSkipped = ids.findIndex((id) => answers[id]?.status === 'skipped');
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 py-8">
        <h1 className="m-0 text-2xl font-semibold">{ui.quiz.summaryHeading}</h1>
        <p role="status" className="m-0">{ui.quiz.summary(p.answered, p.skipped)}</p>
        {firstSkipped >= 0 && <PixelButton variant="ghost" onClick={() => setIndex(firstSkipped)}>{ui.quiz.backToSkipped}</PixelButton>}
        <PixelButton onClick={exit}>{ui.quiz.done}</PixelButton>
      </main>
    );
  }

  const who = layer === 'self' ? ui.quiz.aboutYou : ui.quiz.aboutOther(aboutName);
  const saved = answers[qid];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{who}</span>
          {layer === 'perceived' && <AssumptionTag />}
        </div>
        <button type="button" onClick={exit} className="btn btn-ghost px-3 text-sm">
          <X aria-hidden className="h-5 w-5" />
          {ui.quiz.exit}
        </button>
      </header>

      {!single && (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[13px] text-lavender">{ui.quiz.position(index + 1, ids.length)}</p>
          <div aria-hidden className="h-1.5 w-full bg-lavender/20">
            <div className="h-full bg-lavender" style={{ width: `${((index + 1) / ids.length) * 100}%` }} />
          </div>
        </div>
      )}

      <section className="panel flex flex-col gap-4" aria-labelledby="q-h">
        <p className="m-0 text-[13px] text-lavender">{dimensionName(q.dimension)}</p>
        <h1 id="q-h" ref={headingRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">
          {questionText(q, layer, aboutName)}
        </h1>
        {q.safetyNote && (
          <p className="m-0 flex items-start gap-2 rounded-btn border border-lavender/40 p-3 text-sm">
            <ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
            <span>
              {q.safetyNote} <Link to="/about" className="text-lavender underline">{ui.title.about}</Link>
            </span>
          </p>
        )}
        <ChoiceList label={questionText(q, layer, aboutName)} options={q.options} maxSelect={q.maxSelect} draft={draft} onChange={onChange} />
        <MetaOptions draft={draft} onChange={onChange} />
        <FreeTextField draft={draft} onChange={onChange} />
      </section>

      {/* Sticky so "next" is always reachable without scrolling on small screens. */}
      <nav aria-label="การนำทางคำถาม" className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-lavender/20 bg-navy/95 px-4 py-3">
        {single ? (
          saved ? (
            <PixelButton
              variant="ghost"
              icon={<Trash2 aria-hidden className="h-5 w-5" />}
              onClick={() => {
                const k = scheduleDelete(ownerId, layer, aboutId, qid);
                toast(ui.quiz.deleted, 'info', { label: ui.quiz.undo, onClick: () => undoDelete(k) }, 5000);
                onExit();
              }}
            >
              {ui.quiz.deleteAnswer}
            </PixelButton>
          ) : (
            <span />
          )
        ) : (
          <PixelButton variant="ghost" disabled={index === 0} onClick={prev} icon={<ArrowLeft aria-hidden className="h-5 w-5" />}>
            {ui.quiz.prev}
          </PixelButton>
        )}
        <PixelButton disabled={!canProceed(draft)} onClick={next}>
          {single ? ui.player.save : index === ids.length - 1 ? ui.quiz.finish : ui.quiz.next}
          {!single && <ArrowRight aria-hidden className="h-5 w-5" />}
        </PixelButton>
      </nav>
    </main>
  );
}

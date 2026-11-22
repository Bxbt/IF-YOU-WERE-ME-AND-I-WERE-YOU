/**
 * S16 Memory Scenes (docs/06 S16, M11). Routes (each behind the owner's PIN gate):
 *   /memories/:playerId                 list (own + what the partner shared)
 *   /memories/:playerId/new             create
 *   /memories/:playerId/:memId          play the scene
 *   /memories/:playerId/:memId/edit     edit (owner only)
 * The scene is a fixed 5-beat template; the player's text is shown exactly as written.
 */
import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BookHeart, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { ui } from '../content/th/ui';
import { EMO_SET, NEED_SET } from '../content/th/chapters/ch3';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { AssumptionTag } from '../components/Labels';
import { ChoiceList } from '../components/Answering';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PixelButton } from '../components/PixelButton';
import { SceneCanvas } from '../scene/SceneCanvas';
import { DEFAULT_ENV } from '../scene/env';
import { BACKGROUNDS } from '../scene/backgrounds';
import type { CastMember, CastRole } from '../scene/cast';
import { useGame } from '../store/game';
import { activeJourney } from '../store/actions';
import { addNextConversation, apply } from '../store/story';
import { MEMORY_BACKGROUNDS, deleteMemory, memoriesVisibleTo, saveMemory, setMemoryShared, type Memory, type MemoryInput } from '../store/memories';
import type { AnswerDraft } from '../engine/answers';

const m = ui.memories;
type Category = Memory['category'];
const CATEGORIES = Object.keys(m.categories) as Category[];

function usePartnerIds(playerId: string): string[] {
  // Select the stable journeys object, derive the array in a memo (a fresh array from the
  // selector itself would make the store re-render forever).
  const journeys = useGame((s) => s.save.journeys);
  return useMemo(
    () =>
      Object.values(journeys)
        .filter((j) => j.playerIds.includes(playerId))
        .flatMap((j) => j.playerIds.filter((p) => p !== playerId)),
    [journeys, playerId],
  );
}

function partnerName(save: ReturnType<typeof useGame.getState>['save'], playerId: string): string {
  const j = activeJourney(save) ?? Object.values(save.journeys).find((x) => x.playerIds.includes(playerId));
  const other = j?.playerIds.find((p) => p !== playerId);
  return (other && save.players[other]?.nickname) || 'คู่ของคุณ';
}

export function MemoriesListScreen() {
  const { playerId = '' } = useParams();
  const save = useGame((s) => s.save);
  const partners = usePartnerIds(playerId);
  const owner = save.players[playerId];
  const list = useMemo(() => memoriesVisibleTo(save, playerId, partners), [save, playerId, partners]);
  if (!owner || owner.kind !== 'real') return <Navigate to="/profile" replace />;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={m.heading(owner.nickname)} backTo="/profile" />
      <p className="m-0 text-sm text-lavender">{m.intro}</p>
      <Link to={`/memories/${playerId}/new`} className="btn btn-primary self-start no-underline">
        <Plus aria-hidden className="h-5 w-5" />
        {m.create}
      </Link>
      {list.length === 0 ? (
        <EmptyState title={m.empty} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.map((x) => (
            <li key={x.id}>
              <Link to={`/memories/${playerId}/${x.id}`} className="panel flex items-start gap-3 no-underline text-cream">
                <BookHeart aria-hidden className="mt-1 h-5 w-5 shrink-0 text-orange" />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{x.title || m.categories[x.category]}</span>
                  <span className="text-[13px] text-lavender">
                    {m.categories[x.category]} ·{' '}
                    {x.ownerId === playerId ? m.mine : m.sharedBy(save.players[x.ownerId]?.nickname ?? '')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const toDraft = (c?: Memory['myFeelings']): AnswerDraft => ({ selected: [...(c?.selected ?? [])], meta: null, freeText: c?.freeText ?? '' });
const fromDraft = (d: AnswerDraft): Memory['myFeelings'] => ({ selected: d.selected, ...(d.freeText.trim() ? { freeText: d.freeText } : {}) });
const inputCls = 'min-h-[44px] w-full rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream';

export function MemoryFormScreen() {
  const { playerId = '', memId } = useParams();
  const navigate = useNavigate();
  const save = useGame((s) => s.save);
  const existing = memId ? save.memories[memId] : undefined;
  const other = partnerName(save, playerId);
  const [category, setCategory] = useState<Category>(existing?.category ?? 'meaningful');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [happened, setHappened] = useState(existing?.whatHappened ?? '');
  const [feel, setFeel] = useState<AnswerDraft>(toDraft(existing?.myFeelings));
  const [need, setNeed] = useState<AnswerDraft>(toDraft(existing?.myNeeds));
  const [guess, setGuess] = useState<AnswerDraft>(toDraft(existing?.partnerFeelingsGuess));
  const [bg, setBg] = useState<string>(existing?.background ?? MEMORY_BACKGROUNDS[0]);
  const [touched, setTouched] = useState(false);

  if (!save.players[playerId] || (memId && existing?.ownerId !== playerId)) return <Navigate to={`/memories/${playerId}`} replace />;

  function submit() {
    setTouched(true);
    if (!title.trim()) return;
    const input: MemoryInput = {
      category,
      title,
      whatHappened: happened,
      myFeelings: fromDraft(feel),
      myNeeds: fromDraft(need),
      partnerFeelingsGuess: fromDraft(guess),
      background: bg,
      shareIntent: existing?.shareIntent ?? false,
      ...(activeJourney(save) ? { journeyId: activeJourney(save)!.id } : {}),
    };
    let id = memId ?? '';
    useGame.getState().update((s) => {
      const r = saveMemory(s, playerId, input, memId);
      id = r.id;
      return r.save;
    });
    useGame.getState().flush();
    navigate(`/memories/${playerId}/${id}`, { replace: true });
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
      <ScreenHeader title={existing ? m.form.editHeading : m.form.newHeading} backTo={`/memories/${playerId}`} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 font-medium">{m.form.category}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
              className={`min-h-[44px] rounded-full border-2 px-3 text-sm ${category === c ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}>
              {m.categories[c]}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 font-medium">
        {m.form.title}
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className={inputCls}
          aria-invalid={touched && !title.trim()} />
        {touched && !title.trim() && <span className="text-sm text-orange">{m.form.titleEmpty}</span>}
      </label>
      <label className="flex flex-col gap-1 font-medium">
        {m.form.happened}
        <span className="text-[13px] font-normal text-lavender">{m.form.happenedHint}</span>
        <textarea rows={5} value={happened} maxLength={500} onChange={(e) => setHappened(e.target.value)} className={`${inputCls} py-2`} />
        <span className="self-end text-[13px] text-lavender">{Array.from(happened).length}/500</span>
      </label>
      <section className="panel flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold">{m.form.myFeelings}</h2>
        <ChoiceList label={m.form.myFeelings} options={EMO_SET} maxSelect={3} draft={feel} onChange={setFeel} />
      </section>
      <section className="panel flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold">{m.form.myNeeds}</h2>
        <ChoiceList label={m.form.myNeeds} options={NEED_SET} maxSelect={2} draft={need} onChange={setNeed} />
      </section>
      <section className="panel flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-base font-semibold">{m.form.partnerGuess(other)}</h2>
          <AssumptionTag />
        </div>
        <ChoiceList label={m.form.partnerGuess(other)} options={EMO_SET} maxSelect={3} draft={guess} onChange={setGuess} />
      </section>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 font-medium">{m.form.background}</legend>
        <div className="flex flex-wrap gap-2">
          {MEMORY_BACKGROUNDS.map((b) => (
            <button key={b} type="button" aria-pressed={bg === b} onClick={() => setBg(b)}
              className={`min-h-[44px] rounded-btn border-2 px-3 text-left text-sm ${bg === b ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}>
              {BACKGROUNDS[b]?.ariaLabel ?? b}
            </button>
          ))}
        </div>
      </fieldset>
      <PixelButton className="self-start" onClick={submit}>{m.form.save}</PixelButton>
    </main>
  );
}

function labels(set: typeof EMO_SET, c: Memory['myFeelings']): string {
  const picked = set.filter((o) => c.selected.includes(o.id)).map((o) => o.text);
  return [...picked, c.freeText ? `“${c.freeText}”` : ''].filter(Boolean).join(' · ') || '—';
}

export function MemoryViewScreen() {
  const { playerId = '', memId = '' } = useParams();
  const navigate = useNavigate();
  const save = useGame((s) => s.save);
  const partners = usePartnerIds(playerId);
  const mem = save.memories[memId];
  const [beat, setBeat] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const visible = mem && (mem.ownerId === playerId || (mem.shareIntent && partners.includes(mem.ownerId)));
  const owner = mem ? save.players[mem.ownerId] : undefined;
  const isOwner = mem?.ownerId === playerId;
  const other = mem ? partnerName(save, mem.ownerId) : '';
  const journey = activeJourney(save);
  const nextText = mem ? m.view.nextText(mem.title) : '';
  const added = !!journey?.nextConversation.some((n) => n.ownerId === playerId && n.text === nextText);

  const castFor = useCallback(
    (role: CastRole): CastMember | undefined => {
      if (!mem) return undefined;
      const otherId = Object.values(save.journeys).find((j) => j.playerIds.includes(mem.ownerId))?.playerIds.find((p) => p !== mem.ownerId);
      const id = role === 'in' || role === 'A' ? mem.ownerId : otherId;
      const p = id ? save.players[id] : undefined;
      return p ? { role, appearance: p.appearance, expression: 'neutral' } : undefined;
    },
    [mem, save],
  );

  if (!visible || !mem || !owner) return <Navigate to={`/memories/${playerId}`} replace />;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <ScreenHeader title={mem.title} backTo={`/memories/${playerId}`} />
      <p className="m-0 text-[13px] text-lavender">
        {m.categories[mem.category]} · {isOwner ? m.mine : m.sharedBy(owner.nickname)}
      </p>
      <SceneCanvas env={{ ...DEFAULT_ENV, bg: mem.background }} label={m.view.sceneLabel(BACKGROUNDS[mem.background]?.ariaLabel ?? '')} castFor={castFor} className="w-full" />

      <article className="flex flex-col gap-3" data-testid="memory-beats">
        <section className="rounded-panel border-2 border-cream/60 bg-indigo p-4">
          <p className="m-0 mb-2 text-[13px] text-lavender">{m.view.told(owner.nickname)}</p>
          <p className="m-0 whitespace-pre-wrap">{mem.whatHappened || '—'}</p>
        </section>
        {beat >= 2 && (
          <section className="panel flex flex-col gap-1 italic text-lavender">
            <p className="m-0">{m.view.felt(owner.nickname)}: {labels(EMO_SET, mem.myFeelings)}</p>
            <p className="m-0">{m.view.needed(owner.nickname)}: {labels(NEED_SET, mem.myNeeds)}</p>
          </section>
        )}
        {beat >= 3 && (
          <section className="panel flex flex-col gap-2">
            <p className="m-0 text-sm" role="note">{m.view.guess(owner.nickname, other)}</p>
            <p className="m-0 italic text-lavender">{labels(EMO_SET, mem.partnerFeelingsGuess)}</p>
          </section>
        )}
        {beat >= 4 && (
          <section className="panel flex flex-col gap-1">
            <h2 className="m-0 text-base font-semibold">{m.view.reflectHeading}</h2>
            <p className="m-0">{m.view.reflect1}</p>
            <p className="m-0">{m.view.reflect2(isOwner ? other : owner.nickname)}</p>
          </section>
        )}
        {beat < 4 ? (
          <PixelButton className="self-start" onClick={() => setBeat((b) => b + 1)}>{m.view.next}</PixelButton>
        ) : (
          journey &&
          journey.playerIds.includes(playerId) && (
            <PixelButton variant="ghost" className="self-start" disabled={added}
              onClick={() => apply((s) => addNextConversation(s, journey.id, playerId, nextText, 'manual', mem.id))}>
              {added ? m.view.added : m.view.addNext}
            </PixelButton>
          )
        )}
      </article>

      {isOwner && (
        <div className="flex flex-wrap gap-2 border-t border-lavender/20 pt-4">
          <Link to={`/memories/${playerId}/${mem.id}/edit`} className="btn btn-ghost no-underline">
            <Pencil aria-hidden className="h-4 w-4" />
            {m.view.edit}
          </Link>
          {partners.length > 0 &&
            (mem.shareIntent ? (
              <PixelButton variant="ghost" onClick={() => apply((s) => setMemoryShared(s, playerId, mem.id, false))}>
                {m.view.unshare} ({m.view.shared(other)})
              </PixelButton>
            ) : (
              <PixelButton variant="ghost" icon={<Share2 aria-hidden className="h-4 w-4" />} onClick={() => setConfirmShare(true)}>
                {m.view.share(other)}
              </PixelButton>
            ))}
          <PixelButton variant="ghost" icon={<Trash2 aria-hidden className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
            {m.view.delete}
          </PixelButton>
        </div>
      )}
      <ConfirmDialog open={confirmShare} title={m.view.share(other)} body={m.view.shareWarn(other)} confirmLabel={m.view.share(other)}
        onCancel={() => setConfirmShare(false)}
        onConfirm={() => {
          apply((s) => setMemoryShared(s, playerId, mem.id, true));
          setConfirmShare(false);
        }} />
      <ConfirmDialog open={confirmDelete} title={m.view.deleteConfirm} confirmLabel={m.view.delete} destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteMemory(playerId, mem.id);
          navigate(`/memories/${playerId}`, { replace: true });
        }} />
    </main>
  );
}

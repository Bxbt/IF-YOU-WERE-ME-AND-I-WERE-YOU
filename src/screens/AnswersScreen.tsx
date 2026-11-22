import { Link, Navigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader } from '../components/Misc';
import { AssumptionTag } from '../components/Labels';
import { useGame } from '../store/game';
import { getAnswers, profileKey } from '../store/actions';
import { pendingKey, usePendingDeletes } from '../store/pendingDeletes';
import { QUESTION_BY_ID, questionText } from '../engine/personality';
import { DIMENSIONS, QUESTIONS } from '../content/th/questions';
import type { PersonalityAnswer } from '../persistence/schema';

function describe(a: PersonalityAnswer | undefined, qid: string): string {
  if (!a) return ui.quiz.notAnswered;
  if (a.status === 'skipped') return ui.quiz.skippedLabel;
  if (a.meta) return ui.quiz.meta[a.meta];
  const q = QUESTION_BY_ID[qid]!;
  const labels = a.selected.map((id) => q.options.find((o) => o.id === id)?.text).filter(Boolean);
  return [labels.join(' · '), a.freeText ? `“${a.freeText}”` : ''].filter(Boolean).join(' — ');
}

/** S4 edit mode: every answer grouped by dimension (docs/06 S4 "Edit mode"). */
export function AnswersScreen({ layer }: { layer: 'self' | 'perceived' }) {
  const { playerId = '', aboutId } = useParams();
  const owner = useGame((s) => s.save.players[playerId]);
  const about = useGame((s) => (aboutId ? s.save.players[aboutId] : undefined));
  const answers = useGame((s) => getAnswers(s.save, profileKey(playerId, layer, aboutId)));
  const pending = usePendingDeletes((s) => s.items);
  if (!owner || (layer === 'perceived' && !about)) return <Navigate to="/profile" replace />;

  const who = layer === 'self' ? `${owner.nickname} · ${ui.quiz.aboutYou}` : ui.quiz.aboutOther(about!.nickname);
  const base = layer === 'self' ? `/profile/${playerId}/self` : `/profile/${playerId}/perceived/${aboutId}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.quiz.editHeading(who)} backTo="/profile" />
      {layer === 'perceived' && <AssumptionTag />}
      {DIMENSIONS.map((d) => (
        <section key={d.id} className="panel flex flex-col gap-3" aria-labelledby={`dim-${d.id}`}>
          <h2 id={`dim-${d.id}`} className="m-0 text-lg font-semibold">{d.name}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {QUESTIONS.filter((q) => q.dimension === d.id).map((q) => {
              const isPending = !!pending[pendingKey(playerId, layer, aboutId, q.id)];
              const a = isPending ? undefined : answers[q.id];
              return (
                <li key={q.id} className="flex items-start justify-between gap-3 border-t border-lavender/20 pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{questionText(q, layer, about?.nickname)}</span>
                    <span className={`text-sm ${a ? 'text-cream' : 'text-lavender'}`}>{describe(a, q.id)}</span>
                  </div>
                  <Link
                    to={`${base}?set=full&q=${q.id}&single=1`}
                    aria-label={`แก้คำตอบ: ${questionText(q, layer, about?.nickname)}`}
                    className="btn btn-ghost shrink-0 px-3 no-underline"
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}

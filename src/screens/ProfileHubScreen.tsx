import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, Play } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { AssumptionTag } from '../components/Labels';
import { PixelButton } from '../components/PixelButton';
import { SpriteView } from '../scene/CharacterCanvas';
import { useGame } from '../store/game';
import { currentJourney, getAnswers, profileKey } from '../store/actions';
import { FULL_SET, progress } from '../engine/personality';
import type { Player } from '../persistence/schema';

function QuestionBlock({
  title,
  ownerId,
  layer,
  aboutId,
  tag,
}: {
  title: string;
  ownerId: string;
  layer: 'self' | 'perceived';
  aboutId?: string;
  tag?: boolean;
}) {
  const answers = useGame((s) => getAnswers(s.save, profileKey(ownerId, layer, aboutId)));
  const p = progress(answers, FULL_SET);
  const base = layer === 'self' ? `/profile/${ownerId}/self` : `/profile/${ownerId}/perceived/${aboutId}`;
  return (
    <div className="flex flex-col gap-2 border-t border-lavender/20 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-base font-semibold">{title}</h3>
        {tag && <AssumptionTag />}
      </div>
      <p className="m-0 text-sm text-lavender">{ui.hub.progress(p.answered, p.skipped, p.total)}</p>
      <div className="flex flex-wrap gap-2">
        <Link to={`${base}?set=quick`} className="btn btn-ghost text-sm no-underline">
          {ui.hub.quick}
        </Link>
        <Link to={`${base}?set=full`} className="btn btn-ghost text-sm no-underline">
          {ui.hub.full}
        </Link>
        <Link to={`${base}/answers`} className="btn btn-ghost text-sm no-underline">
          {ui.hub.editAnswers}
        </Link>
      </div>
    </div>
  );
}

function PlayerCard({ player, children }: { player: Player; children?: React.ReactNode }) {
  return (
    <article className="panel flex flex-col gap-3" aria-labelledby={`p-${player.id}`}>
      <div className="flex items-end gap-4">
        <SpriteView
          appearance={player.appearance}
          scale={2}
          label={ui.player.previewLabel(player.nickname)}
        />
        <div className="flex flex-1 flex-col gap-1">
          <h2 id={`p-${player.id}`} className="m-0 text-xl font-semibold">
            {player.nickname}
          </h2>
          {player.kind === 'imagined' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-lavender">{ui.hub.imagined}</span>
              <AssumptionTag kind="imagined" />
            </div>
          )}
        </div>
        <Link to={`/players/${player.id}/edit`} className="btn btn-ghost px-3 text-sm no-underline">
          <Pencil aria-hidden className="h-4 w-4" />
          {ui.hub.edit}
        </Link>
      </div>
      {children}
    </article>
  );
}

/** Profile Hub (docs/06 S3 "Profile Hub"). */
export function ProfileHubScreen() {
  const save = useGame((s) => s.save);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const journey = currentJourney(save);
  const allReal = Object.values(save.players).filter((p) => p.kind === 'real');
  // docs/06 S3 Profile Hub: the active journey's players; everyone else goes in a folded section.
  const real = journey
    ? journey.playerIds.map((id) => save.players[id]).filter((p): p is Player => p?.kind === 'real')
    : allReal;
  const shown = new Set(journey ? journey.playerIds : allReal.map((p) => p.id));
  const others = Object.values(save.players).filter((p) => !shown.has(p.id));
  const partnerOf = (id: string) =>
    journey?.playerIds.includes(id) ? save.players[journey.playerIds.find((x) => x !== id)!] : undefined;
  const imagined = journey
    ? journey.playerIds.map((id) => save.players[id]).filter((p): p is Player => p?.kind === 'imagined')
    : [];
  const self = real[0];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.hub.heading} />

      {allReal.length === 0 && (
        <EmptyState
          title={ui.hub.empty}
          body={ui.hub.emptyBody}
          action={<PixelButton onClick={() => navigate('/players/new')}>{ui.hub.create}</PixelButton>}
        />
      )}

      {params.get('created') === '1' && self && (
        <section className="panel flex flex-col gap-3 border-orange" aria-label={ui.hub.askNow}>
          <p className="m-0">{ui.hub.askNow}</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/profile/${self.id}/self?set=quick`} className="btn btn-primary no-underline">
              {ui.hub.quick}
            </Link>
            <Link to={`/profile/${self.id}/self?set=full`} className="btn btn-ghost no-underline">
              {ui.hub.full}
            </Link>
            {journey && (
              <Link to={`/j/${journey.id}/chapters`} className="btn btn-ghost no-underline">
                {ui.hub.later}
              </Link>
            )}
          </div>
        </section>
      )}

      {journey && (
        <section className="panel flex flex-col gap-2" aria-labelledby="journey-h">
          <h2 id="journey-h" className="m-0 text-lg font-semibold">
            {ui.hub.journey}
          </h2>
          <p className="m-0 text-sm text-lavender">
            {journey.playerIds.map((id) => save.players[id]?.nickname).join(' · ')}
          </p>
          <PixelButton
            icon={<Play aria-hidden className="h-5 w-5" />}
            className="self-start"
            onClick={() => navigate(`/j/${journey.id}/chapters`)}
          >
            {ui.hub.playChapters}
          </PixelButton>
        </section>
      )}

      {real.map((p) => {
        const partner = partnerOf(p.id);
        return (
          <PlayerCard key={p.id} player={p}>
            <QuestionBlock title={ui.hub.selfTitle} ownerId={p.id} layer="self" />
            {partner && (
              <QuestionBlock
                title={ui.hub.perceivedTitle(partner.nickname)}
                ownerId={p.id}
                layer="perceived"
                aboutId={partner.id}
                tag
              />
            )}
          </PlayerCard>
        );
      })}

      {imagined.map((p) => (
        <PlayerCard key={p.id} player={p} />
      ))}

      {others.length > 0 && (
        <details className="panel">
          <summary className="min-h-[44px] cursor-pointer py-2 font-semibold">
            {ui.hub.others(others.length)}
          </summary>
          <p className="m-0 mb-3 text-sm text-lavender">{ui.hub.othersNote}</p>
          <div className="flex flex-col gap-4">
            {others.map((p) => (
              <PlayerCard key={p.id} player={p}>
                {p.kind === 'real' && <QuestionBlock title={ui.hub.selfTitle} ownerId={p.id} layer="self" />}
              </PlayerCard>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

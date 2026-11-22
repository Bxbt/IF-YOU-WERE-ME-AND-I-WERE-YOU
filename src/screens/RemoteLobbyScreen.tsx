/**
 * S17 Remote Lobby — Phase 3A Sealed Exchange (docs/06 S17, docs/08 §6.1). Live play (3C) has its
 * own lobby, S19 `/live`.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Download, KeyRound, Upload } from 'lucide-react';
import { ui } from '../content/th/ui';
import { BrandArt, ScreenHeader } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlayerGate } from '../components/PlayerGate';
import { useGame } from '../store/game';
import { downloadText } from '../lib/download';
import { exportFileName } from '../persistence/exportImport';
import { formatKey } from '../engine/sealed';
import { categorize } from '../engine/compare';
import { describeAnswer } from '../engine/report';
import {
  buildInvitation,
  buildSealed,
  importSealed,
  isOwnSealed,
  joinFromInvitation,
  ownMirrorAnswers,
  parseRemoteFile,
  remotePartner,
  remoteSelf,
  revealWithKey,
  revealedMirrors,
  type InvitationData,
} from '../store/remote';
import type { GameSession } from '../persistence/schema';

const t = ui.remote;
type FileErrKey = keyof typeof t.fileErr;

function FilePick({ label, onText }: { label: string; onText: (text: string) => void }) {
  return (
    <label className="btn btn-ghost cursor-pointer self-start">
      <Upload aria-hidden className="h-5 w-5" />
      {label}
      <input
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onText(await f.text());
        }}
      />
    </label>
  );
}

function Limits() {
  return (
    <section className="flex flex-col gap-1" aria-labelledby="limits-h">
      <h3 id="limits-h" className="m-0 text-base font-semibold">
        {t.limitsHeading}
      </h3>
      <ul className="m-0 flex flex-col gap-1 pl-5 text-sm">
        {t.limits.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

function CreateTab() {
  const navigate = useNavigate();
  const hasActive = useGame((s) => Object.values(s.save.journeys).some((j) => j.status === 'active'));
  const [confirm, setConfirm] = useState(false);
  const go = () => navigate('/players/new?mode=remote');
  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold">{t.sealedTitle}</h2>
        <p className="m-0 text-sm">{t.sealedBody}</p>
        <Limits />
        <p className="m-0 text-[13px] text-lavender">{t.createHint}</p>
        <PixelButton className="self-start" onClick={() => (hasActive ? setConfirm(true) : go())}>
          {t.create}
        </PixelButton>
      </div>
      <div className="panel flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold">{t.onlineTitle}</h2>
        <p className="m-0 text-sm">{ui.live.intro}</p>
        <Link to="/live" className="btn btn-ghost self-start no-underline">
          {t.onlineGo}
        </Link>
      </div>
      <ConfirmDialog
        open={confirm}
        title={ui.player.activeExists}
        body={ui.player.activeExistsBody}
        confirmLabel={ui.player.activeExistsConfirm}
        onCancel={() => setConfirm(false)}
        onConfirm={go}
      />
    </div>
  );
}

function JoinTab() {
  const navigate = useNavigate();
  const players = useGame((s) => Object.values(s.save.players).filter((p) => p.kind === 'real'));
  const [invite, setInvite] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | undefined>(players[0]?.id);

  async function onText(text: string) {
    setError(null);
    setInvite(null);
    const r = await parseRemoteFile(text);
    if (!r.ok) return setError(t.fileErr[r.error]);
    if (r.scope !== 'invitation') return setError(t.fileErr.expectInvite);
    setInvite(r.data);
  }

  function join() {
    if (!invite || !selfId) return;
    const r = joinFromInvitation(useGame.getState().save, selfId, invite);
    if (!r.ok) return setError(r.error === 'exists' ? t.joinExists : t.joinFull);
    useGame.getState().update(() => r.save);
    useGame.getState().flush();
    navigate('/profile?created=1', { replace: true });
  }

  return (
    <div className="panel flex flex-col gap-3">
      <p className="m-0">{t.joinBody}</p>
      <Limits />
      <FilePick label={t.joinPick} onText={onText} />
      {error && (
        <p role="alert" className="m-0 text-sm text-orange">
          {error}
        </p>
      )}
      {invite && (
        <div className="flex flex-col gap-3 rounded-btn border-2 border-orange p-3" data-testid="invite-preview">
          <p className="m-0 font-semibold">{t.joinFrom(invite.inviter.nickname)}</p>
          {players.length === 0 ? (
            <>
              <p className="m-0 text-sm">{t.joinNeedSelf}</p>
              <Link to="/players/new" className="btn btn-ghost self-start no-underline">
                {t.joinCreateSelf}
              </Link>
            </>
          ) : (
            <>
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 text-sm">{t.joinAs}</legend>
                {players.map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input type="radio" name="join-self" checked={selfId === p.id} onChange={() => setSelfId(p.id)} />
                    {p.nickname}
                  </label>
                ))}
              </fieldset>
              <PixelButton className="self-start" onClick={join} disabled={!selfId}>
                {t.joinConfirm}
              </PixelButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RemoteJourneyPanel({ journey }: { journey: GameSession }) {
  const save = useGame((s) => s.save);
  const self = remoteSelf(journey);
  const partner = save.players[remotePartner(journey)];
  const partnerName = partner?.nickname ?? '';
  const iInvited = partner?.remoteUserId !== 'sealed';
  const ownCount = Object.keys(ownMirrorAnswers(journey)).length;
  const key = journey.remote?.myRevealKey;
  const [error, setError] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [partnerKey, setPartnerKey] = useState('');
  const revealed = revealedMirrors(journey);

  async function exportInvite() {
    const env = await buildInvitation(useGame.getState().save, journey.id);
    downloadText(exportFileName('invitation'), JSON.stringify(env, null, 2));
  }
  async function exportSealed() {
    setError(null);
    const r = await buildSealed(useGame.getState().save, journey.id);
    if (!r) return setError(t.noMirror);
    useGame.getState().update(() => r.save);
    useGame.getState().flush();
    downloadText(exportFileName('sealed'), JSON.stringify(r.file, null, 2));
  }
  async function onSealed(text: string) {
    setError(null);
    const r = await parseRemoteFile(text);
    if (!r.ok) return setError(t.fileErr[r.error]);
    if (r.scope !== 'sealed') return setError(t.fileErr.expectSealed);
    if (r.data.journeyId !== journey.id) return setError(t.fileErr.no_journey);
    const save = useGame.getState().save;
    if (await isOwnSealed(save, r.data)) return setError(t.fileErr.own_file);
    const res = importSealed(save, r.data);
    if (!res.ok) return setError(t.fileErr[res.error as FileErrKey]);
    useGame.getState().update(() => res.save);
    useGame.getState().flush();
  }
  async function open() {
    setError(null);
    const r = await revealWithKey(useGame.getState().save, journey.id, partnerKey);
    if (!r.ok) return setError(r.error === 'bad_key' ? t.badKey : t.invalid);
    useGame.getState().update(() => r.save);
    useGame.getState().flush();
    setPartnerKey('');
  }
  async function copy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(formatKey(key));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="panel flex flex-col gap-4" aria-labelledby={`rj-${journey.id}`} data-testid="remote-journey">
      <h2 id={`rj-${journey.id}`} className="m-0 text-lg font-semibold">
        {t.current} · {t.with(partnerName)}
      </h2>
      <PlayerGate playerId={self}>
        <div className="flex flex-col gap-4">
          {iInvited && (
            <div className="flex flex-col gap-2">
              <p className="m-0 font-semibold">{t.step1}</p>
              <PixelButton variant="ghost" className="self-start" icon={<Download aria-hidden className="h-5 w-5" />} onClick={exportInvite}>
                {t.exportInvite}
              </PixelButton>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className="m-0 font-semibold">{t.step2}</p>
            <Link to={`/j/${journey.id}/chapters`} className="btn btn-ghost self-start no-underline">
              {t.play}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="m-0 font-semibold">{t.step3}</p>
            <p className="m-0 text-sm">{ownCount > 0 ? t.sealedCount(ownCount) : t.noMirror}</p>
            {ownCount > 0 && (
              <>
                <PixelButton variant="ghost" className="self-start" icon={<Download aria-hidden className="h-5 w-5" />} onClick={exportSealed}>
                  {t.exportSealed}
                </PixelButton>
                <p className="m-0 text-[13px] text-lavender">{t.editWarn}</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="m-0 font-semibold">{t.step4}</p>
            <FilePick label={t.importSealed} onText={onSealed} />
            {journey.remote?.partnerSealed ? (
              <p className="m-0 text-sm">{t.imported}</p>
            ) : (
              key && (
                <div className="flex items-center gap-3" data-testid="remote-waiting">
                  <BrandArt src="./brand/waiting.png" size="h-20 w-20" />
                  <p className="m-0 text-sm text-lavender">{t.waiting(partnerName)}</p>
                </div>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="m-0 font-semibold">{t.step5}</p>
            {key ? (
              showKey ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-sm">{t.keyLabel}</p>
                  <code className="self-start rounded-btn bg-navy px-3 py-2 text-lg tracking-widest" data-testid="my-key">
                    {formatKey(key)}
                  </code>
                  <PixelButton variant="ghost" className="self-start text-sm" icon={<Copy aria-hidden className="h-4 w-4" />} onClick={copy}>
                    {copied ? t.copied : t.copy}
                  </PixelButton>
                </div>
              ) : (
                <PixelButton variant="ghost" className="self-start" icon={<KeyRound aria-hidden className="h-5 w-5" />} onClick={() => setConfirmKey(true)}>
                  {t.showKey}
                </PixelButton>
              )
            ) : (
              <p className="m-0 text-sm text-lavender">{t.needSealedFirst}</p>
            )}
            {journey.remote?.partnerSealed && (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void open();
                }}
              >
                <label className="flex flex-col gap-1 text-sm">
                  {t.enterKey}
                  <input
                    className="input w-72 max-w-full font-mono uppercase tracking-widest"
                    value={partnerKey}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setPartnerKey(e.target.value)}
                  />
                </label>
                <PixelButton type="submit" disabled={partnerKey.replace(/[\s-]/g, '').length !== 26}>
                  {t.open}
                </PixelButton>
              </form>
            )}
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-orange">
              {error}
            </p>
          )}
          {revealed.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-lavender/20 pt-3" aria-labelledby={`rv-${journey.id}`}>
              <h3 id={`rv-${journey.id}`} className="m-0 text-base font-semibold">
                {t.revealedHeading(partnerName)}
              </h3>
              {revealed.map(({ question, partnerSelf, myGuess, mySelf }) => {
                const cat = categorize(myGuess, partnerSelf);
                return (
                  <article key={question.id} className="flex flex-col gap-1 rounded-btn border-2 border-lavender/30 bg-navy p-3">
                    <p className="m-0 font-semibold">{question.self}</p>
                    <p className="m-0 text-sm">
                      {t.theyAnswered(partnerName)}: {describeAnswer(question, partnerSelf)}
                    </p>
                    <p className="m-0 text-sm">
                      {t.youGuessed}: {myGuess ? describeAnswer(question, myGuess) : t.noGuess}
                    </p>
                    {mySelf && (
                      <p className="m-0 text-sm text-lavender">
                        {t.youAnswered}: {describeAnswer(question, mySelf)}
                      </p>
                    )}
                    {myGuess && cat !== 'excluded' && (
                      <span className="self-start rounded-full border border-orange/60 px-2 text-[13px]">{t.match[cat]}</span>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </PlayerGate>
      <ConfirmDialog
        open={confirmKey}
        title={t.showKeyTitle}
        body={t.showKeyBody}
        confirmLabel={t.showKey}
        onCancel={() => setConfirmKey(false)}
        onConfirm={() => {
          setConfirmKey(false);
          setShowKey(true);
        }}
      />
    </section>
  );
}

export function RemoteLobbyScreen() {
  const journeys = useGame((s) => s.save.journeys);
  const remote = Object.values(journeys)
    .filter((j) => j.mode === 'remote_sealed' && j.status !== 'archived')
    .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const crypto = !!globalThis.crypto?.subtle;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={t.heading} backTo="/mode" preferHistory />
      {!crypto && (
        <p role="alert" className="m-0 text-orange">
          {t.noCrypto}
        </p>
      )}
      {crypto && remote.map((j) => <RemoteJourneyPanel key={j.id} journey={j} />)}
      {crypto && (
        <>
          <div role="tablist" aria-label={t.heading} className="flex gap-2">
            {(['create', 'join'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={tab === k}
                aria-controls={`panel-${k}`}
                className={`btn ${tab === k ? '' : 'btn-ghost'}`}
                onClick={() => setTab(k)}
              >
                {k === 'create' ? t.tabCreate : t.tabJoin}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'create' ? <CreateTab /> : <JoinTab />}
          </div>
        </>
      )}
    </main>
  );
}

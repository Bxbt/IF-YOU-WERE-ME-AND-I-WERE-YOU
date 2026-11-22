import { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { useGame } from '../store/game';
import { ui } from '../content/th/ui';
import { downloadText } from '../lib/download';

/** S18 — never deletes anything until the player explicitly chooses to (docs/06 S18). */
export function RecoveryScreen() {
  const recovery = useGame((s) => s.recovery);
  const [confirming, setConfirming] = useState(false);
  if (!recovery) return null;

  const isNewer = recovery.kind === 'newer';
  // Avoid a regex character class here: Tailwind's scanner turns it into an invalid CSS class.
  const stamp = new Date().toISOString().slice(0, 16).split(/\D/).join('');

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-8">
      <h1 className="m-0 text-2xl font-semibold">
        {isNewer ? ui.recovery.newerHeading : ui.recovery.heading}
      </h1>
      <p className="m-0">{isNewer ? ui.recovery.newerBody : ui.recovery.body}</p>
      {recovery.reason && (
        <p className="panel m-0 text-sm text-lavender">{ui.recovery.reason(recovery.reason)}</p>
      )}

      <button
        type="button"
        className="btn btn-primary self-start"
        onClick={() => downloadText(`iywm-raw-${stamp}.json`, recovery.raw)}
      >
        <Download aria-hidden className="h-5 w-5" />
        {ui.recovery.download}
      </button>

      {!confirming ? (
        <button type="button" className="btn btn-ghost self-start" onClick={() => setConfirming(true)}>
          <RotateCcw aria-hidden className="h-5 w-5" />
          {ui.recovery.startFresh}
        </button>
      ) : (
        <div className="panel flex flex-col gap-3 border-danger">
          <p className="m-0 text-sm text-orange">{ui.recovery.startFreshWarn}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => useGame.getState().startFreshFromRecovery()}
            >
              {ui.recovery.startFreshConfirm}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              {ui.cancel}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

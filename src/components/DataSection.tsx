import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useGame } from '../store/game';
import { MAX_JOURNEYS } from '../store/journeys';
import { ui } from '../content/th/ui';
import { PinGate } from './PinGate';
import { forgetPin, recordPinAttempt } from '../store/pinActions';
import { byteSize, downloadText } from '../lib/download';
import {
  IMPORT_ERROR_TEXT,
  buildFullExport,
  mergeSaves,
  exportFileName,
  parseImport,
  type ImportResult,
} from '../persistence/exportImport';

type Pending = Extract<ImportResult, { ok: true }>;

/** Data section of S10 (docs/06 S10 "ข้อมูล"). */
export function DataSection() {
  const save = useGame((s) => s.save);
  const lastSavedAt = useGame((s) => s.lastSavedAt);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmWord, setConfirmWord] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const sizeKb = (byteSize(JSON.stringify(save)) / 1024).toFixed(1);

  // Full export contains everyone's unrevealed answers, so everyone who set a PIN enters it first
  // (docs/07 §11.1, docs/08 §4.2, TC-PRIV-10). A delay, not protection — see docs/08 §4.2.
  const [pinQueue, setPinQueue] = useState<string[] | null>(null);
  const pinned = Object.values(save.players).filter((p) => p.pin);
  function startExport() {
    if (pinned.length === 0) void onExport();
    else setPinQueue(pinned.map((p) => p.id));
  }
  function nextPin() {
    setPinQueue((q) => {
      const rest = (q ?? []).slice(1);
      if (rest.length === 0) {
        void onExport();
        return null;
      }
      return rest;
    });
  }
  const gatePlayer = pinQueue?.[0] ? save.players[pinQueue[0]] : undefined;

  async function onExport() {
    try {
      const env = await buildFullExport(useGame.getState().save);
      const ok = downloadText(exportFileName('full'), JSON.stringify(env, null, 2));
      setMessage(ok ? ui.data.exportDone : ui.data.exportFailed);
    } catch {
      setMessage(ui.data.exportFailed);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await parseImport(await file.text());
    if (res.ok) {
      setPending(res);
      setMessage(null);
    } else {
      setPending(null);
      setMessage(`${ui.data.importFailed}: ${IMPORT_ERROR_TEXT[res.error]}`);
    }
  }

  function onConfirmImport() {
    if (!pending) return;
    const res = useGame.getState().replaceAll(pending.data);
    setPending(null);
    setMessage(res.ok ? ui.data.importDone : ui.data.importFailed);
  }

  /** Phase 2: keep what is on this device and add the file's data as copies (docs/07 §11.2). */
  function onMergeImport() {
    if (!pending) return;
    const merged = mergeSaves(useGame.getState().save, pending.data, MAX_JOURNEYS);
    setPending(null);
    if (!merged.ok) {
      setMessage(merged.error === 'too_many_journeys' ? ui.data.mergeTooMany : ui.data.importFailed);
      return;
    }
    const res = useGame.getState().replaceAll(merged.data);
    setMessage(res.ok ? ui.data.mergeDone(merged.renamed) : ui.data.importFailed);
  }

  function onDeleteAll() {
    useGame.getState().deleteAll();
    setConfirmWord('');
    setMessage(ui.data.deleteDone);
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="m-0 text-xl font-semibold">{ui.data.heading}</h2>

      <section className="panel text-sm text-lavender" aria-label="ที่เก็บข้อมูล">
        <p className="m-0">{ui.data.whereStored}</p>
        <p className="m-0 mt-2">{ui.data.notEncrypted}</p>
        <p className="m-0 mt-2">{ui.data.size(sizeKb)}</p>
        {lastSavedAt && (
          <p className="m-0 mt-2">{ui.data.lastSaved(new Date(lastSavedAt).toLocaleString('th-TH'))}</p>
        )}
      </section>

      {message && (
        <p role="status" className="panel m-0">
          {message}
        </p>
      )}

      <section className="panel flex flex-col gap-3" aria-labelledby="export-h">
        <h3 id="export-h" className="m-0 text-lg font-semibold">
          {ui.data.exportHeading}
        </h3>
        <p className="m-0 text-sm text-lavender">{ui.data.exportNote}</p>
        <button type="button" className="btn btn-primary self-start" onClick={startExport}>
          <Download aria-hidden className="h-5 w-5" />
          {ui.data.exportFull}
        </button>
        {pinned.length > 0 && <p className="m-0 text-[13px] text-lavender">{ui.data.exportNeedsPins}</p>}
        {gatePlayer?.pin && (
          <PinGate
            key={gatePlayer.id}
            player={{ id: gatePlayer.id, nickname: gatePlayer.nickname, pin: gatePlayer.pin }}
            onUnlock={nextPin}
            onAttempt={(r) => useGame.getState().update((s) => recordPinAttempt(s, gatePlayer.id, r))}
            onForget={() => {
              useGame.getState().update((s) => forgetPin(s, gatePlayer.id));
              nextPin();
            }}
            onCancel={() => setPinQueue(null)}
          />
        )}
      </section>

      <section className="panel flex flex-col gap-3" aria-labelledby="import-h">
        <h3 id="import-h" className="m-0 text-lg font-semibold">
          {ui.data.importHeading}
        </h3>
        <label className="btn btn-ghost cursor-pointer self-start">
          <Upload aria-hidden className="h-5 w-5" />
          {ui.data.importPick}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={onFile}
          />
        </label>
        {pending && (
          <div className="flex flex-col gap-3 rounded-btn border-2 border-orange p-3">
            <p className="m-0">{ui.data.importPreview(pending.summary.players, pending.summary.journeys)}</p>
            {pending.summary.removedOptions > 0 && (
              <p className="m-0 text-sm text-orange">
                {ui.data.importRemoved(pending.summary.removedOptions)}
              </p>
            )}
            <p className="m-0 text-sm text-orange">{ui.data.importReplaceWarn}</p>
            <p className="m-0 text-sm text-lavender">{ui.data.mergeNote}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={onMergeImport}>
                {ui.data.mergeConfirm}
              </button>
              <button type="button" className="btn btn-danger" onClick={onConfirmImport}>
                {ui.data.importConfirm}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                {ui.cancel}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel flex flex-col gap-3" aria-labelledby="delete-h">
        <h3 id="delete-h" className="m-0 text-lg font-semibold">
          {ui.data.deleteHeading}
        </h3>
        <p className="m-0 text-sm text-lavender">{ui.data.deleteWarn}</p>
        <label className="flex flex-col gap-1 text-sm">
          {ui.data.deleteTypeHint}
          <input
            type="text"
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            className="min-h-[44px] rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn btn-danger self-start"
          disabled={confirmWord.trim() !== ui.data.deleteWord}
          onClick={onDeleteAll}
        >
          <Trash2 aria-hidden className="h-5 w-5" />
          {ui.data.deleteButton}
        </button>
      </section>
    </div>
  );
}

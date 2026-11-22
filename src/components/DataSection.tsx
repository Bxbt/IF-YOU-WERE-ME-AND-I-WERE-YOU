import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useGame } from '../store/game';
import { ui } from '../content/th/ui';
import { byteSize, downloadText } from '../lib/download';
import {
  IMPORT_ERROR_TEXT,
  buildFullExport,
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
        <button type="button" className="btn btn-primary self-start" onClick={onExport}>
          <Download aria-hidden className="h-5 w-5" />
          {ui.data.exportFull}
        </button>
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
            <p className="m-0 text-sm text-orange">{ui.data.importReplaceWarn}</p>
            <div className="flex flex-wrap gap-3">
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

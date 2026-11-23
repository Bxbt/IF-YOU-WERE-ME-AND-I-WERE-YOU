import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { checkSupportKeywords } from '../lib/supportCard';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  Download,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ui } from '../content/th/ui';
import { templates } from '../content/th/templates';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { toast } from '../components/toast';
import { SpriteView } from '../scene/CharacterCanvas';
import { useGame } from '../store/game';
import { addNextConversation, apply, recordReportExport, updateNextConversation } from '../store/story';
import { compareSolo } from '../engine/compare';
import { allItems, buildReport, reportForPrint, type PrintSection, type ReportItem } from '../engine/report';
import { canvasToBlob, drawReflectionCard, MAX_ITEMS } from '../engine/reportCard';
import { createPortal } from 'react-dom';
import { downloadBlob } from '../lib/download';
import { exportFileName } from '../persistence/exportImport';
import { newJourneyId } from '../lib/ids';

const t = templates.report;
type Format = 'png' | 'pdf';

/** S9 — Reflection Report (docs/06 S9, docs/04 §8). Built live; exports only what the player selects. */
export function ReportScreen() {
  const { journeyId = '', playerId = '' } = useParams();
  const save = useGame((s) => s.save);
  const journey = save.journeys[journeyId];
  const owner = save.players[playerId];
  const sections = useMemo(
    () =>
      journey && owner ? buildReport(save, journey, playerId, compareSolo(save, journey, playerId)) : [],
    [save, journey, owner, playerId],
  );
  const items = useMemo(() => allItems(sections), [sections]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.preselect).map((i) => i.id)),
  );
  const [preview, setPreview] = useState<Format | null>(null);

  if (!journey || !owner || owner.kind !== 'real' || !journey.playerIds.includes(playerId)) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <ScreenHeader title="" />
        <EmptyState
          title={ui.report.notFound}
          action={
            <Link to="/" className="btn btn-primary no-underline">
              {ui.home}
            </Link>
          }
        />
      </main>
    );
  }
  const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const picked = items.filter((i) => selected.has(i.id));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={t.heading(owner.nickname)} backTo={`/j/${journey.id}/chapters`} />
      <section className="panel flex items-end gap-4" aria-label={t.heading(owner.nickname)}>
        <SpriteView appearance={owner.appearance} scale={3} label={ui.player.previewLabel(owner.nickname)} />
        <div className="flex flex-col gap-1">
          <p className="m-0 text-lg font-semibold">{owner.nickname}</p>
          <p className="m-0 text-sm text-lavender">{t.date(date)}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <PixelButton
          variant={selecting ? 'primary' : 'ghost'}
          icon={<CheckSquare aria-hidden className="h-5 w-5" />}
          onClick={() => setSelecting((v) => !v)}
          aria-pressed={selecting}
        >
          {selecting ? ui.report.selectDone : ui.report.select}
        </PixelButton>
        <span className="text-sm text-lavender" aria-live="polite">
          {ui.report.selected(picked.length)}
        </span>
        <Link to={`/j/${journey.id}/compare`} className="btn btn-ghost ml-auto no-underline">
          <BarChart3 aria-hidden className="h-5 w-5" />
          {ui.report.toCompare}
        </Link>
      </div>

      {sections.map((s) => (
        <section
          key={s.id}
          aria-labelledby={`rs-${s.id}`}
          className="panel flex flex-col gap-4"
          data-testid={`report-${s.id}`}
        >
          <h2 id={`rs-${s.id}`} className="m-0 text-xl font-semibold">
            {s.title}
          </h2>
          {s.note && <p className="m-0 text-sm text-lavender">{s.note}</p>}
          {s.groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 border-t border-lavender/20 pt-3">
              <h3 className="m-0 text-base font-semibold">{g.title}</h3>
              {g.items.length === 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-lavender">
                  <span>{g.emptyText}</span>
                  {g.emptyCta && (
                    <Link to={g.emptyCta.to} className="btn btn-ghost px-3 text-sm no-underline">
                      {g.emptyCta.label}
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <Item
                        item={i}
                        selecting={selecting}
                        checked={selected.has(i.id)}
                        onToggle={() => toggle(i.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {s.id === 'next' && <NextChecklist journeyId={journey.id} ownerId={playerId} />}
        </section>
      ))}

      <section aria-labelledby="export-h" className="panel flex flex-col gap-3">
        <h2 id="export-h" className="m-0 text-lg font-semibold">
          {ui.report.exportHeading}
        </h2>
        <p className="m-0 text-sm text-lavender">{ui.report.exportNote}</p>
        <div className="flex flex-wrap gap-2">
          <PixelButton
            variant="ghost"
            icon={<ImageIcon aria-hidden className="h-5 w-5" />}
            disabled={picked.length === 0}
            aria-describedby={picked.length === 0 ? 'export-need' : undefined}
            onClick={() => setPreview('png')}
          >
            {ui.report.png}
          </PixelButton>
          <PixelButton
            variant="ghost"
            icon={<FileText aria-hidden className="h-5 w-5" />}
            disabled={picked.length === 0}
            aria-describedby={picked.length === 0 ? 'export-need' : undefined}
            onClick={() => setPreview('pdf')}
          >
            {ui.report.pdf}
          </PixelButton>
        </div>
        {picked.length === 0 && (
          <p id="export-need" className="m-0 text-[13px] text-lavender">
            {ui.report.needPick}
          </p>
        )}
      </section>

      {preview && (
        <ExportPreview
          format={preview}
          onClose={() => setPreview(null)}
          onSwitch={setPreview}
          make={() => reportForPrint(sections, selected)}
          title={t.heading(owner.nickname)}
          pngItems={picked}
          name={owner.nickname}
          date={date}
          onDone={(format) =>
            apply((s) =>
              recordReportExport(
                s,
                journey.id,
                playerId,
                `rp_${newJourneyId().slice(3)}`,
                [...selected],
                format,
              ),
            )
          }
        />
      )}
    </main>
  );
}

function Item({
  item,
  selecting,
  checked,
  onToggle,
}: {
  item: ReportItem;
  selecting: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const label = (
    <span className="flex flex-col gap-0.5">
      <span className="self-start rounded-full border border-lavender/50 px-2 text-[13px] text-lavender">
        {t.source[item.source]}
      </span>
      <span>{item.text}</span>
    </span>
  );
  if (!selecting) return <div className="rounded-btn bg-navy p-3">{label}</div>;
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-btn border-2 bg-navy p-3 ${checked ? 'border-orange' : 'border-lavender/30'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-5 w-5 accent-[rgb(var(--c-orange))]"
      />
      {label}
    </label>
  );
}

function NextChecklist({ journeyId, ownerId }: { journeyId: string; ownerId: string }) {
  const all = useGame((s) => s.save.journeys[journeyId]?.nextConversation);
  // Select the stored array (stable) and filter here — a new array from the selector would loop forever.
  const list = useMemo(() => (all ?? []).filter((n) => n.ownerId === ownerId), [all, ownerId]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const addId = useId();
  return (
    <div className="flex flex-col gap-2 border-t border-lavender/20 pt-3">
      <h3 className="m-0 text-base font-semibold">{ui.report.nextList}</h3>
      {list.length === 0 && <p className="m-0 text-sm text-lavender">{ui.report.nextEmpty}</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {list.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center gap-2 rounded-btn bg-navy p-2">
            {editing === n.id ? (
              <>
                <label className="sr-only" htmlFor={`e-${n.id}`}>
                  {ui.report.nextEdit}
                </label>
                <input
                  id={`e-${n.id}`}
                  value={editText}
                  maxLength={200}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[44px] min-w-0 flex-1 basis-40 rounded-btn border-2 border-lavender/40 bg-navy px-2 text-cream"
                />
                <PixelButton
                  className="text-sm"
                  onClick={() => {
                    apply((s) => updateNextConversation(s, journeyId, n.id, { text: editText }));
                    setEditing(null);
                  }}
                >
                  {ui.report.nextSave}
                </PixelButton>
                <button
                  type="button"
                  aria-label={ui.cancel}
                  className="btn btn-ghost min-w-[44px] px-2"
                  onClick={() => setEditing(null)}
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() =>
                      apply((s) => updateNextConversation(s, journeyId, n.id, { done: !n.done }))
                    }
                    className="h-5 w-5 accent-[rgb(var(--c-orange))]"
                  />
                  <span className={n.done ? 'text-lavender line-through' : ''}>{n.text}</span>
                  <span className="sr-only">{n.done ? ui.report.nextDone : ''}</span>
                </label>
                <button
                  type="button"
                  aria-label={`${ui.report.nextEdit}: ${n.text}`}
                  className="btn btn-ghost min-w-[44px] px-2"
                  onClick={() => {
                    setEditing(n.id);
                    setEditText(n.text);
                  }}
                >
                  <Pencil aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${ui.report.nextDelete}: ${n.text}`}
                  className="btn btn-ghost min-w-[44px] px-2"
                  onClick={() => apply((s) => updateNextConversation(s, journeyId, n.id, 'delete'))}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          checkSupportKeywords(text);
          apply((s) => addNextConversation(s, journeyId, ownerId, text, 'manual'));
          setText('');
        }}
      >
        <label htmlFor={addId} className="sr-only">
          {ui.report.nextAdd}
        </label>
        <input
          id={addId}
          value={text}
          maxLength={200}
          placeholder={ui.report.nextAdd}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[44px] min-w-0 flex-1 basis-40 rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream placeholder:text-lavender/70"
        />
        <PixelButton type="submit" disabled={!text.trim()} icon={<Plus aria-hidden className="h-4 w-4" />}>
          {ui.report.nextAddButton}
        </PixelButton>
      </form>
    </div>
  );
}

function ExportPreview(p: {
  format: Format;
  onClose: () => void;
  onSwitch: (f: Format) => void;
  make: () => PrintSection[];
  title: string;
  pngItems: ReportItem[];
  name: string;
  date: string;
  onDone: (f: Format) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [doc] = useState(() => (p.format === 'pdf' ? p.make() : []));
  const [png, setPng] = useState<{ url: string; blob: Blob } | null>(null);
  const [pngError, setPngError] = useState(false);
  // Captured once: the preview shows exactly what will be downloaded.
  const [card] = useState(() => ({ items: p.pngItems, name: p.name, date: p.date }));
  const onClose = useRef(p.onClose);
  onClose.current = p.onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (p.format !== 'png') return;
    let url = '';
    const cv = document.createElement('canvas');
    drawReflectionCard(cv, card.name, card.date, card.items)
      .then(() => canvasToBlob(cv))
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setPng({ url, blob });
      })
      .catch(() => {
        setPngError(true);
        toast(ui.report.pngFailed, 'error');
      });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [p.format, card]);

  function download() {
    if (p.format === 'pdf') {
      // The browser's own print dialog saves the print-only document below as a PDF (docs/07 §11.3).
      window.print();
      p.onDone('pdf');
      return;
    }
    const ok = !!png && downloadBlob(exportFileName('report', new Date(), 'png'), png.blob);
    toast(ok ? ui.report.downloaded : ui.report.downloadFailed, ok ? 'success' : 'error');
    if (ok) {
      p.onDone(p.format);
      p.onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel flex max-h-[90vh] w-full max-w-2xl flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="m-0 text-lg font-semibold">
            {ui.report.preview} · {ui.report[p.format]}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={ui.close}
            onClick={p.onClose}
            className="btn btn-ghost min-w-[44px] px-2"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-btn bg-navy p-3">
          {p.format === 'png' ? (
            pngError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="m-0">{ui.report.pngFailed}</p>
                <PixelButton onClick={() => p.onSwitch('pdf')}>{ui.report.usePdf}</PixelButton>
              </div>
            ) : png ? (
              <img
                src={png.url}
                alt={ui.report.cardAlt}
                className="mx-auto w-full max-w-sm"
                data-testid="png-preview"
              />
            ) : (
              <p role="status" className="m-0 text-lavender">
                {ui.report.making}
              </p>
            )
          ) : (
            <div data-testid="text-preview">
              <PrintDoc title={p.title} date={p.date} sections={doc} />
            </div>
          )}
        </div>
        {p.format === 'png' && (
          <p className="m-0 text-[13px] text-lavender">
            {ui.report.pngLimit.replace('5', String(MAX_ITEMS))}
          </p>
        )}
        {p.format === 'pdf' && <p className="m-0 text-[13px] text-lavender">{ui.report.pdfHint}</p>}
        <PixelButton
          onClick={download}
          disabled={p.format === 'png' && !png}
          icon={<Download aria-hidden className="h-5 w-5" />}
          className="self-end"
        >
          {p.format === 'pdf' ? ui.report.savePdf : ui.report.download}
        </PixelButton>
      </div>
      {/* Only this is printed (styles/index.css @media print). */}
      {p.format === 'pdf' &&
        createPortal(
          <div id="print-root" aria-hidden>
            <PrintDoc title={p.title} date={p.date} sections={doc} />
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The PDF summary: title, date, sections with source-labelled items, footer (docs/07 §11.3). */
function PrintDoc({ title, date, sections }: { title: string; date: string; sections: PrintSection[] }) {
  return (
    <article className="print-doc flex flex-col gap-3 text-sm">
      <header>
        <h3 className="m-0 text-base font-semibold">{title}</h3>
        <p className="m-0 text-lavender">{t.date(date)}</p>
      </header>
      {sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h4 className="m-0 font-semibold">{s.title}</h4>
          {s.groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-1">
              <h5 className="m-0 text-[13px] font-medium text-lavender">{g.title}</h5>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {g.items.map((i, k) => (
                  <li key={k}>
                    <span className="font-medium">[{i.label}]</span> {i.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <footer className="text-[13px] text-lavender">{t.fileFooter(date)}</footer>
    </article>
  );
}

import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { MetaValue, OptionContent } from '../content/types';
import { isOptionDisabled, selectMeta, toggleOption, type AnswerDraft } from '../engine/answers';
import { ui } from '../content/th/ui';
import { useReducedMotion } from '../lib/motion';

interface ChoiceListProps {
  label: string;
  options: OptionContent[];
  maxSelect: number;
  draft: AnswerDraft;
  onChange: (d: AnswerDraft) => void;
}

/** ChoiceList — multi/single select following docs/04 §3.2 (AX-10: role=group + aria-pressed). */
export function ChoiceList({ label, options, maxSelect, draft, onChange }: ChoiceListProps) {
  const reduced = useReducedMotion();
  const hintId = useId();
  const atMax = draft.selected.length >= maxSelect;
  return (
    <div>
      {/* Always shown, right under the question (docs/04 §3.2). */}
      <p id={hintId} className={`m-0 mb-2 text-[13px] ${atMax ? 'text-orange' : 'text-lavender'}`}>
        {maxSelect > 1 ? ui.answer.maxReached(maxSelect) : ui.answer.pickOne}
      </p>
      <div role="group" aria-label={label} aria-describedby={hintId} className="flex flex-col gap-2">
        {options.map((o, i) => {
          const selected = draft.selected.includes(o.id);
          const disabled = isOptionDisabled(draft, o, maxSelect);
          return (
            <motion.button
              key={o.id}
              type="button"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.2 }}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(toggleOption(draft, o, options, maxSelect))}
              className={`btn w-full justify-start text-left ${selected ? 'border-orange bg-orange/15' : 'bg-navy'}`}
            >
              <span
                aria-hidden
                className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-lavender"
              >
                {selected && <Check className="h-4 w-4 text-orange" />}
              </span>
              {o.text}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const METAS: MetaValue[] = ['depends', 'not_sure', 'prefer_not', 'skipped'];

/** MetaOptions — exclusive with normal options (docs/03 §0.2). */
export function MetaOptions({ draft, onChange }: { draft: AnswerDraft; onChange: (d: AnswerDraft) => void }) {
  return (
    <div role="group" aria-label="ตัวเลือกอื่น" className="flex flex-wrap gap-2">
      {METAS.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={draft.meta === m}
          onClick={() => onChange(selectMeta(draft, m))}
          className={`min-h-[44px] rounded-btn border-2 px-3 text-sm ${
            draft.meta === m ? 'border-orange text-cream' : 'border-lavender/40 text-lavender'
          }`}
        >
          {ui.answer.meta[m]}
        </button>
      ))}
    </div>
  );
}

const MAX_FREE = 280;

/** FreeTextField — collapsed behind "เพิ่มคำอธิบาย" by default; hidden when the answer is skipped. */
export function FreeTextField({
  draft,
  onChange,
  max = MAX_FREE,
  startOpen = false,
}: {
  draft: AnswerDraft;
  onChange: (d: AnswerDraft) => void;
  max?: number;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen || draft.freeText.length > 0);
  const id = useId();
  if (draft.meta === 'skipped') return null;
  if (!open) {
    return (
      <button type="button" className="text-sm text-lavender underline" onClick={() => setOpen(true)}>
        {ui.answer.freeTextToggle}
      </button>
    );
  }
  const n = Array.from(draft.freeText).length;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {ui.answer.freeTextToggle}
      </label>
      <textarea
        id={id}
        rows={3}
        value={draft.freeText}
        maxLength={max}
        placeholder={ui.answer.freeTextPlaceholder}
        onChange={(e) => onChange({ ...draft, freeText: e.target.value })}
        className="w-full rounded-btn border-2 border-lavender/40 bg-navy p-3 text-cream placeholder:text-lavender/70"
      />
      <span
        className={`self-end text-[13px] ${n >= max - 20 ? 'text-orange' : 'text-lavender'}`}
        aria-live="polite"
      >
        {ui.answer.counter(n, max)}
      </span>
    </div>
  );
}

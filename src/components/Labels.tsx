import { Cloud, Eye, Hourglass, Lock, MessageCircleQuestion, CheckCircle2 } from 'lucide-react';
import { ui } from '../content/th/ui';

/** AssumptionTag — marks perceived / imagined data (docs/01 P2). */
export function AssumptionTag({ kind = 'assumption' }: { kind?: 'assumption' | 'imagined' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-lavender/50 px-2 py-0.5 text-[13px] text-lavender">
      <MessageCircleQuestion aria-hidden className="h-4 w-4" />
      {kind === 'imagined' ? ui.labels.imagined : ui.labels.assumption}
    </span>
  );
}

export type PrivacyState = 'private' | 'waiting' | 'consented' | 'revealed';

export function PrivacyBadge({ state, otherName = '' }: { state: PrivacyState; otherName?: string }) {
  const map = {
    private: { Icon: Lock, text: ui.labels.private },
    waiting: { Icon: Hourglass, text: ui.labels.waiting(otherName) },
    consented: { Icon: CheckCircle2, text: ui.labels.consented },
    revealed: { Icon: Eye, text: ui.labels.revealed },
  } as const;
  const { Icon, text } = map[state];
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-lavender">
      <Icon aria-hidden className="h-4 w-4" />
      {text}
    </span>
  );
}

/** PerspectiveBanner — who the player is controlling; imagined variant per docs/02 §0.6. */
export function PerspectiveBanner({
  name,
  variant,
  text,
}: {
  name: string;
  variant: 'own' | 'partner' | 'partner-imagined';
  /** Together: whose turn it is ("ตาของ …" / "… กำลังเล่นเป็น …"). */
  text?: string;
}) {
  return (
    <div role="note" className="flex items-start gap-2 rounded-btn bg-indigo/90 px-3 py-2 text-sm">
      {variant === 'partner-imagined' ? (
        <>
          <Cloud aria-hidden className="mt-1 h-4 w-4 shrink-0 text-lavender" />
          <span>{ui.labels.imaginedBanner(name)}</span>
        </>
      ) : (
        <span>{text ?? ui.labels.playingAs(name)}</span>
      )}
    </div>
  );
}

/** ProgressDots — position only, never a score (docs/06 §2). */
export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div role="img" aria-label={ui.labels.progress(current, total)} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 ${i + 1 === current ? 'bg-orange' : i + 1 < current ? 'bg-lavender' : 'bg-lavender/30'}`}
        />
      ))}
    </div>
  );
}

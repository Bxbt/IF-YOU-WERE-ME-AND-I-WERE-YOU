import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ui } from '../content/th/ui';
import { AvatarPicker } from './AvatarPicker';
import { PixelButton } from './PixelButton';
import { AssumptionTag } from './Labels';
import { PortraitView, SpriteView } from '../scene/CharacterCanvas';
import { PRESETS } from '../scene/draw/character';
import type { PlayerInput } from '../store/actions';

type PresetKey = keyof typeof PRESETS;

/**
 * Random starting preset (docs/06 S3). A fixed A=p1 / B=p2 pairing would imply the first and
 * second person must look a certain way, so every create form starts from a random preset and
 * the partner never gets the same one as `avoid`.
 */
export function randomPreset(avoid?: PresetKey, rnd: () => number = Math.random): PresetKey {
  const keys = (Object.keys(PRESETS) as PresetKey[]).filter((k) => k !== avoid);
  return keys[Math.floor(rnd() * keys.length)] ?? keys[0]!;
}

export const emptyPlayerInput = (preset: PresetKey = randomPreset()): PlayerInput => ({
  nickname: '',
  sentenceEnding: '',
  addressStyle: 'เธอ',
  appearance: { ...PRESETS[preset] },
});

function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-btn border-2 px-4 ${value === o.value ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const inputCls = 'min-h-[44px] w-full rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream';

/** S3 form (docs/06 S3). Validates the nickname; everything else is optional. */
export function PlayerForm({
  heading,
  initial,
  imagined = false,
  submitLabel,
  otherNickname,
  onSubmit,
  footer,
}: {
  heading: string;
  initial: PlayerInput;
  imagined?: boolean;
  submitLabel: string;
  otherNickname?: string;
  onSubmit: (v: PlayerInput) => void;
  footer?: ReactNode;
}) {
  const [v, setV] = useState<PlayerInput>(initial);
  const [touched, setTouched] = useState(false);
  const nameId = useId();
  const errId = useId();
  const nameEmpty = v.nickname.trim().length === 0;
  const sameName = !!otherNickname && v.nickname.trim() === otherNickname.trim() && !nameEmpty;
  const customId = useId();
  const customEmpty = v.addressStyle === 'custom' && !v.addressCustom?.trim();

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameEmpty) {
      document.getElementById(nameId)?.focus();
      return;
    }
    if (customEmpty) {
      document.getElementById(customId)?.focus();
      return;
    }
    onSubmit(v);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-2 lg:col-span-2">
        <h1 className="m-0 text-2xl font-semibold">{heading}</h1>
        {imagined && (
          <div className="flex flex-wrap items-center gap-2">
            <AssumptionTag kind="imagined" />
            <p className="m-0 text-[13px] text-lavender">{ui.player.imaginedNote}</p>
          </div>
        )}
      </div>
      {/* Preview stays visible while picking appearance on every screen size. */}
      <div className="sticky top-0 z-10 -mx-4 flex justify-center bg-navy/95 px-4 py-2 lg:top-6 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0">
        <div className="panel flex items-end gap-4 py-2">
          <SpriteView appearance={v.appearance} scale={3} label={ui.player.previewLabel(v.nickname)} />
          <PortraitView appearance={v.appearance} scale={2} label="" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="panel flex flex-col gap-4" aria-labelledby={`${nameId}-h`}>
          <h2 id={`${nameId}-h`} className="m-0 text-lg font-semibold">
            {ui.player.identity}
          </h2>
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-sm font-medium">
              {ui.player.nickname} <span className="text-lavender">({ui.player.nicknameHint})</span>
            </label>
            <input
              id={nameId}
              value={v.nickname}
              maxLength={20}
              autoComplete="off"
              aria-invalid={touched && nameEmpty}
              aria-describedby={touched && nameEmpty ? errId : undefined}
              onChange={(e) => setV({ ...v, nickname: e.target.value })}
              onBlur={() => setTouched(true)}
              className={inputCls}
            />
            {touched && nameEmpty && (
              <p id={errId} className="m-0 text-sm text-orange">
                {ui.player.nicknameEmpty}
              </p>
            )}
            {sameName && <p className="m-0 text-sm text-lavender">{ui.player.sameNameWarn}</p>}
          </div>
          <Segmented
            legend={ui.player.sentenceEnding}
            value={v.sentenceEnding}
            options={ui.player.endings}
            onChange={(x) => setV({ ...v, sentenceEnding: x })}
          />
          <Segmented
            legend={ui.player.addressStyle}
            value={v.addressStyle}
            options={ui.player.addressStyles}
            onChange={(x) => setV({ ...v, addressStyle: x })}
          />
          {v.addressStyle === 'custom' && (
            <div className="flex flex-col gap-1">
              <label htmlFor={customId} className="text-sm font-medium">
                {ui.player.addressCustom}
              </label>
              <input
                id={customId}
                value={v.addressCustom ?? ''}
                maxLength={12}
                aria-invalid={touched && customEmpty}
                aria-describedby={touched && customEmpty ? `${customId}-err` : undefined}
                onChange={(e) => setV({ ...v, addressCustom: e.target.value })}
                className={inputCls}
              />
              {touched && customEmpty && (
                <p id={`${customId}-err`} className="m-0 text-sm text-orange">
                  {ui.player.addressCustomEmpty}
                </p>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            {ui.player.pronouns}
            <input
              value={v.pronouns ?? ''}
              maxLength={20}
              onChange={(e) => setV({ ...v, pronouns: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {ui.player.bio}
            <textarea
              rows={2}
              value={v.bio ?? ''}
              maxLength={140}
              onChange={(e) => setV({ ...v, bio: e.target.value })}
              className={`${inputCls} py-2`}
            />
          </label>
        </section>

        <section className="panel flex flex-col gap-4" aria-labelledby={`${nameId}-a`}>
          <h2 id={`${nameId}-a`} className="m-0 text-lg font-semibold">
            {ui.player.appearance}
          </h2>
          <p className="m-0 text-[13px] text-lavender">{ui.player.appearanceNote}</p>
          <AvatarPicker value={v.appearance} onChange={(appearance) => setV({ ...v, appearance })} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <PixelButton type="submit">{submitLabel}</PixelButton>
          {footer}
        </div>
      </div>
    </form>
  );
}

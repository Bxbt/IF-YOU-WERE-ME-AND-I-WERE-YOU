import { Check, Dices } from 'lucide-react';
import { ui } from '../content/th/ui';
import {
  FACIAL_HAIR,
  FACIAL_HAIR_NAMES,
  HAIR,
  HAIR_STYLE_NAMES,
  LEGS_NAMES,
  OUTFIT,
  OUTFIT_NAMES,
  PRESETS,
  SKIN,
  type Appearance,
} from '../scene/draw/character';
import { SpriteView } from '../scene/CharacterCanvas';

function Swatches({
  legend,
  colors,
  value,
  onChange,
}: {
  legend: string;
  colors: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={ui.player.color(i + 1)}
            aria-pressed={value === i}
            onClick={() => onChange(i)}
            className={`flex h-11 w-11 items-center justify-center rounded-btn border-2 ${value === i ? 'border-orange' : 'border-lavender/30'}`}
            style={{ background: c }}
          >
            {value === i && <Check aria-hidden className="h-5 w-5 text-navy drop-shadow" />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Options({
  legend,
  labels,
  value,
  onChange,
}: {
  legend: string;
  labels: readonly string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === i}
            onClick={() => onChange(i)}
            className={`min-h-[44px] rounded-btn border-2 px-3 text-sm ${value === i ? 'border-orange bg-orange/15' : 'border-lavender/40'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const pick = <T,>(xs: readonly T[], rnd: () => number): T => xs[Math.floor(rnd() * xs.length)]!;

/** "สุ่มรูปลักษณ์" (docs/06 S3): every layer at random within its range; the preset key is kept. */
export function randomAppearance(base: Appearance, rnd: () => number = Math.random): Appearance {
  const idx = (n: number) => Math.floor(rnd() * n);
  return {
    preset: base.preset,
    skin: idx(SKIN.length) as Appearance['skin'],
    hairStyle: idx(HAIR_STYLE_NAMES.length) as Appearance['hairStyle'],
    hairColor: idx(HAIR.length) as Appearance['hairColor'],
    outfit: idx(OUTFIT_NAMES.length) as Appearance['outfit'],
    outfitColor: idx(OUTFIT.length) as Appearance['outfitColor'],
    accessory: rnd() < 0.3 ? 'glasses' : 'none',
    legs: rnd() < 0.3 ? 'short' : 'long',
    facialHair: rnd() < 0.6 ? 'none' : pick(FACIAL_HAIR.slice(1), rnd),
  };
}

/** AvatarPicker — presets + per-layer tweaks (docs/06 S3, MVP ranges per docs/07 §3). */
export function AvatarPicker({ value, onChange }: { value: Appearance; onChange: (a: Appearance) => void }) {
  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => onChange(randomAppearance(value))}
        className="btn btn-ghost self-start px-3 text-sm"
      >
        <Dices aria-hidden className="h-5 w-5" />
        {ui.player.randomize}
      </button>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">{ui.player.preset}</legend>
        <div className="flex flex-wrap gap-3">
          {Object.values(PRESETS).map((p) => (
            <button
              key={p.preset}
              type="button"
              aria-label={`${ui.player.preset} ${p.preset.slice(1)}`}
              aria-pressed={value.preset === p.preset}
              onClick={() => onChange({ ...p })}
              className={`rounded-btn border-2 p-1 ${value.preset === p.preset ? 'border-orange' : 'border-lavender/30'}`}
            >
              <SpriteView appearance={p} scale={2} label="" />
            </button>
          ))}
        </div>
      </fieldset>
      <Swatches
        legend={ui.player.skin}
        colors={SKIN}
        value={value.skin}
        onChange={(i) => set('skin', i as Appearance['skin'])}
      />
      <Options
        legend={ui.player.hairStyle}
        labels={HAIR_STYLE_NAMES}
        value={value.hairStyle}
        onChange={(i) => set('hairStyle', i as Appearance['hairStyle'])}
      />
      <Swatches
        legend={ui.player.hairColor}
        colors={HAIR}
        value={value.hairColor}
        onChange={(i) => set('hairColor', i as Appearance['hairColor'])}
      />
      <Options
        legend={ui.player.outfit}
        labels={OUTFIT_NAMES}
        value={value.outfit}
        onChange={(i) => set('outfit', i as Appearance['outfit'])}
      />
      <Swatches
        legend={ui.player.outfitColor}
        colors={OUTFIT}
        value={value.outfitColor}
        onChange={(i) => set('outfitColor', i as Appearance['outfitColor'])}
      />
      <Options
        legend={ui.player.legs}
        labels={LEGS_NAMES}
        value={value.legs === 'short' ? 1 : 0}
        onChange={(i) => set('legs', i === 1 ? 'short' : 'long')}
      />
      <Options
        legend={ui.player.facialHair}
        labels={FACIAL_HAIR_NAMES}
        value={Math.max(0, FACIAL_HAIR.indexOf(value.facialHair ?? 'none'))}
        onChange={(i) => set('facialHair', FACIAL_HAIR[i]!)}
      />
      <Options
        legend={ui.player.glasses}
        labels={[ui.player.glassesOff, ui.player.glassesOn]}
        value={value.accessory === 'glasses' ? 1 : 0}
        onChange={(i) => set('accessory', i === 1 ? 'glasses' : 'none')}
      />
    </div>
  );
}

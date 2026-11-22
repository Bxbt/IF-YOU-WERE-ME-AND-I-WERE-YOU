import { Link, useLocation } from 'react-router-dom';
import { ui } from '../content/th/ui';
import { ScreenHeader } from '../components/Misc';
import { DataSection } from '../components/DataSection';
import { useGame } from '../store/game';
import { FEATURES } from '../lib/features';
import { isSoundSupported } from '../audio/engine';
import { toggleSound } from '../audio/useSound';
import type { Settings } from '../persistence/schema';
import { APP_VERSION } from '../persistence/exportImport';
import { SCHEMA_VERSION } from '../persistence/schema';

function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  useGame.getState().update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
}

function Segmented<T extends string | number>({
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
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
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

/** S10 — docs/06 S10. Sound and PIN rows arrive with their phases. */
export function SettingsScreen() {
  const settings = useGame((s) => s.save.settings);
  const back = (useLocation().state as { from?: string } | null)?.from ?? '/';

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <ScreenHeader title={ui.settings.heading} backTo={back} />

      <section className="panel flex flex-col gap-6" aria-labelledby="display-h">
        <h2 id="display-h" className="m-0 text-xl font-semibold">
          {ui.settings.display}
        </h2>
        <Segmented
          legend={ui.settings.fontScale}
          value={settings.fontScale}
          options={ui.settings.fontScaleOptions}
          onChange={(v) => setSetting('fontScale', v)}
        />
        <Segmented
          legend={ui.settings.textSpeed}
          value={settings.textSpeed}
          options={ui.settings.textSpeedOptions}
          onChange={(v) => setSetting('textSpeed', v)}
        />
        <Segmented
          legend={ui.settings.reducedMotion}
          value={settings.reducedMotion}
          options={ui.settings.reducedMotionOptions}
          onChange={(v) => setSetting('reducedMotion', v)}
        />
      </section>

      {FEATURES.sound && (
        <section className="panel flex flex-col gap-4" aria-labelledby="sound-h">
          <h2 id="sound-h" className="m-0 text-xl font-semibold">
            {ui.settings.sound}
          </h2>
          {!isSoundSupported() ? (
            <p className="m-0 text-sm text-lavender">{ui.settings.soundUnsupported}</p>
          ) : (
            <>
              <Segmented
                legend={ui.settings.soundToggle}
                value={settings.sound.enabled ? 'on' : 'off'}
                options={ui.settings.soundOptions}
                onChange={(v) => toggleSound(v === 'on')}
              />
              <label className="flex flex-col gap-2">
                <span className="font-medium">{ui.settings.volume}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(settings.sound.volume * 100)}
                  disabled={!settings.sound.enabled}
                  aria-valuetext={`${Math.round(settings.sound.volume * 100)}%`}
                  onChange={(e) =>
                    useGame.getState().update((s) => ({
                      ...s,
                      settings: { ...s.settings, sound: { ...s.settings.sound, volume: Number(e.target.value) / 100 } },
                    }))
                  }
                  className="h-11 w-full max-w-sm accent-[rgb(var(--c-orange))] disabled:opacity-45"
                />
              </label>
              <p className="m-0 text-[13px] text-lavender">{ui.settings.soundNote}</p>
            </>
          )}
        </section>
      )}

      <DataSection />

      <section className="panel flex flex-col gap-2 text-sm text-lavender" aria-labelledby="about-h">
        <h2 id="about-h" className="m-0 text-xl font-semibold text-cream">
          {ui.settings.about}
        </h2>
        <p className="m-0">
          {ui.version(APP_VERSION)} · {ui.settings.schema(SCHEMA_VERSION)}
        </p>
        <Link to="/about" className="text-lavender underline">
          {ui.title.about}
        </Link>
      </section>
    </main>
  );
}

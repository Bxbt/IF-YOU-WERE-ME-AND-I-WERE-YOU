import { useCallback } from 'react';
import { ScreenHeader } from '../components/Misc';
import { PixelCanvas } from '../scene/PixelCanvas';
import { PortraitView, SpriteView } from '../scene/CharacterCanvas';
import { drawElevatorBase, drawElevatorLight } from '../scene/draw/elevator';
import { PRESETS, drawSprite, type Expression } from '../scene/draw/character';
import { ui } from '../content/th/ui';

const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'sad', 'worried', 'relieved'];

/**
 * Art prototype for owner review (docs/09 §1.2, audit H-5): one scene + characters.
 * Not linked from the menus; open via #/art-preview.
 */
export function ArtPreviewScreen() {
  const draw = useCallback((c: CanvasRenderingContext2D, t: number) => {
    drawElevatorBase(c);
    drawSprite(c, PRESETS.p3, 144, 92, Math.floor(t * 2) % 2, 'worried');
    drawElevatorLight(c, t, 1);
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.artPreview.heading} />
      <p className="m-0 text-sm text-lavender">{ui.artPreview.note}</p>
      <section aria-labelledby="scene-h" className="flex flex-col gap-2">
        <h2 id="scene-h" className="m-0 text-lg font-semibold">bg_elevator_emergency</h2>
        <PixelCanvas draw={draw} label={ui.artPreview.sceneLabel} className="w-full" />
      </section>
      <section aria-labelledby="chars-h" className="flex flex-col gap-3">
        <h2 id="chars-h" className="m-0 text-lg font-semibold">{ui.artPreview.presets}</h2>
        <div className="flex flex-wrap gap-6">
          {Object.values(PRESETS).map((p) => (
            <SpriteView key={p.preset} appearance={p} scale={4} label={`preset ${p.preset}`} />
          ))}
        </div>
      </section>
      <section aria-labelledby="faces-h" className="flex flex-col gap-3">
        <h2 id="faces-h" className="m-0 text-lg font-semibold">{ui.artPreview.portraits}</h2>
        {Object.values(PRESETS).map((p) => (
          <div key={p.preset} className="flex flex-wrap gap-3">
            {EXPRESSIONS.map((e) => (
              <figure key={e} className="m-0 flex flex-col items-center gap-1">
                <PortraitView appearance={p} expression={e} scale={2} label={`${p.preset} ${e}`} />
                <figcaption className="text-[13px] text-lavender">{e}</figcaption>
              </figure>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}

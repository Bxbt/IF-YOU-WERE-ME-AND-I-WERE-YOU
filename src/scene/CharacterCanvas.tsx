import { useCallback } from 'react';
import { PixelCanvasCustom } from './PixelCanvasCustom';
import { drawPortrait, drawSprite, type Appearance } from './draw/character';

/** Animated idle sprite (32×48) at an integer scale. */
export function SpriteView({
  appearance,
  scale = 4,
  label,
  expression = 'neutral',
}: {
  appearance: Appearance;
  scale?: number;
  label: string;
  expression?: Parameters<typeof drawSprite>[5];
}) {
  const draw = useCallback(
    (c: CanvasRenderingContext2D, t: number) => {
      c.clearRect(0, 0, 32, 48);
      drawSprite(c, appearance, 0, 0, Math.floor(t * 2) % 2, expression);
    },
    [appearance, expression],
  );
  return <PixelCanvasCustom width={32} height={48} scale={scale} draw={draw} label={label} fps={4} />;
}

export function PortraitView({
  appearance,
  expression = 'neutral',
  scale = 2,
  label,
}: {
  appearance: Appearance;
  expression?: string;
  scale?: number;
  label: string;
}) {
  const draw = useCallback(
    (c: CanvasRenderingContext2D) => drawPortrait(c, appearance, expression),
    [appearance, expression],
  );
  return <PixelCanvasCustom width={64} height={64} scale={scale} draw={draw} label={label} static />;
}

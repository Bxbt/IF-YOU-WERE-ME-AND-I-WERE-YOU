import { describe, expect, it } from 'vitest';
import { emptyPlayerInput, randomPreset } from '../../src/components/PlayerForm';

describe('default appearance (docs/06 S3)', () => {
  it('is not fixed: every preset can be the starting one', () => {
    const seen = new Set([0, 0.2, 0.35, 0.5, 0.7, 0.9].map((r) => randomPreset(undefined, () => r)));
    expect([...seen].sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('never gives the partner the same preset as the player', () => {
    for (const avoid of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const) {
      for (const r of [0, 0.5, 0.99]) expect(randomPreset(avoid, () => r)).not.toBe(avoid);
    }
  });

  it('emptyPlayerInput uses the given preset', () => {
    expect(emptyPlayerInput('p3').appearance.preset).toBe('p3');
  });

  it('the cover-art pair: p5 wears shorts, p6 has spiky hair; older saves without legs still load', async () => {
    const { PRESETS } = await import('../../src/scene/draw/character');
    const { Appearance } = await import('../../src/persistence/schema');
    expect(PRESETS.p5.legs).toBe('short');
    expect(PRESETS.p6.hairStyle).toBe(4);
    for (const p of Object.values(PRESETS)) expect(Appearance.safeParse(p).success).toBe(true);
    const { legs: _l, ...old } = { ...PRESETS.p1, legs: undefined };
    void _l;
    expect(Appearance.safeParse(old).success).toBe(true);
  });
});

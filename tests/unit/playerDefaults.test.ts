import { describe, expect, it } from 'vitest';
import { emptyPlayerInput, randomPreset } from '../../src/components/PlayerForm';

describe('default appearance (docs/06 S3)', () => {
  it('is not fixed: every preset can be the starting one', () => {
    const seen = new Set([0, 0.3, 0.6, 0.9].map((r) => randomPreset(undefined, () => r)));
    expect([...seen].sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('never gives the partner the same preset as the player', () => {
    for (const avoid of ['p1', 'p2', 'p3', 'p4'] as const) {
      for (const r of [0, 0.5, 0.99]) expect(randomPreset(avoid, () => r)).not.toBe(avoid);
    }
  });

  it('emptyPlayerInput uses the given preset', () => {
    expect(emptyPlayerInput('p3').appearance.preset).toBe('p3');
  });
});

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

describe('สุ่มรูปลักษณ์, หนวดเครา, คำเรียกคู่แบบพิมพ์เอง (docs/06 S3, docs/07 §3)', () => {
  it('a random look is always valid and keeps the preset key', async () => {
    const { randomAppearance } = await import('../../src/components/AvatarPicker');
    const { PRESETS } = await import('../../src/scene/draw/character');
    const { Appearance } = await import('../../src/persistence/schema');
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const a = randomAppearance(PRESETS.p2, rnd);
      expect(Appearance.safeParse(a).success).toBe(true);
      expect(a.preset).toBe('p2');
      seen.add(a.facialHair ?? 'none');
    }
    expect([...seen].sort()).toEqual(['beard', 'mustache', 'none', 'stubble']);
  });

  it('{you} uses the custom word; it is dropped when another style is chosen', async () => {
    const { buildTokenContext } = await import('../../src/store/story');
    const { sampleSave } = await import('../fixtures/factory');
    const s = sampleSave();
    const j = s.journeys.jr_journey001!;
    s.players.pl_playerA01 = { ...s.players.pl_playerA01!, addressStyle: 'custom', addressCustom: 'ที่รัก' };
    expect(buildTokenContext(s, j).address.in).toBe('ที่รัก');
    const { createPlayer } = await import('../../src/store/actions');
    const { useGame } = await import('../../src/store/game');
    const { createEmptySave } = await import('../../src/persistence/schema');
    useGame.setState({ save: createEmptySave() });
    const id = createPlayer({
      nickname: 'ฟ้า',
      sentenceEnding: '',
      addressStyle: 'เธอ',
      addressCustom: 'แก',
      appearance: s.players.pl_playerA01!.appearance,
    });
    expect(useGame.getState().save.players[id]?.addressCustom).toBeUndefined();
  });
});

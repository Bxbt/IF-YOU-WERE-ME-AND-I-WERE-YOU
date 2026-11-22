/** Phase 3A Sealed Exchange (docs/08 §6.1). TC-EXP-11, TC-EXP-12. Fictional names only. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { base32DecodeKey, base32Encode, formatKey, newRevealKey, openJson, sealJson } from '../../src/engine/sealed';
import {
  buildInvitation,
  buildSealed,
  importSealed,
  isOwnSealed,
  joinFromInvitation,
  parseRemoteFile,
  revealWithKey,
  revealedMirrors,
} from '../../src/store/remote';
import { saveMirrorAnswer } from '../../src/store/story';
import { SaveRoot, createEmptySave } from '../../src/persistence/schema';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { ui } from '../../src/content/th/ui';
import { MIRRORS } from '../../src/content/th/questions';
import { sampleSave } from '../fixtures/factory';

const A = 'pl_playerA01';
const J = 'jr_journey001';
const m1 = MIRRORS[0]!;
const [opt1, opt2] = [m1.options[0]!.id, m1.options[1]!.id];

function inviterSave(): SaveRoot {
  let s = sampleSave();
  s.journeys[J]!.mode = 'remote_sealed';
  s.journeys[J]!.remote = { kind: 'sealed' };
  const partner = s.journeys[J]!.playerIds[1];
  s = saveMirrorAnswer(s, J, m1.id, 'self', A, 'self', { selected: [opt1], meta: null, freeText: '' });
  s = saveMirrorAnswer(s, J, m1.id, 'self', A, 'perceived', { selected: [opt2], meta: null, freeText: 'ความลับของการเดา' });
  void partner;
  return s;
}

function inviteeSave(): SaveRoot {
  const s = createEmptySave();
  const base = sampleSave().players[A]!;
  const { pin: _pin, ...rest } = base;
  void _pin;
  s.players.pl_otherC001 = { ...rest, id: 'pl_otherC001', nickname: 'ผู้เล่น C' };
  return s;
}

describe('sealed crypto', () => {
  it('Base32 key: 26 characters, round-trips, ignores spaces/dashes and case', () => {
    const key = newRevealKey();
    expect(key).toMatch(/^[A-Z2-7]{26}$/);
    const bytes = base32DecodeKey(formatKey(key).toLowerCase().replace(/ /g, '-'))!;
    expect(base32Encode(bytes)).toBe(key);
    expect(base32DecodeKey('SHORT')).toBeNull();
    expect(formatKey(key).split(' ').every((g) => g.length >= 4 && g.length <= 5)).toBe(true);
  });

  it('TC-EXP-11: right key opens the data; a wrong key is "bad_key"', async () => {
    const key = newRevealKey();
    const sealed = await sealJson({ hello: 'ทดสอบ' }, key);
    expect(await openJson(sealed, key)).toEqual({ hello: 'ทดสอบ' });
    await expect(openJson(sealed, newRevealKey())).rejects.toThrow('bad_key');
  });
});

describe('sealed exchange flow', () => {
  it('TC-EXP-12: the invitation file has no answers', async () => {
    const file = JSON.stringify(await buildInvitation(inviterSave(), J));
    expect(file).not.toContain(opt1);
    expect(file).not.toContain('answers');
    expect(file).not.toContain('q13_listen');
    const parsed = await parseRemoteFile(file);
    expect(parsed.ok && parsed.scope).toBe('invitation');
  });

  it('two devices: seal → import → reveal with key; guesses never leave the device', async () => {
    // Device A invites, device C joins.
    let a = inviterSave();
    const invite = await parseRemoteFile(JSON.stringify(await buildInvitation(a, J)));
    if (!invite.ok || invite.scope !== 'invitation') throw new Error('invite');
    const joined = joinFromInvitation(inviteeSave(), 'pl_otherC001', invite.data);
    if (!joined.ok) throw new Error('join');
    let c = joined.save;
    expect(SaveRoot.safeParse(c).success).toBe(true);
    expect(c.journeys[J]!.mode).toBe('remote_sealed');
    expect(c.players[c.journeys[J]!.playerIds[1]]!.nickname).toBe('ผู้เล่น A');
    c = saveMirrorAnswer(c, J, m1.id, 'self', 'pl_otherC001', 'self', { selected: [opt2], meta: null, freeText: '' });

    // Both seal. A's file never carries the plain answer or the guess.
    const sa = (await buildSealed(a, J))!;
    a = sa.save;
    const aFile = JSON.stringify(sa.file);
    expect(aFile).not.toContain(opt1);
    expect(aFile).not.toContain('ความลับของการเดา');
    const sc = (await buildSealed(c, J))!;
    c = sc.save;

    // A imports C's file; own file is caught.
    const cParsed = await parseRemoteFile(JSON.stringify(sc.file));
    if (!cParsed.ok || cParsed.scope !== 'sealed') throw new Error('sealed');
    expect(await isOwnSealed(a, cParsed.data)).toBe(false);
    const aParsed = await parseRemoteFile(aFile);
    if (!aParsed.ok || aParsed.scope !== 'sealed') throw new Error('sealed');
    expect(await isOwnSealed(a, aParsed.data)).toBe(true);
    const imp = importSealed(a, cParsed.data);
    if (!imp.ok) throw new Error('import');
    a = imp.save;
    expect(revealedMirrors(a.journeys[J]!)).toEqual([]);

    // Wrong key: nothing changes.
    expect(await revealWithKey(a, J, newRevealKey())).toEqual({ ok: false, error: 'bad_key' });

    // C's key opens it.
    const r = await revealWithKey(a, J, c.journeys[J]!.remote!.myRevealKey!);
    if (!r.ok) throw new Error('reveal');
    a = r.save;
    expect(SaveRoot.safeParse(a).success).toBe(true);
    const shown = revealedMirrors(a.journeys[J]!);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.partnerSelf.selected).toEqual([opt2]);
    expect(shown[0]!.myGuess?.selected).toEqual([opt2]);
  });

  it('a sealed file for another journey is refused', async () => {
    const s = (await buildSealed(inviterSave(), J))!;
    const other = sampleSave();
    delete other.journeys[J];
    expect(importSealed(other, s.file.data)).toEqual({ ok: false, error: 'no_journey' });
  });

  it('the key is kept and reused for newer files', async () => {
    const first = (await buildSealed(inviterSave(), J))!;
    const second = (await buildSealed(first.save, J))!;
    expect(second.save.journeys[J]!.remote!.myRevealKey).toBe(first.save.journeys[J]!.remote!.myRevealKey);
  });
});

describe('S17 Remote Lobby', () => {
  it('shows the 3A limits word for word and links to live play (S19)', async () => {
    useGame.setState({ ready: true, save: createEmptySave(), health: 'ok', recovery: null, lastSavedAt: null });
    const router = createMemoryRouter(routes, { initialEntries: ['/remote'] });
    render(<RouterProvider router={router} />);
    for (const l of ui.remote.limits) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ui.remote.onlineGo })).toHaveAttribute('href', '/live');
    await userEvent.click(screen.getByRole('button', { name: ui.remote.create }));
    expect(router.state.location.search).toBe('?mode=remote');
  });

  it('shows the journey steps behind the player (no PIN in this fixture)', () => {
    const s = inviterSave();
    delete s.players[A]!.pin;
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const router = createMemoryRouter(routes, { initialEntries: ['/remote'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('remote-journey')).toHaveTextContent(ui.remote.sealedCount(1));
    expect(screen.getByRole('button', { name: ui.remote.exportInvite })).toBeInTheDocument();
  });
});

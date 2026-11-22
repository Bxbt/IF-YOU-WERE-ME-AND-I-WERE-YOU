import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinGate } from '../../src/components/PinGate';
import { PinSetup } from '../../src/components/PinSetup';
import { createPinRecord, type PinRecord } from '../../src/lib/pin';
import { sampleSave } from '../fixtures/factory';

let pin: PinRecord;
beforeAll(async () => {
  pin = await createPinRecord('2580', 1000);
});

function setup(overrides: Partial<Parameters<typeof PinGate>[0]> = {}) {
  const props = {
    player: { id: 'pl_dao000001', nickname: 'ดาว', pin },
    onUnlock: vi.fn(),
    onAttempt: vi.fn(),
    onForget: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<PinGate {...props} />);
  return props;
}

async function tapDigits(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const d of digits) await user.click(screen.getByRole('button', { name: `เลข ${d}` }));
}

describe('PinGate', () => {
  it('is a modal dialog naming the owner, with a labelled keypad', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'ใส่ PIN ของ ดาว' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('group', { name: 'แป้นตัวเลข' })).toBeInTheDocument();
    for (let d = 0; d <= 9; d++) expect(screen.getByRole('button', { name: `เลข ${d}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยืนยัน PIN' })).toBeDisabled();
  });

  it('wrong PIN shows a message and reports the attempt', async () => {
    const user = userEvent.setup();
    const p = setup();
    await tapDigits(user, '1111');
    await user.click(screen.getByRole('button', { name: 'ยืนยัน PIN' }));
    expect(await screen.findByText('PIN ไม่ถูกต้อง ลองอีกครั้ง')).toBeInTheDocument();
    expect(p.onUnlock).not.toHaveBeenCalled();
    expect(p.onAttempt).toHaveBeenCalledWith(expect.objectContaining({ failedAttempts: 1 }));
  });

  it('correct PIN (physical keyboard) calls onUnlock', async () => {
    const user = userEvent.setup();
    const p = setup();
    await user.keyboard('2580');
    expect(screen.getByText('ใส่แล้ว 4 หลัก')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ยืนยัน PIN' }));
    await waitFor(() => expect(p.onUnlock).toHaveBeenCalledTimes(1));
  });

  it('shows the lockout countdown with the "not strong protection" note', () => {
    setup({
      player: {
        id: 'pl_dao000001',
        nickname: 'ดาว',
        pin: { ...pin, failedAttempts: 5, lockedUntil: new Date(Date.now() + 30_000).toISOString() },
      },
    });
    expect(screen.getByText(/ใส่ผิดหลายครั้ง รออีก (29|30) วินาที/)).toBeInTheDocument();
    expect(screen.getByText(/ไม่ใช่การป้องกันที่แข็งแรง/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เลข 1' })).toBeDisabled();
  });

  it('Escape cancels', async () => {
    const user = userEvent.setup();
    const p = setup();
    await user.keyboard('{Escape}');
    expect(p.onCancel).toHaveBeenCalled();
  });

  it('forget flow needs both steps and the typed nickname', async () => {
    const user = userEvent.setup();
    const p = setup();
    await user.click(screen.getByRole('button', { name: 'ลืม PIN' }));
    expect(screen.getByText('ดาว')).toBeInTheDocument();
    expect(screen.getByText(/Drafts/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'เข้าใจแล้ว ไปขั้นต่อไป' }));
    const confirm = screen.getByRole('button', { name: 'ลบคำตอบที่ยังไม่เปิดและลบ PIN' });
    expect(confirm).toBeDisabled();
    const input = screen.getByRole('textbox', { name: 'พิมพ์ชื่อเล่น ดาว' });
    await user.type(input, 'เมฆ');
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'ดาว');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(p.onForget).toHaveBeenCalledTimes(1);
    expect(p.onUnlock).not.toHaveBeenCalled();
  });
});

describe('PinSetup', () => {
  const noPinPlayer = () => {
    const pl = structuredClone(sampleSave().players.pl_imaginedB1!);
    pl.nickname = 'เมฆ';
    return pl;
  };

  it('shows the verbatim limits text and saves a matching PIN', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PinSetup player={noPinPlayer()} onSave={onSave} />);
    expect(screen.getByText(/ไม่ได้เข้ารหัสข้อมูล/).closest('p')).toHaveTextContent(
      'PIN ช่วยกันไม่ให้อีกคนเปิดดูคำตอบของคุณผ่านหน้าจอเกม แต่ ไม่ได้เข้ารหัสข้อมูล',
    );
    await user.click(screen.getByRole('button', { name: 'ตั้ง PIN' }));
    await user.type(screen.getByLabelText('PIN ใหม่ (ตัวเลข 4–6 หลัก)'), '1234');
    await user.type(screen.getByLabelText('ใส่ PIN ใหม่อีกครั้ง'), '1235');
    await user.click(screen.getByRole('button', { name: 'บันทึก PIN' }));
    expect(await screen.findByText('PIN ทั้งสองช่องไม่ตรงกัน')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('ใส่ PIN ใหม่อีกครั้ง'));
    await user.type(screen.getByLabelText('ใส่ PIN ใหม่อีกครั้ง'), '1234');
    await user.click(screen.getByRole('button', { name: 'บันทึก PIN' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ iterations: 210000 })));
  });

  it('remove requires the current PIN', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAttempt = vi.fn();
    render(<PinSetup player={{ ...noPinPlayer(), pin }} onSave={onSave} onAttempt={onAttempt} />);
    await user.click(screen.getByRole('button', { name: 'ลบ PIN' }));
    await user.type(screen.getByLabelText('PIN ปัจจุบัน'), '0000');
    await user.click(screen.getByRole('button', { name: 'ยืนยันลบ PIN' }));
    expect(await screen.findByText('PIN ปัจจุบันไม่ถูกต้อง')).toBeInTheDocument();
    expect(onAttempt).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('PIN ปัจจุบัน'));
    await user.type(screen.getByLabelText('PIN ปัจจุบัน'), '2580');
    await user.click(screen.getByRole('button', { name: 'ยืนยันลบ PIN' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });
});

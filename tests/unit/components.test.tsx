import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceList, FreeTextField, MetaOptions } from '../../src/components/Answering';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { PauseMenu } from '../../src/components/PauseMenu';
import { DialogueBox } from '../../src/components/TextBoxes';
import { PerspectiveBanner, ProgressDots } from '../../src/components/Labels';
import { SoundToggle } from '../../src/components/Misc';
import { emptyDraft, type AnswerDraft } from '../../src/engine/answers';
import { useGame } from '../../src/store/game';
import { createEmptySave } from '../../src/persistence/schema';
import type { OptionContent } from '../../src/content/types';

const OPTIONS: OptionContent[] = [
  { id: 'a', text: 'กอด' },
  { id: 'b', text: 'ฟัง' },
  { id: 'c', text: 'ถาม' },
];

function Harness() {
  const [d, setD] = useState<AnswerDraft>(emptyDraft());
  return (
    <>
      <ChoiceList label="คำถาม" options={OPTIONS} maxSelect={2} draft={d} onChange={setD} />
      <MetaOptions draft={d} onChange={setD} />
      <FreeTextField draft={d} onChange={setD} />
      <output data-testid="state">{JSON.stringify(d)}</output>
    </>
  );
}

beforeEach(() => {
  const save = createEmptySave();
  save.settings.textSpeed = 'instant';
  useGame.setState({ ready: true, save, health: 'ok', recovery: null, lastSavedAt: null });
});

describe('ChoiceList + MetaOptions', () => {
  it('uses aria-pressed and disables options at maxSelect (AX-10, TC-SKIP-04)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /กอด/ }));
    await userEvent.click(screen.getByRole('button', { name: /ฟัง/ }));
    expect(screen.getByRole('button', { name: /กอด/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /ถาม/ })).toBeDisabled();
    expect(screen.getByText('เลือกได้สูงสุด 2 ข้อ')).toBeInTheDocument();
  });

  it('meta answer clears options; skip hides free text', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /กอด/ }));
    await userEvent.click(screen.getByRole('button', { name: 'ไม่แน่ใจ' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ selected: [], meta: 'not_sure' });
    expect(screen.getByRole('button', { name: 'เพิ่มคำอธิบาย' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ข้าม' }));
    expect(screen.queryByRole('button', { name: 'เพิ่มคำอธิบาย' })).not.toBeInTheDocument();
  });

  it('free text counts characters up to 280', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มคำอธิบาย' }));
    await userEvent.type(screen.getByRole('textbox'), 'สวัสดี');
    expect(screen.getByText('6/280')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '280');
  });
});

describe('ConfirmDialog (AX-6)', () => {
  it('focuses inside, closes on Esc and requires the typed word', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open title="ลบ?" confirmLabel="ลบเลย" destructive typedWord="ลบทั้งหมด" onCancel={onCancel} onConfirm={onConfirm} />,
    );
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    const confirm = screen.getByRole('button', { name: 'ลบเลย' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'ลบทั้งหมด');
    expect(confirm).toBeEnabled();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('traps Tab focus inside the dialog', async () => {
    render(<ConfirmDialog open title="t" confirmLabel="ok" onCancel={() => {}} onConfirm={() => {}} />);
    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1]!.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe('PauseMenu (S14)', () => {
  it('shows only actions it was given and resumes on Esc', async () => {
    const onResume = vi.fn();
    render(<PauseMenu open onResume={onResume} onSettings={() => {}} onExit={() => {}} />);
    expect(screen.getByRole('button', { name: 'เล่นต่อ' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'ข้ามฉากนี้' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onResume).toHaveBeenCalled();
  });
});

describe('DialogueBox', () => {
  it('announces the whole line and advances on click when complete', async () => {
    const onAdvance = vi.fn();
    render(<DialogueBox speaker="ผู้เล่น A" text="พัสดุมาแล้ว" onAdvance={onAdvance} />);
    expect(screen.getByText('ผู้เล่น A: พัสดุมาแล้ว')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('first click completes a typing line instead of advancing', () => {
    vi.useFakeTimers();
    act(() => useGame.getState().update((s) => ({ ...s, settings: { ...s.settings, textSpeed: 'slow' } })));
    const onAdvance = vi.fn();
    render(<DialogueBox text="ข้อความยาวพอสมควร" onAdvance={onAdvance} />);
    fireEvent.click(screen.getByRole('button', { name: 'แสดงข้อความทั้งหมด' }));
    expect(onAdvance).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeInTheDocument();
    // Regression: the typing timer kept running and shrank the line back after the tap.
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('labels', () => {
  it('imagined banner states it is not what the partner said (docs/02 §0.6)', () => {
    render(<PerspectiveBanner name="ผู้เล่น B" variant="partner-imagined" />);
    expect(screen.getByRole('note')).toHaveTextContent('ไม่ใช่สิ่งที่ ผู้เล่น B บอก');
  });

  it('progress dots expose position only', () => {
    render(<ProgressDots current={2} total={5} />);
    expect(screen.getByRole('img', { name: 'ตำแหน่ง 2 จาก 5' })).toBeInTheDocument();
  });

  it('sound toggle is not rendered while sound is not shipped (audit M-9)', () => {
    const { container } = render(<SoundToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});

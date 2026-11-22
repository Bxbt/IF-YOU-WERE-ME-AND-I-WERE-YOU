import { useEffect } from 'react';
import { create } from 'zustand';
import { X } from 'lucide-react';

type Kind = 'info' | 'success' | 'error';
interface Toast { id: number; kind: Kind; text: string }

let nextId = 1;
export const useToasts = create<{ items: Toast[]; push: (text: string, kind?: Kind) => void; dismiss: (id: number) => void }>()(
  (set) => ({
    items: [],
    push: (text, kind = 'info') => set((s) => ({ items: [...s.items, { id: nextId++, kind, text }] })),
    dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  }),
);

export const toast = (text: string, kind?: Kind) => useToasts.getState().push(text, kind);

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), 4000);
    return () => clearTimeout(id);
  }, [t.id, dismiss]);
  const color = t.kind === 'error' ? 'border-danger' : t.kind === 'success' ? 'border-blue' : 'border-lavender/50';
  return (
    <div className={`panel flex items-center gap-3 border-2 py-3 ${color}`}>
      <p className="m-0 flex-1 text-sm">{t.text}</p>
      <button type="button" aria-label="ปิด" onClick={() => dismiss(t.id)} className="min-h-[44px] min-w-[44px]">
        <X aria-hidden className="mx-auto h-5 w-5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-md">
          <ToastItem t={t} />
        </div>
      ))}
    </div>
  );
}

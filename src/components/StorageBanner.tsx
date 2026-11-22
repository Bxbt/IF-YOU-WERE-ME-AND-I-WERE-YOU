import { AlertTriangle } from 'lucide-react';
import { useGame } from '../store/game';
import { ui } from '../content/th/ui';

export function StorageBanner() {
  const health = useGame((s) => s.health);
  if (health === 'ok') return null;

  const text =
    health === 'unavailable' ? ui.banner.unavailable : health === 'quota' ? ui.banner.quota : ui.banner.staleTab;

  return (
    <div role="status" className="flex items-start gap-3 bg-indigo px-4 py-3 text-sm text-cream">
      <AlertTriangle aria-hidden className="mt-1 h-5 w-5 shrink-0 text-orange" />
      <p className="m-0 flex-1">{text}</p>
      {health === 'stale_tab' && (
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {ui.banner.reload}
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useGame } from '../store/game';

const QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  );
}

/** Combines the OS setting with the in-game override (docs/06 §1.3). */
export function useReducedMotion(): boolean {
  const pref = useGame((s) => s.save.settings.reducedMotion);
  const [system, setSystem] = useState(systemPrefersReduced);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return system;
}

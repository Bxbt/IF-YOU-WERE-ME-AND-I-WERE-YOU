import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { ui } from '../content/th/ui';

/**
 * M1 placeholder for S1. Shows only actions that really work (docs/10: no fake features),
 * so "start" / "continue" are intentionally absent until the screens behind them exist (M2–M4).
 */
export function HomeScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 text-center">
      <header>
        <h1 className="m-0 font-pixel text-[28px] leading-tight text-cream lg:text-[48px]">
          <span lang="en" className="block">{ui.title1}</span>
          <span lang="en" className="block">{ui.title2}</span>
        </h1>
        <p lang="en" className="mt-3 text-lavender">{ui.tagline}</p>
      </header>

      <p className="panel m-0 text-sm text-lavender">{ui.devNotice}</p>

      <nav className="flex w-full max-w-[360px] flex-col gap-3" aria-label="เมนูหลัก">
        <Link to="/settings" className="btn btn-primary w-full no-underline">
          <Database aria-hidden className="h-5 w-5" />
          {ui.myData}
        </Link>
      </nav>
    </main>
  );
}

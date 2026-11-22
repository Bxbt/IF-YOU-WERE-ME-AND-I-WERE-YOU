import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, Lock, SkipForward } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PixelButton } from '../components/PixelButton';
import { ScreenHeader } from '../components/Misc';

const ICONS = [HeartHandshake, SkipForward, Lock];

/** S1a — Safety Intro (docs/06 S1a). */
export function IntroScreen() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.intro.heading} />
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {ui.intro.cards.map((c, i) => {
          const Icon = ICONS[i]!;
          return (
            <li key={c.title} className="panel flex flex-col gap-2">
              <Icon aria-hidden className="h-6 w-6 text-orange" />
              <h2 className="m-0 text-lg font-semibold">{c.title}</h2>
              <p className="m-0 text-sm text-lavender">{c.body}</p>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-sm text-lavender">{ui.intro.contentNote}</p>
      <div className="flex flex-wrap items-center gap-4">
        <PixelButton onClick={() => navigate('/mode')}>{ui.intro.accept}</PixelButton>
        <Link to="/about" className="text-sm text-lavender underline">
          {ui.intro.readMore}
        </Link>
      </div>
    </main>
  );
}

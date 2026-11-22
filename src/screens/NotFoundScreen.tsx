import { Link } from 'react-router-dom';
import { ui } from '../content/th/ui';

export function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="m-0 text-2xl font-semibold">{ui.notFound.heading}</h1>
      <p className="m-0 text-lavender">{ui.notFound.body}</p>
      <Link to="/" className="btn btn-primary no-underline">
        {ui.home}
      </Link>
    </main>
  );
}

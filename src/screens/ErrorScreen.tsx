import { Link } from 'react-router-dom';
import { ui } from '../content/th/ui';

/** Route-level error boundary (TC-ERR-08). The save is untouched because writes validate first. */
export function ErrorScreen() {
  return (
    <main role="alert" className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="m-0 text-2xl font-semibold">{ui.error.heading}</h1>
      <p className="m-0 text-lavender">{ui.error.body}</p>
      <Link to="/" className="btn btn-primary no-underline">{ui.home}</Link>
    </main>
  );
}

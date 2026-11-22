import { Phone } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader } from '../components/Misc';
import { SUPPORT_RESOURCES } from '../content/th/safety';

/** S11 — About & Safety Resources (docs/06 S11, docs/08 §9.4). */
export function AboutScreen() {
  const a = ui.about;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={a.heading} preferHistory />
      <img
        src="./brand/logo-512.png"
        alt={a.logoAlt}
        width={160}
        height={160}
        className="mx-auto h-40 w-40"
      />
      <p className="m-0">{a.what}</p>

      <section className="panel" aria-labelledby="not-h">
        <h2 id="not-h" className="m-0 mb-2 text-lg font-semibold">
          {a.notTitle}
        </h2>
        <ul className="m-0 pl-5 text-lavender">
          {a.notList.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="pr-h">
        <h2 id="pr-h" className="m-0 mb-2 text-lg font-semibold">
          {a.principlesTitle}
        </h2>
        <ul lang="en" className="m-0 pl-5 italic text-lavender">
          {a.principles.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="safe-h">
        <h2 id="safe-h" className="m-0 mb-2 text-lg font-semibold">
          {a.safetyTitle}
        </h2>
        <p className="m-0 mb-3 text-sm">{a.safetyBody}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {SUPPORT_RESOURCES.map((r) => (
            <li key={r.tel}>
              <a href={`tel:${r.tel}`} className="btn btn-ghost w-full justify-start no-underline">
                <Phone aria-hidden className="h-5 w-5 shrink-0 text-orange" />
                <span className="flex flex-col text-left">
                  <span className="font-semibold">
                    {r.tel} · {r.name}
                  </span>
                  <span className="text-[13px] text-lavender">{r.when}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-[13px] text-lavender">{a.safetyVerify}</p>
      </section>

      <section className="panel" aria-labelledby="data-h">
        <h2 id="data-h" className="m-0 mb-2 text-lg font-semibold">
          {a.dataTitle}
        </h2>
        <p className="m-0 text-sm text-lavender">{a.dataBody}</p>
      </section>

      <section className="panel" aria-labelledby="cr-h">
        <h2 id="cr-h" className="m-0 mb-2 text-lg font-semibold">
          {a.creditsTitle}
        </h2>
        <ul className="m-0 pl-5 text-sm text-lavender">
          {a.credits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

"use client";

import type { ExplanationItem } from "@/agent/explain";

type ResultTableProps = {
  summary?: string;
  disclaimer?: string;
  items: ExplanationItem[];
};

const BADGE_STYLES: Record<ExplanationItem["risk_level"], string> = {
  Green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Yellow: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Red: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  Unknown: "bg-slate-700/40 text-slate-200 border-slate-500/40",
};

const CARD_ACCENTS: Record<
  ExplanationItem["risk_level"],
  {
    stripe: string;
    certaintyTrack: string;
    certaintyFill: string;
  }
> = {
  Green: {
    stripe: "bg-emerald-300/70",
    certaintyTrack: "bg-emerald-500/15",
    certaintyFill: "bg-emerald-400",
  },
  Yellow: {
    stripe: "bg-amber-300/70",
    certaintyTrack: "bg-amber-500/15",
    certaintyFill: "bg-amber-400",
  },
  Red: {
    stripe: "bg-rose-300/70",
    certaintyTrack: "bg-rose-500/15",
    certaintyFill: "bg-rose-400",
  },
  Unknown: {
    stripe: "bg-slate-300/70",
    certaintyTrack: "bg-slate-500/20",
    certaintyFill: "bg-slate-300",
  },
};

export default function ResultTable({ summary, disclaimer, items }: ResultTableProps) {
  const redCount = items.filter((item) => item.risk_level === "Red").length;
  const greenCount = items.filter((item) => item.risk_level === "Green").length;

  if (!items || items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300 sm:p-6">
        <header className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-emerald-700/70 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Ingredient Insights
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Explanation</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Upload a label to unlock ingredient cards with risk badge, certainty bar, and source links.
          </p>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Card Structure</p>
            <p className="mt-2 text-sm text-slate-200">Ingredient, function, why it matters, certainty.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Risk Coding</p>
            <p className="mt-2 text-sm text-slate-200">Green, Yellow, Red, and Unknown with stronger mobile contrast.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <header className="space-y-2 text-slate-200">
        <div className="inline-flex items-center rounded-full border border-emerald-700/70 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
          Ingredient Insights
        </div>
        <h2 className="text-xl font-semibold">Explanation</h2>
        {summary && <p className="text-sm text-slate-300">{summary}</p>}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
            Total: {items.length}
          </span>
          <span className="rounded-full border border-rose-900 bg-rose-950/30 px-2.5 py-1 text-rose-200">
            High risk: {redCount}
          </span>
          <span className="rounded-full border border-emerald-800 bg-emerald-950/30 px-2.5 py-1 text-emerald-200">
            Green: {greenCount}
          </span>
        </div>
      </header>

      <div className="mt-4">
        <div className="hidden overflow-x-auto rounded-lg border border-slate-800 md:block">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Ingredient</th>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Function</th>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Risk</th>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Why</th>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Certainty</th>
                <th scope="col" className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Sources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {items.map((item) => (
                <tr key={item.name} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-100">{item.name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.function}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[item.risk_level]}`}
                    >
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.why}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {(item.certainty * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <ul className="space-y-1">
                      {item.sources.map((source) => (
                        <li key={source}>
                          {source.startsWith("http") ? (
                            <a
                              href={source}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-300 hover:text-emerald-200"
                            >
                              {source}
                            </a>
                          ) : (
                            <span>{source}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:hidden">
          {items.map((item) => (
            <article
              key={item.name}
              className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 p-4 transition-transform duration-200 active:scale-[0.99]"
            >
              <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${CARD_ACCENTS[item.risk_level].stripe}`} />

              <header className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Ingredient
                  </p>
                  <h3 className="text-base font-semibold leading-tight text-slate-100">{item.name}</h3>
                </div>
                <span
                  className={`inline-flex flex-none items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[item.risk_level]}`}
                >
                  {item.risk_level}
                </span>
              </header>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Function</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-200">{item.function}</p>
                </div>

                <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Why it matters</p>
                  <p className="mt-1 leading-relaxed text-slate-300">{item.why}</p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-800/90 bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-[0.18em]">Certainty</span>
                    <span className="font-medium text-slate-200">{(item.certainty * 100).toFixed(0)}%</span>
                  </div>
                  <div className={`h-2 overflow-hidden rounded-full ${CARD_ACCENTS[item.risk_level].certaintyTrack}`}>
                    <div
                      className={`h-full rounded-full ${CARD_ACCENTS[item.risk_level].certaintyFill}`}
                      style={{ width: `${Math.min(Math.max(item.certainty * 100, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {item.sources.length > 0 && (
                  <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sources</p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-400">
                      {item.sources.map((source) => (
                        <li key={source} className="break-all rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-2">
                          {source.startsWith("http") ? (
                            <a
                              href={source}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-300 underline decoration-emerald-300/40 underline-offset-2 hover:text-emerald-200"
                            >
                              {source}
                            </a>
                          ) : (
                            <span>{source}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {disclaimer && (
        <p className="mt-4 text-xs text-slate-500">{disclaimer}</p>
      )}
    </section>
  );
}

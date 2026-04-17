"use client";

type StepStatus = "pending" | "active" | "complete";

type ProgressStep = {
  key: string;
  label: string;
  status: StepStatus;
  description?: string;
};

type ProgressStepsProps = {
  steps: ProgressStep[];
};

const STATUS_STYLES: Record<StepStatus, string> = {
  pending: "border-slate-700 text-slate-400",
  active: "border-emerald-600 bg-emerald-950/30 text-emerald-200",
  complete: "border-emerald-500 bg-emerald-500/10 text-emerald-300",
};

const DOT_STYLES: Record<StepStatus, string> = {
  pending: "bg-slate-700",
  active: "bg-emerald-400",
  complete: "bg-emerald-500",
};

const STRIPE_STYLES: Record<StepStatus, string> = {
  pending: "bg-slate-700/70",
  active: "bg-emerald-400/80",
  complete: "bg-emerald-400/80",
};

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <header className="mb-5 space-y-2 text-slate-200">
        <div className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Pipeline
        </div>
        <h2 className="text-xl font-semibold">Analysis progress</h2>
        <p className="text-sm text-slate-300">Lablr runs OCR, analysis, then explanation.</p>
      </header>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 transition ${STATUS_STYLES[step.status]}`}
          >
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${STRIPE_STYLES[step.status]}`} />
            <span className={`mt-1 h-3 w-3 flex-none rounded-full ${DOT_STYLES[step.status]}`} aria-hidden />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 font-medium uppercase tracking-wide text-xs text-slate-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-base text-slate-200">{step.label}</p>
              </div>
              {step.description && (
                <p className="mt-1 text-sm text-slate-400">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

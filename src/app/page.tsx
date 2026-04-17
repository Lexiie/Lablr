"use client";

import { useCallback, useMemo, useState } from "react";
import UploadCard from "@ui/components/UploadCard";
import ProgressSteps from "@ui/components/ProgressSteps";
import ResultTable from "@ui/components/ResultTable";
import type { ExplanationItem, ExplanationResult } from "@/agent/explain";
import type { OCRResult } from "@/agent/ocr";

type StepStatus = "pending" | "active" | "complete";

type StepKey = "ocr" | "analysis" | "explanation";

type Step = {
  key: StepKey;
  label: string;
  status: StepStatus;
  description: string;
};

const INITIAL_STEPS: Step[] = [
  {
    key: "ocr",
    label: "OCR",
    status: "pending",
    description: "Waiting to read the label image.",
  },
  {
    key: "analysis",
    label: "Analysis",
    status: "pending",
    description: "Preparing ingredient heuristics and lookups.",
  },
  {
    key: "explanation",
    label: "Explanation",
    status: "pending",
    description: "Generating consumer-friendly insights.",
  },
];

const STEP_DESCRIPTIONS: Record<StepKey, { active: string; complete: string }> = {
  ocr: {
    active: "Uploading and reading the label with OCR.space…",
    complete: "OCR agent extracted text from the label.",
  },
  analysis: {
    active: "Matching glossary terms and risk rules…",
    complete: "Heuristics prepared for explanation agent.",
  },
  explanation: {
    active: "Summarizing ingredient impact for consumers…",
    complete: "Explanation ready with safety badges.",
  },
};

export default function LablrPage() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string>();
  const [disclaimer, setDisclaimer] = useState<string>();
  const [items, setItems] = useState<ExplanationItem[]>([]);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string>("");
  const [language, setLanguage] = useState<string>("");

  const updateStep = useCallback((key: StepKey, status: StepStatus, description?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.key === key
          ? {
              ...step,
              status,
              description: description ?? step.description,
            }
          : step
      )
    );
  }, []);

  const resetSteps = useCallback(() => {
    setSteps(INITIAL_STEPS);
  }, []);

  const latestRiskBadge = useMemo(() => {
    if (!items || items.length === 0) {
      return null;
    }
    const priority: Record<ExplanationItem["risk_level"], number> = {
      Red: 3,
      Yellow: 2,
      Green: 1,
      Unknown: 0,
    };
    return items.reduce<ExplanationItem | null>((current, item) => {
      if (!current) {
        return item;
      }
      return priority[item.risk_level] > priority[current.risk_level] ? item : current;
    }, null);
  }, [items]);

  const handleSubmit = useCallback(
    async ({ file, imageUrl }: { file?: File; imageUrl?: string }) => {
      if (!file && !imageUrl) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      resetSteps();
      setItems([]);
      setSummary(undefined);
      setDisclaimer(undefined);
      setOcrResult(null);
      setLastInput(imageUrl || file?.name || "");
      setLanguage("");

      try {
        updateStep("ocr", "active", STEP_DESCRIPTIONS.ocr.active);

        let response: Response;
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
          });
        } else {
          response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: imageUrl }),
          });
        }

        if (!response.ok) {
          const problem = await response.json().catch(() => ({}));
          throw new Error(problem?.error || `Server returned ${response.status}`);
        }

        const data = (await response.json()) as {
          ocr: OCRResult;
          explanation: ExplanationResult;
        };

        setOcrResult(data.ocr);
        updateStep("ocr", "complete", STEP_DESCRIPTIONS.ocr.complete);

        updateStep("analysis", "active", STEP_DESCRIPTIONS.analysis.active);
        updateStep("analysis", "complete", STEP_DESCRIPTIONS.analysis.complete);

        updateStep("explanation", "active", STEP_DESCRIPTIONS.explanation.active);
        setItems(data.explanation?.items || []);
        setSummary(data.explanation?.summary);
        setDisclaimer(data.explanation?.disclaimer);
        setLanguage(data.explanation?.language || data.ocr.language || "");
        updateStep("explanation", "complete", STEP_DESCRIPTIONS.explanation.complete);
      } catch (caught) {
        console.error("LablrPage", caught);
        setError((caught as Error).message || "Unexpected error occurred");
        resetSteps();
      } finally {
        setIsSubmitting(false);
      }
    },
    [resetSteps, updateStep]
  );

  return (
    <main className="text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:py-10">
        <header className="border-y border-emerald-400/25 bg-black/30 px-4 py-8 text-slate-200 sm:px-6 sm:py-10">
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <span className="mt-1 h-14 w-[3px] rounded-full bg-emerald-400" />
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
                  Label Intelligence
                </p>
                <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                  Understand any product label in seconds
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
              Upload a photo of any food, skincare, or OTC label. Lablr extracts ingredients, checks risk heuristics,
              and returns plain-language explanations with confidence and safety signals.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#upload"
                className="inline-flex items-center justify-center border border-emerald-500/80 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Analyze Label
              </a>
              <a
                href="#results"
                className="inline-flex items-center justify-center border border-slate-600 bg-black px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/70 hover:text-white"
              >
                See Results
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em]">
              <span className="text-emerald-300">FOOD</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">SKINCARE</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">OTC</span>
            </div>

            {(lastInput || latestRiskBadge || language || ocrResult) && (
              <div className="border-t border-emerald-500/20 pt-4 text-xs text-slate-400">
                {lastInput && (
                  <p>
                    Last input: <span className="font-mono text-slate-200">{lastInput}</span>
                  </p>
                )}
                {latestRiskBadge && (
                  <p>
                    Highest flagged: <span className="font-semibold text-emerald-300">{latestRiskBadge.name}</span>
                  </p>
                )}
                {language && (
                  <p>
                    Detected language: <span className="font-semibold text-slate-300">{language}</span>
                  </p>
                )}
                {ocrResult && (
                  <p>
                    OCR confidence: <span className="font-semibold text-slate-200">{Math.round(ocrResult.confidence * 100)}%</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        <section id="upload" className="scroll-mt-28">
          <UploadCard onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </section>

        <section id="progress" className="scroll-mt-28">
          {error ? (
            <div className="rounded-lg border border-rose-600/60 bg-rose-500/20 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <ProgressSteps steps={steps} />
          )}
        </section>

        <section id="results" className="scroll-mt-28">
          <ResultTable summary={summary} disclaimer={disclaimer} items={items} />
        </section>
      </div>
    </main>
  );
}

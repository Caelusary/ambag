import { Check } from "lucide-react";
import { STEP_LABELS } from "@/lib/constants";

/** The four steps a task moves through, with the ones reached ticked and joined by a filled line. */
export function Stepper({ rank }: { rank: number }) {
  return (
    <ol className="mb-5 flex items-start" aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const reached = n <= rank;
        const current = n === rank;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1.5"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-[13px] right-[calc(50%+18px)] h-0.5 w-[calc(100%-36px)] rounded-full ${
                  reached ? "bg-accent-500" : "bg-neutral-300"
                }`}
              />
            )}
            <span
              className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                reached
                  ? "bg-accent-500 text-white"
                  : "border border-neutral-300 bg-surface text-neutral-700"
              } ${current ? "ring-4 ring-accent-200" : ""}`}
            >
              {reached && !current ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : n}
            </span>
            <span
              className={`text-center text-[11px] ${current ? "font-semibold text-text" : "text-neutral-700"}`}
            >
              {label}
              {reached && !current && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

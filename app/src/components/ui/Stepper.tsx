import { STEP_LABELS } from "@/lib/types";

export function Stepper({ rank }: { rank: number }) {
  return (
    <div className="mb-5 flex items-center gap-1">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const reached = n <= rank;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-bold ${
                reached ? "bg-accent-500 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {n}
            </div>
            <div className="text-center text-[10px] text-neutral-700">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

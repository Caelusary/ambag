"use client";

import { useStore } from "@/lib/store";

export default function LedgerPage() {
  const { ledger } = useStore();

  return (
    <div>
      <p className="mb-4 text-[13px] text-neutral-700">
        Full visibility, not a scoreboard — everyone sees the same numbers.
      </p>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-neutral-300 bg-surface shadow-sm">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-xs text-neutral-700">
              <th className="px-3 py-2.5 font-semibold">Member</th>
              <th className="px-3 py-2.5 font-semibold">On time</th>
              <th className="px-3 py-2.5 font-semibold">Late</th>
              <th className="px-3 py-2.5 font-semibold">Overdue</th>
              <th className="px-3 py-2.5 font-semibold">Swaps</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r, i) => (
              <tr
                key={r.name}
                className={i !== ledger.length - 1 ? "border-b border-neutral-200" : ""}
              >
                <td className="px-3 py-2.5 font-medium text-text">{r.name}</td>
                <td className="px-3 py-2.5 text-accent-2-700">{r.onTime}</td>
                <td className="px-3 py-2.5 text-text">{r.late}</td>
                <td className="px-3 py-2.5 text-accent-700">{r.overdue}</td>
                <td className="px-3 py-2.5 text-text">{r.swaps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

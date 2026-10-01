"use client";

import { useMemo } from "react";
import { LEADER, useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { computeLedger } from "@/lib/rules";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";

const CELL = "px-2.5 py-3 sm:px-4 lg:px-5";

/** A count that fades out when it's zero, so the numbers that matter stand out. */
function Count({ value, tone }: { value: number; tone: string }) {
  return <span className={value === 0 ? "text-neutral-600" : tone}>{value}</span>;
}

export default function LedgerPage() {
  const { members, tasks, swaps } = useStore();
  const now = useNow();
  // Derived, never stored: the numbers move the moment work is accepted, goes overdue or is swapped.
  const ledger = useMemo(
    () => computeLedger(members, tasks, swaps, now),
    [members, tasks, swaps, now],
  );
  // Bars share one scale so the busiest member's record fills the column.
  const maxTracked = Math.max(1, ...ledger.map((r) => r.onTime + r.late + r.overdue));

  return (
    <div>
      <p className="mb-4 text-[13px] text-neutral-700">
        Everyone in the group sees the same numbers. On time and late count accepted work by when
        the proof went in.
      </p>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-neutral-200 bg-surface">
        <table className="w-full min-w-[320px] text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100 text-xs text-neutral-700">
              <th scope="col" className={`${CELL} py-2.5 font-semibold`}>
                Member
              </th>
              <th scope="col" className={`${CELL} py-2.5 font-semibold`}>
                On time
              </th>
              <th scope="col" className={`${CELL} py-2.5 font-semibold`}>
                Late
              </th>
              <th scope="col" className={`${CELL} py-2.5 font-semibold`}>
                Overdue
              </th>
              <th scope="col" className={`${CELL} py-2.5 font-semibold`}>
                Swaps
              </th>
              <th scope="col" className={`${CELL} hidden py-2.5 font-semibold sm:table-cell`}>
                Record
              </th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => {
              const tracked = r.onTime + r.late + r.overdue;
              const segments = [
                { n: r.onTime, cls: "bg-accent-2-600" },
                { n: r.late, cls: "bg-accent-400" },
                { n: r.overdue, cls: "bg-danger-600" },
              ];
              return (
                <tr
                  key={r.name}
                  className="border-b border-neutral-200 transition-colors duration-150 last:border-b-0 hover:bg-neutral-100/60"
                >
                  <th scope="row" className={`${CELL} font-medium text-text`}>
                    <span className="flex items-center gap-2">
                      <Avatar name={r.name} size="sm" />
                      <span className="truncate">{r.name}</span>
                      {r.name === LEADER && (
                        <span className="hidden sm:inline-flex">
                          <Tag variant="accent">Leader</Tag>
                        </span>
                      )}
                    </span>
                  </th>
                  <td className={CELL}>
                    <Count value={r.onTime} tone="font-semibold text-accent-2-700" />
                  </td>
                  <td className={CELL}>
                    <Count value={r.late} tone="text-text" />
                  </td>
                  <td className={CELL}>
                    <Count value={r.overdue} tone="font-semibold text-danger-700" />
                  </td>
                  <td className={CELL}>
                    <Count value={r.swaps} tone="text-text" />
                  </td>
                  <td className={`${CELL} hidden w-[34%] sm:table-cell`}>
                    <div
                      role="img"
                      aria-label={
                        tracked === 0
                          ? "No tracked tasks yet"
                          : `${r.onTime} on time, ${r.late} late, ${r.overdue} overdue`
                      }
                      className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-neutral-200"
                    >
                      <div
                        className="flex h-full gap-0.5"
                        style={{ width: `${(tracked / maxTracked) * 100}%` }}
                      >
                        {segments.map((s, i) =>
                          s.n > 0 ? (
                            <span
                              key={i}
                              className={`${s.cls} h-full first:rounded-l-full last:rounded-r-full`}
                              style={{ flexGrow: s.n, flexBasis: 0 }}
                            />
                          ) : null,
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

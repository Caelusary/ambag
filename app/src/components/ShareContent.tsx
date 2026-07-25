"use client";

import { Link2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import type { StatusMeta, TaskStatus } from "@/lib/types";

const STATUS_ORDER: { status: TaskStatus | "assigned+seen"; label: string; tagClass: StatusMeta["tagClass"] }[] = [
  { status: "open", label: "Open", tagClass: "outline" },
  { status: "assigned+seen", label: "Assigned", tagClass: "neutral" },
  { status: "submitted", label: "Submitted", tagClass: "accent" },
  { status: "accepted", label: "Accepted", tagClass: "accent-2" },
  { status: "rejected", label: "Rejected", tagClass: "outline" },
];

export function ShareContent() {
  const { tasks, log } = useStore();

  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  });
  const assignedSeen = (counts.assigned ?? 0) + (counts.seen ?? 0);

  return (
    <div>
      <Card tinted="accent-2" className="mb-5">
        <div className="flex items-center gap-2.5 text-[13px] text-accent-2-800">
          <Link2 size={16} strokeWidth={2.75} />
          Shared read-only link — no login required
        </div>
      </Card>

      <h2 className="mb-2.5 font-heading text-[15px] text-accent-700">Task board</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <Tag key={s.status} variant={s.tagClass}>
            {s.label}: {s.status === "assigned+seen" ? assignedSeen : (counts[s.status] ?? 0)}
          </Tag>
        ))}
      </div>

      <h2 className="mb-2.5 font-heading text-[15px] text-accent-700">Activity log</h2>
      <div className="flex flex-col gap-2.5">
        {log.map((entry) => (
          <div key={entry.id} className="border-b border-neutral-300 pb-2.5 last:border-b-0">
            <div className="text-[11px] text-neutral-700">
              {new Date(entry.ts).toLocaleString("en-US", {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </div>
            <div className="text-sm text-text">{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

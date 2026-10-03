"use client";

import { Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { LocalTime } from "@/components/ui/LocalTime";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GroupProgress } from "@/components/GroupProgress";
import type { ReactNode } from "react";
import type { LogEntry, TaskStatus } from "@/lib/types";

/** Log lines lead with whoever acted; anything else (system events) gets a plain dot. */
function actorOf(text: string, names: string[]): string | null {
  return names.find((name) => text.startsWith(`${name} `)) ?? null;
}

/**
 * The professor's view. It takes plain data rather than reading the store, because a real group's
 * public page is rendered from what the server returns for the token, with no store at all.
 */
export function ShareContent({
  tasks,
  log,
  names,
  controls,
}: {
  tasks: { status: TaskStatus }[];
  log: LogEntry[];
  /** Group members' names, to put a face beside each log line. */
  names: string[];
  /** The group's own controls (invite code, share links), shown above the summary. */
  controls?: ReactNode;
}) {
  // Desktop: the summary on the left, the full log beside it.
  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        {controls}
        <Card tinted="accent-2">
          <div className="flex items-start gap-2.5 text-sm text-accent-2-800">
            <Link2 size={16} strokeWidth={2.75} aria-hidden="true" className="mt-0.5 shrink-0" />
            Shared read-only link. No login required.
          </div>
        </Card>
        <GroupProgress tasks={tasks} />
      </div>

      <section aria-labelledby="activity-heading">
        <SectionHeading id="activity-heading" count={log.length}>
          Activity log
        </SectionHeading>
        <ol className="relative">
          {log.map((entry) => {
            const actor = actorOf(entry.text, names);
            return (
              <li key={entry.id} className="group relative flex gap-3 pb-5 last:pb-0">
                {/* Connector runs from below this marker to the next one; the last entry has none. */}
                <span
                  aria-hidden="true"
                  className="absolute top-8 bottom-0 left-[15px] w-0.5 -translate-x-1/2 rounded-full bg-neutral-200 group-last:hidden"
                />
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                  {actor ? (
                    <Avatar name={actor} size="md" />
                  ) : (
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-neutral-400" />
                  )}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-xs text-neutral-700">
                    <LocalTime ts={entry.ts} />
                  </div>
                  <div className="text-sm text-text">{entry.text}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

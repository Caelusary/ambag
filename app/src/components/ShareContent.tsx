"use client";

import { Link2 } from "lucide-react";
import { MEMBERS, useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GroupProgress } from "@/components/GroupProgress";

/** Log lines lead with whoever acted; anything else (system events) gets a plain dot. */
function actorOf(text: string): string | null {
  const first = text.split(" ", 1)[0];
  return MEMBERS.includes(first) ? first : null;
}

export function ShareContent() {
  const { log } = useStore();

  // Desktop: the summary on the left, the full log beside it.
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="mb-8 flex flex-col gap-4 lg:mb-0">
        <Card tinted="accent-2">
          <div className="flex items-center gap-2.5 text-[13px] text-accent-2-800">
            <Link2 size={16} strokeWidth={2.75} />
            Shared read-only link. No login required.
          </div>
        </Card>
        <GroupProgress />
      </div>

      <section aria-labelledby="activity-heading">
        <SectionHeading id="activity-heading" count={log.length}>
          Activity log
        </SectionHeading>
        <ol className="relative">
          {log.map((entry) => {
            const actor = actorOf(entry.text);
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
                    {new Date(entry.ts).toLocaleString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}
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

"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { formatDeadline, statusLabel, statusMeta } from "@/lib/types";

export default function PoolPage() {
  const { tasks, currentUser, claimTask } = useStore();
  const now = useNow();
  const openTasks = tasks.filter((t) => t.status === "open");
  const myTasks = tasks.filter((t) => t.assignee === currentUser);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2.5 font-heading text-[15px] text-accent-700">Open for grabs</h2>
        <div className="flex flex-col gap-3">
          {openTasks.map((t) => (
            <Card key={t.id} elevated>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-heading text-[17px] text-text">{t.title}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-700">Due {formatDeadline(t.deadlineAt, now)}</div>
                </div>
                <Tag variant="outline">Open</Tag>
              </div>
              <Button block className="mt-3.5" onClick={() => claimTask(t.id)}>
                Call dibs
              </Button>
            </Card>
          ))}
          {openTasks.length === 0 && (
            <div className="text-sm text-neutral-700">No open tasks right now.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 font-heading text-[15px] text-accent-700">Your tasks</h2>
        <div className="flex flex-col gap-3">
          {myTasks.map((t) => (
            <Link key={t.id} href={`/task/${t.id}`}>
              <Card interactive elevated>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-heading text-[17px] text-text">{t.title}</div>
                    <div className="mt-0.5 text-[11px] text-neutral-700">
                      Due {formatDeadline(t.deadlineAt, now)}
                    </div>
                  </div>
                  <Tag variant={statusMeta(t.status).tagClass}>{statusLabel(t)}</Tag>
                </div>
              </Card>
            </Link>
          ))}
          {myTasks.length === 0 && (
            <div className="text-sm text-neutral-700">You have no tasks yet — claim one above.</div>
          )}
        </div>
      </section>
    </div>
  );
}

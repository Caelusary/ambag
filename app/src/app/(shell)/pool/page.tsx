"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/feedback";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GroupProgress } from "@/components/GroupProgress";
import { DueBadge } from "@/components/task/DueBadge";
import { TaskCardHeader } from "@/components/task/TaskCardHeader";
import { statusLabel, statusMeta } from "@/lib/types";

export default function PoolPage() {
  const { tasks, currentUser, claimTask } = useStore();
  const now = useNow();
  const openTasks = tasks.filter((t) => t.status === "open");
  const myTasks = tasks.filter((t) => t.assignee === currentUser);

  return (
    <div className="flex flex-col gap-7 lg:gap-9">
      <GroupProgress />

      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <section aria-labelledby="open-heading">
          <SectionHeading id="open-heading" count={openTasks.length}>
            Open for grabs
          </SectionHeading>
          <div className="flex flex-col gap-3">
            {openTasks.map((t) => (
              <Card key={t.id} elevated className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <TaskCardHeader
                    title={t.title}
                    meta={<DueBadge deadlineAt={t.deadlineAt} now={now} status={t.status} />}
                  />
                </div>
                <Button
                  size="sm"
                  aria-label={`Call dibs on ${t.title}`}
                  onClick={() => claimTask(t.id)}
                >
                  Call dibs
                </Button>
              </Card>
            ))}
            {openTasks.length === 0 && <Notice>No open tasks right now.</Notice>}
          </div>
        </section>

        <section aria-labelledby="mine-heading">
          <SectionHeading id="mine-heading" count={myTasks.length}>
            Your tasks
          </SectionHeading>
          <div className="flex flex-col gap-3">
            {myTasks.map((t) => (
              <Link key={t.id} href={`/task/${t.id}`} className="rounded-[var(--radius-card)]">
                <Card interactive elevated className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <TaskCardHeader
                      title={t.title}
                      meta={<DueBadge deadlineAt={t.deadlineAt} now={now} status={t.status} />}
                      tag={<Tag variant={statusMeta(t.status).tagClass}>{statusLabel(t)}</Tag>}
                    />
                  </div>
                  <ChevronRight
                    size={18}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="shrink-0 text-neutral-500"
                  />
                </Card>
              </Link>
            ))}
            {myTasks.length === 0 && (
              <Notice>You have no tasks yet. Claim one from the open list.</Notice>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

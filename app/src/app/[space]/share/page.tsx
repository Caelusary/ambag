"use client";

import { ShareContent } from "@/components/ShareContent";
import { ShareLinks } from "@/components/ShareLinks";
import { InviteCard } from "@/components/InviteCard";
import { useStore } from "@/lib/store-context";

export default function SharePage() {
  const { tasks, log, members } = useStore();
  return (
    <ShareContent
      tasks={tasks}
      log={log}
      names={members.map((m) => m.name)}
      controls={
        <>
          <InviteCard />
          <ShareLinks />
        </>
      }
    />
  );
}

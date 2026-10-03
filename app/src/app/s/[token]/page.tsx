import { DemoShare } from "@/components/DemoShare";
import { Wordmark } from "@/components/ui/Logo";
import { ShareContent } from "@/components/ShareContent";
import { DEMO_SHARE_TOKEN } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import type { LogEntry, TaskStatus } from "@/lib/types";

interface SharedGroup {
  name: string;
  members: string[];
  tasks: { id: number; status: TaskStatus }[];
  log: { id: number; ts: string; text: string }[];
}

// No generateStaticParams: caching a page per token would grow without bound as people try
// random URLs.
export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: React.ReactNode;
  let subtitle = "Shared read-only view";
  if (token === DEMO_SHARE_TOKEN) {
    body = <DemoShare token={token} />;
  } else {
    // An unknown token and a revoked one both come back null, so tokens can't be probed.
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_shared_group", { p_token: token });
    const shared = data as SharedGroup | null;
    if (shared) {
      subtitle = `${shared.name}, shared read-only`;
      const log: LogEntry[] = shared.log.map((l) => ({ ...l, ts: Date.parse(l.ts) }));
      body = <ShareContent tasks={shared.tasks} log={log} names={shared.members} />;
    } else {
      body = (
        <div className="text-sm text-text">
          This link isn&apos;t valid. It may have been revoked. Ask the group for a new one.
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-dvh w-full justify-center bg-neutral-200 sm:py-10">
      <div className="w-full max-w-[560px] bg-bg sm:my-auto sm:rounded-[var(--radius-card)] sm:shadow-lg lg:max-w-[1000px]">
        <div className="border-b border-neutral-200 px-5 py-5 text-center">
          <Wordmark size="sm" className="justify-center" />
          <div className="mt-0.5 text-xs text-neutral-700">{subtitle}</div>
        </div>
        <div className="p-5">{body}</div>
      </div>
    </div>
  );
}

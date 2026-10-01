import type { ReactNode } from "react";

/** Title, one meta line and a status tag: the top row shared by every task card in a list. */
export function TaskCardHeader({
  title,
  meta,
  tag,
}: {
  title: string;
  meta: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-heading text-[17px] leading-snug text-text">{title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-700">
          {meta}
        </div>
      </div>
      {tag}
    </div>
  );
}

import { MEMBERS } from "@/lib/store";

// One muted pair per member, in roster order, so a face reads the same on every page.
const PALETTE = [
  { bg: "#f4d2b4", fg: "#703a1c" },
  { bg: "#dbe2c9", fg: "#3d4832" },
  { bg: "#f1dfa8", fg: "#6b4f12" },
  { bg: "#e7d4e4", fg: "#5a3555" },
  { bg: "#d3dfe6", fg: "#2f4a5a" },
  { bg: "#ecd2cc", fg: "#7a3329" },
];

const SIZE_CLASS = {
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[13px]",
  lg: "h-9 w-9 text-sm",
};

/** Initial on a colour fixed to the member. Decorative: the name always appears beside it. */
export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZE_CLASS }) {
  const index = MEMBERS.indexOf(name);
  const { bg, fg } = PALETTE[(index === -1 ? name.length : index) % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: bg, color: fg }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-heading leading-none ${SIZE_CLASS[size]}`}
    >
      {name[0]}
    </span>
  );
}

/**
 * The share ring: four equal arcs, one per share of the work, closing into a whole. The arcs sit
 * on a radius-34 circle with round caps and a 32° gap each, so the gaps stay visible at 16px.
 * app/icon.svg draws the same geometry for the favicon.
 */
const ARCS = [
  { d: "M33.52 20.26A34 34 0 0 1 66.48 20.26", color: "#c67139" },
  { d: "M79.74 33.52A34 34 0 0 1 79.74 66.48", color: "#647550" },
  { d: "M66.48 79.74A34 34 0 0 1 33.52 79.74", color: "#dd9563" },
  { d: "M20.26 66.48A34 34 0 0 1 20.26 33.52", color: "#522a15" },
];

export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <g fill="none" strokeWidth="14" strokeLinecap="round">
        {ARCS.map((arc) => (
          <path key={arc.d} d={arc.d} stroke={arc.color} />
        ))}
      </g>
    </svg>
  );
}

const WORDMARK = {
  sm: { mark: 18, text: "text-[15px]", gap: "gap-1.5" },
  md: { mark: 26, text: "text-[24px]", gap: "gap-2" },
  lg: { mark: 34, text: "text-[30px]", gap: "gap-2.5" },
};

/** The ring beside the name. The name is real text, so it reads as "Ambag" to screen readers. */
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof WORDMARK;
  className?: string;
}) {
  const s = WORDMARK[size];
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoMark size={s.mark} />
      <span className={`font-heading leading-none text-text ${s.text}`}>Ambag</span>
    </span>
  );
}

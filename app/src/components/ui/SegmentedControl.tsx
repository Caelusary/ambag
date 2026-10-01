export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Names the group for screen readers, e.g. "Proof type". */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  // aria-pressed is what tells a screen reader which segment is selected; colour alone doesn't.
  return (
    <div
      role="group"
      aria-label={label}
      className="mb-4 flex w-full rounded-[var(--radius-pill)] bg-neutral-200 p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-[var(--radius-pill)] px-3 py-2 text-sm font-semibold transition-colors ${
            value === opt.value ? "bg-accent-500 text-white shadow-sm" : "text-neutral-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

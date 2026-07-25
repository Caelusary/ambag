export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex w-full rounded-[var(--radius-pill)] bg-neutral-200 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
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

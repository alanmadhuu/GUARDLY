import type { ComponentType, InputHTMLAttributes, ReactNode } from "react";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  min?: number;
  step?: number;
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
      {label}
      <input
        className="h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

export function ActionButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <section className="grid gap-4">{children}</section>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
      {children}
    </div>
  );
}

export function ErrorState({ message, details }: { message: string; details?: string[] }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">{message}</p>
      {details && details.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-teal-100 bg-teal-50 p-4 text-sm font-medium text-teal-900">
      {label}
    </div>
  );
}

export function ResultGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function ResultItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-stone-950">{value}</div>
    </div>
  );
}

export function RiskBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const classes = normalized.includes("high")
    ? "bg-red-100 text-red-800"
    : normalized.includes("medium")
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${classes}`}>
      {value}
    </span>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {back && (
        <Link href={back.href} className="no-print mb-3 inline-flex text-sm text-ink-2 hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[13px] font-medium text-ink-2">{eyebrow}</p>}
          <h1 className="font-serif text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("panel", className)}>
      {(title || description) && (
        <div className="border-b border-line px-5 py-4">
          {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          {description && <p className="mt-1 text-[13px] leading-snug text-ink-2">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  name,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & { name: string; label: ReactNode; hint?: ReactNode; wrap?: string };

export function TextField({ label, hint, wrap, className, ...props }: InputProps) {
  return (
    <Field label={label} name={props.name} hint={hint} className={wrap}>
      <input id={props.name} className={cx("input", className)} {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  wrap,
  className,
  rows = 4,
  ...props
}: ComponentProps<"textarea"> & { name: string; label: ReactNode; hint?: ReactNode; wrap?: string }) {
  return (
    <Field label={label} name={props.name} hint={hint} className={wrap}>
      <textarea id={props.name} rows={rows} className={cx("input", className)} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  wrap,
  options,
  blank,
  className,
  ...props
}: ComponentProps<"select"> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  wrap?: string;
  options: Record<string, string> | readonly string[];
  blank?: string;
}) {
  const entries = Array.isArray(options)
    ? options.map((o) => [o, o] as const)
    : Object.entries(options as Record<string, string>);
  return (
    <Field label={label} name={props.name} hint={hint} className={wrap}>
      <select id={props.name} className={cx("input", className)} {...props}>
        {blank !== undefined && <option value="">{blank}</option>}
        {entries.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { name: string; label: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]">
        <input type="checkbox" className="size-4 accent-brand" {...props} />
        {label}
      </label>
      {hint && <p className="hint mt-0">{hint}</p>}
    </div>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cx("grid gap-x-5 gap-y-5", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "ok" | "warn" | "danger";
}) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    brand: "bg-brand-tint text-brand",
    ok: "bg-ok-tint text-ok",
    warn: "bg-warn-tint text-warn",
    danger: "bg-danger-tint text-danger",
  };
  return (
    <span className={cx("inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">{children}</div>}
    </div>
  );
}

/** A scrolling container so wide tables never push the page sideways on a phone. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="panel overflow-x-auto">{children}</div>;
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div>
      <dt className="text-[12px] font-medium tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className={cx("mt-1 text-[15px] break-words", empty ? "text-ink-3" : "text-ink")}>{empty ? "—" : children}</dd>
    </div>
  );
}

export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className="mt-2 font-serif text-[28px] leading-none font-semibold text-ink">{value}</p>
      {sub && <p className="mt-2 text-[13px] text-ink-2">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="panel block p-5 transition-colors hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <div className="panel p-5">{body}</div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "brand" | "ok"; children: ReactNode }) {
  const tones = {
    warn: "border-warn/30 bg-warn-tint text-warn",
    brand: "border-brand/25 bg-brand-tint text-brand",
    ok: "border-ok/30 bg-ok-tint text-ok",
  };
  return <div className={cx("rounded-md border px-4 py-3 text-[14px] leading-relaxed", tones[tone])}>{children}</div>;
}

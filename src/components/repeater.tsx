"use client";

import { useId, useState } from "react";

type Column = { key: string; label: string; type?: "text" | "textarea" | "lines"; placeholder?: string };
type Row = Record<string, string | string[]>;

/**
 * Edits a list of small records (service times, history, mobile-money codes…).
 * Writes the list as JSON into a hidden input named `name`.
 * `lines` columns become string arrays, one item per line.
 */
export function Repeater({
  name,
  label,
  columns,
  defaultValue = [],
  addLabel = "Add another",
  hint,
}: {
  name: string;
  label: string;
  columns: Column[];
  defaultValue?: Row[];
  addLabel?: string;
  hint?: string;
}) {
  const id = useId();
  const blank = () => Object.fromEntries(columns.map((c) => [c.key, ""])) as Row;
  const [rows, setRows] = useState<Row[]>(defaultValue.length ? defaultValue : [blank()]);

  const toText = (v: Row[string] | undefined) => (Array.isArray(v) ? v.join("\n") : (v ?? ""));

  const serialised = rows
    .map((r) =>
      Object.fromEntries(
        columns.map((c) => {
          const raw = toText(r[c.key]);
          return [
            c.key,
            c.type === "lines"
              ? raw
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : raw.trim(),
          ];
        }),
      ),
    )
    .filter((r) => Object.values(r).some((v) => (Array.isArray(v) ? v.length : v)));

  function update(i: number, key: string, value: string) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, [key]: value } : r)));
  }
  function move(i: number, d: -1 | 1) {
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <fieldset>
      <legend className="label">{label}</legend>
      {hint && <p className="hint mt-0 mb-3">{hint}</p>}
      <input type="hidden" name={name} value={JSON.stringify(serialised)} />
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-md border border-line bg-paper/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{i + 1}</span>
              <span className="flex gap-1 text-[13px]">
                <button type="button" className="px-2 py-1 text-ink-2 hover:text-ink" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`}>
                  ↑
                </button>
                <button type="button" className="px-2 py-1 text-ink-2 hover:text-ink" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move item ${i + 1} down`}>
                  ↓
                </button>
                <button type="button" className="px-2 py-1 text-danger" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  Remove
                </button>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {columns.map((c) => {
                const fid = `${id}-${i}-${c.key}`;
                const wide = c.type === "textarea" || c.type === "lines";
                return (
                  <div key={c.key} className={wide ? "sm:col-span-2" : undefined}>
                    <label htmlFor={fid} className="mb-1 block text-[12px] font-medium text-ink-2">
                      {c.label}
                    </label>
                    {wide ? (
                      <textarea
                        id={fid}
                        rows={c.type === "lines" ? 4 : 3}
                        className="input"
                        placeholder={c.placeholder}
                        value={toText(row[c.key])}
                        onChange={(e) => update(i, c.key, e.target.value)}
                      />
                    ) : (
                      <input
                        id={fid}
                        className="input"
                        placeholder={c.placeholder}
                        value={toText(row[c.key])}
                        onChange={(e) => update(i, c.key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => setRows((rs) => [...rs, blank()])}>
        {addLabel}
      </button>
    </fieldset>
  );
}

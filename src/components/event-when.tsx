"use client";

import { useState } from "react";

import { WEEKDAYS } from "@/lib/constants";

const OPTIONS = [
  { value: "date", label: "On a date", hint: "A one-off, like a conference day. It drops off the site after it passes." },
  { value: "weekly", label: "Every week", hint: "A weekly service. The site always shows the next one." },
  { value: "note", label: "No fixed date yet", hint: "Describe it instead, e.g. “A full week every January”." },
];

export function EventWhen({
  initial,
  date,
  weekday,
  note,
}: {
  initial: string;
  date: string;
  weekday: string;
  note: string;
}) {
  const [when, setWhen] = useState(initial);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">When it happens</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`cursor-pointer rounded-md border p-3 text-[14px] ${when === o.value ? "border-brand bg-brand-tint" : "border-line-strong bg-surface"}`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="when" value={o.value} checked={when === o.value} onChange={() => setWhen(o.value)} className="accent-brand" />
                {o.label}
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-2">{o.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={when === "date" ? "" : "hidden"}>
        <label htmlFor="date" className="label">
          Date
        </label>
        <input id="date" type="date" name="date" defaultValue={date} className="input max-w-xs" />
      </div>
      <div className={when === "weekly" ? "" : "hidden"}>
        <label htmlFor="repeat_weekday" className="label">
          Day of the week
        </label>
        <select id="repeat_weekday" name="repeat_weekday" defaultValue={weekday} className="input max-w-xs">
          <option value="">Choose a day</option>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className={when === "note" ? "" : "hidden"}>
        <label htmlFor="date_note" className="label">
          When
        </label>
        <input id="date_note" name="date_note" defaultValue={note} className="input" placeholder="A full week every January" />
      </div>
    </div>
  );
}

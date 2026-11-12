import type { Metadata } from "next";
import Link from "next/link";

import { Empty, PageHeader, TableWrap, cx } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isMilestoneKind, MILESTONE_KINDS, type MilestoneKind } from "@/lib/constants";
import { day } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Baptisms, weddings & more" };

type Row = {
  id: string;
  kind: MilestoneKind;
  date: string;
  certificate_no: string;
  place: string;
  officiant_name: string;
  ministers: { title: string; full_name: string } | { title: string; full_name: string }[] | null;
  milestone_people: { role: string; name: string; sort: number }[];
};

export default async function MilestonesPage({ searchParams }: { searchParams: Promise<{ kind?: string; year?: string }> }) {
  await requireArea("records");
  const sp = await searchParams;
  const kind = isMilestoneKind(sp.kind) ? sp.kind : null;
  const year = /^\d{4}$/.test(sp.year ?? "") ? sp.year! : "";

  const supabase = await createClient();
  let query = supabase
    .from("milestones")
    .select("id, kind, date, certificate_no, place, officiant_name, ministers(title, full_name), milestone_people(role, name, sort)")
    .order("date", { ascending: false })
    .limit(300);
  if (kind) query = query.eq("kind", kind);
  if (year) query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  const { data } = await query;
  const rows = (data ?? []) as Row[];

  const tab = (k: MilestoneKind | null, label: string) => {
    const u = new URLSearchParams();
    if (k) u.set("kind", k);
    if (year) u.set("year", year);
    const href = u.toString() ? `/milestones?${u}` : "/milestones";
    return (
      <Link
        key={label}
        href={href}
        aria-current={kind === k ? "page" : undefined}
        className={cx(
          "rounded-md px-3 py-2 text-[14px] whitespace-nowrap",
          kind === k ? "bg-brand-tint font-medium text-brand" : "text-ink-2 hover:bg-sunken hover:text-ink",
        )}
      >
        {label}
      </Link>
    );
  };

  const who = (r: Row) => {
    const people = [...r.milestone_people].sort((a, b) => a.sort - b.sort);
    if (r.kind === "wedding") {
      const g = people.find((p) => p.role === "groom")?.name;
      const b = people.find((p) => p.role === "bride")?.name;
      return [g, b].filter(Boolean).join(" & ");
    }
    const primary = MILESTONE_KINDS[r.kind].roles[0].role;
    return people.find((p) => p.role === primary)?.name ?? "";
  };
  const officiant = (r: Row) => {
    const m = Array.isArray(r.ministers) ? r.ministers[0] : r.ministers;
    return m ? [m.title, m.full_name].filter(Boolean).join(" ") : r.officiant_name;
  };

  const thisYear = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="Baptisms, weddings & more"
        description="Each record gets a certificate number and a printable certificate."
        actions={
          <>
            {(Object.keys(MILESTONE_KINDS) as MilestoneKind[]).map((k) => (
              <Link key={k} href={`/milestones/new?kind=${k}`} className={k === (kind ?? "baptism") ? "btn btn-primary" : "btn btn-secondary"}>
                Record {MILESTONE_KINDS[k].label.toLowerCase()}
              </Link>
            ))}
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Type" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {tab(null, "All")}
          {(Object.keys(MILESTONE_KINDS) as MilestoneKind[]).map((k) => tab(k, MILESTONE_KINDS[k].plural))}
        </nav>
        <form className="flex gap-2">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <label htmlFor="year" className="sr-only">
            Year
          </label>
          <select id="year" name="year" defaultValue={year} className="input w-auto">
            <option value="">All years</option>
            {Array.from({ length: thisYear - 2011 }, (_, i) => thisYear - i).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-secondary">Show</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing recorded here yet" />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Who</th>
                <th>Officiated by</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{day(r.date)}</td>
                  <td className="text-ink-2">{MILESTONE_KINDS[r.kind].label}</td>
                  <td className="min-w-[180px]">
                    <Link href={`/milestones/${r.id}`} className="link">
                      {who(r) || "—"}
                    </Link>
                  </td>
                  <td className="text-ink-2">{officiant(r)}</td>
                  <td className="figure text-[13px] whitespace-nowrap">{r.certificate_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}

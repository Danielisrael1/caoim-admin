import Link from "next/link";

import { PageHeader, Section, Stat } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { MILESTONE_KINDS, WEEKDAYS, type MilestoneKind } from "@/lib/constants";
import { monthRange, MONTHS_LONG } from "@/lib/finance";
import { day, money, today } from "@/lib/format";
import { allowed } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const viewer = await requireViewer();
  if (viewer.role === "none") return null;
  const supabase = await createClient();
  const now = today();
  const month = now.slice(0, 7);
  const [from, to] = monthRange(month);
  const year = now.slice(0, 4);

  const can = (a: Parameters<typeof allowed>[1]) => allowed(viewer.role, a);

  const [members, newMembers, milestones, events, finance] = await Promise.all([
    can("records") ? supabase.from("members").select("id", { count: "exact", head: true }).in("status", ["member", "regular"]) : null,
    can("records") ? supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", `${from}T00:00:00Z`) : null,
    can("records")
      ? supabase.from("milestones").select("id, kind, date, milestone_people(role, name, sort)").order("date", { ascending: false }).limit(5)
      : null,
    can("website")
      ? supabase.from("events").select("id, title, date, repeat_weekday, date_note, featured").eq("published", true).or(`date.is.null,date.gte.${now}`).order("date", { nullsFirst: false }).limit(6)
      : null,
    can("finance") ? supabase.rpc("finance_totals", { from_date: from, to_date: to }) : null,
  ]);

  const totals = (finance?.data ?? []) as { kind: string; total: number }[];
  const giving = totals.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.total), 0);
  const spent = totals.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.total), 0);
  const first = viewer.name.split(/\s+/)[0];

  return (
    <>
      <PageHeader title={`Welcome, ${first}`} description={`${MONTHS_LONG[Number(month.slice(5)) - 1]} ${year} at Christ the Alpha & Omega International Ministries.`} />

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {members && <Stat label="Members & regulars" value={members.count ?? 0} href="/members" />}
          {newMembers && <Stat label="Added this month" value={newMembers.count ?? 0} href="/members" />}
          {finance && <Stat label="Giving this month" value={<span className="figure text-[22px]">{money(giving)}</span>} href="/finance/giving" />}
          {finance && <Stat label="Expenses this month" value={<span className="figure text-[22px]">{money(spent)}</span>} href="/finance/expenses" />}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {can("finance") && (
            <Section title="Quick entry">
              <div className="flex flex-wrap gap-2">
                <Link href="/finance/giving/new" className="btn btn-primary">
                  Record giving
                </Link>
                <Link href="/finance/expenses/new" className="btn btn-secondary">
                  Record expense
                </Link>
              </div>
            </Section>
          )}
          {can("records") && (
            <Section title="Quick entry">
              <div className="flex flex-wrap gap-2">
                <Link href="/members/new" className="btn btn-primary">
                  Add member
                </Link>
                <Link href="/milestones/new?kind=baptism" className="btn btn-secondary">
                  Record baptism
                </Link>
                <Link href="/milestones/new?kind=wedding" className="btn btn-secondary">
                  Record wedding
                </Link>
              </div>
            </Section>
          )}

          {events && (
            <Section title="Coming up on the website">
              {(events.data ?? []).length === 0 ? (
                <p className="text-[14px] text-ink-2">
                  No upcoming events.{" "}
                  <Link href="/website/events/new" className="link">
                    Add one
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {events.data!.map((e) => (
                    <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/website/events/${e.id}`} className="link">
                        {e.title}
                      </Link>
                      <span className="text-right text-[13px] text-ink-2">
                        {e.date ? day(e.date) : e.repeat_weekday !== null ? `Every ${WEEKDAYS[e.repeat_weekday]}` : e.date_note}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {milestones && (
            <Section title="Recent baptisms, weddings & more">
              {(milestones.data ?? []).length === 0 ? (
                <p className="text-[14px] text-ink-2">None recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {milestones.data!.map((m) => {
                    const kind = m.kind as MilestoneKind;
                    const people = (m.milestone_people as { role: string; name: string; sort: number }[]).sort((a, b) => a.sort - b.sort);
                    const who =
                      kind === "wedding"
                        ? people.filter((p) => p.role === "groom" || p.role === "bride").map((p) => p.name).join(" & ")
                        : people[0]?.name;
                    return (
                      <li key={m.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Link href={`/milestones/${m.id}`} className="link">
                          {who}
                        </Link>
                        <span className="text-right text-[13px] text-ink-2">
                          {MILESTONE_KINDS[kind].label} · {day(m.date)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

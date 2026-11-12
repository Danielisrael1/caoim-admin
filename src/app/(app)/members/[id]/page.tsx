import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMember } from "@/app/(app)/records-actions";
import { DeleteButton } from "@/components/action-form";
import { Badge, Detail, Notice, PageHeader, Section } from "@/components/ui";
import { getViewer, requireArea } from "@/lib/auth";
import { HOUSEHOLD_ROLE, MARITAL_STATUS, MEMBER_STATUS, MILESTONE_KINDS, type MemberStatus, type MilestoneKind } from "@/lib/constants";
import { age, day, fullName, money } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { allowed } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Member" };

type Milestone = { id: string; kind: MilestoneKind; date: string; certificate_no: string };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  await requireArea("records");
  const viewer = (await getViewer())!;
  const { id } = await params;
  const { added } = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: m } = await supabase.from("members").select("*, households(id, name)").eq("id", id).maybeSingle();
  if (!m) notFound();

  const [{ data: family }, { data: roles }, giving] = await Promise.all([
    m.household_id
      ? supabase.from("members").select("id, first_name, last_name, other_names, household_role").eq("household_id", m.household_id).neq("id", id).order("date_of_birth")
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; other_names: string; household_role: string | null }[] }),
    supabase.from("milestone_people").select("role, milestones(id, kind, date, certificate_no)").eq("member_id", id),
    allowed(viewer.role, "finance")
      ? supabase.from("contributions").select("amount, date").eq("member_id", id).gte("date", `${new Date().getFullYear()}-01-01`)
      : Promise.resolve(null),
  ]);

  const milestones = (roles ?? [])
    .map((r) => ({ role: r.role as string, m: (Array.isArray(r.milestones) ? r.milestones[0] : r.milestones) as Milestone | null }))
    .filter((r): r is { role: string; m: Milestone } => !!r.m)
    .sort((a, b) => a.m.date.localeCompare(b.m.date));
  const household = (Array.isArray(m.households) ? m.households[0] : m.households) as { id: string; name: string } | null;
  const yearTotal = giving?.data?.reduce((s, g) => s + Number(g.amount), 0) ?? 0;
  const years = age(m.date_of_birth);

  return (
    <>
      <PageHeader
        eyebrow={<span className="figure">{m.member_no}</span>}
        title={fullName(m)}
        back={{ href: "/members", label: "Members" }}
        actions={
          <>
            <Link href={`/members/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            <DeleteButton
              action={deleteMember.bind(null, id)}
              label="Delete"
              confirm={`Delete ${fullName(m)} from the register? Their giving and milestone records stay, but lose the link to this person. To keep the record, set their status to Inactive or Transferred instead.`}
            />
          </>
        }
      />

      <div className="space-y-6">
        {added && <Notice tone="ok">Added to the register as {m.member_no}.</Notice>}

        <div className="flex flex-wrap gap-2">
          <Badge tone={m.status === "member" ? "ok" : "neutral"}>{MEMBER_STATUS[m.status as MemberStatus]}</Badge>
          <Badge>{m.branch}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Section title="Details">
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label="Sex">{m.gender === "male" ? "Male" : m.gender === "female" ? "Female" : ""}</Detail>
                <Detail label="Date of birth">{m.date_of_birth ? `${day(m.date_of_birth)} (${years})` : ""}</Detail>
                <Detail label="Marital status">{m.marital_status ? MARITAL_STATUS[m.marital_status as keyof typeof MARITAL_STATUS] : ""}</Detail>
                <Detail label="Occupation">{m.occupation}</Detail>
                <Detail label="Phone">{[m.phone, m.alt_phone].filter(Boolean).join(" · ")}</Detail>
                <Detail label="Email">{m.email}</Detail>
                <Detail label="Village / area">{m.address}</Detail>
                <Detail label="Emergency contact">{m.emergency_contact}</Detail>
                <Detail label="Date joined">{day(m.date_joined)}</Detail>
                <Detail label="Serves in">{m.department}</Detail>
              </dl>
              {m.notes && <p className="mt-5 border-t border-line pt-4 text-[15px] leading-relaxed whitespace-pre-line">{m.notes}</p>}
            </Section>

            <Section title="Baptism, wedding & other records">
              {milestones.length === 0 ? (
                <p className="text-[14px] text-ink-2">
                  None recorded.{" "}
                  <Link href="/milestones/new?kind=baptism" className="link">
                    Record a baptism
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {milestones.map(({ role, m: ms }) => (
                    <li key={ms.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/milestones/${ms.id}`} className="link">
                        {MILESTONE_KINDS[ms.kind].label}
                        {role === "witness" ? " (witness)" : role === "father" || role === "mother" ? ` (${role})` : ""}
                      </Link>
                      <span className="text-[14px] text-ink-2">
                        {day(ms.date)} · <span className="figure text-[13px]">{ms.certificate_no}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Family">
              {household ? (
                <>
                  <Link href={`/households/${household.id}`} className="link">
                    {household.name}
                  </Link>
                  {m.household_role && <span className="text-[14px] text-ink-2"> · {HOUSEHOLD_ROLE[m.household_role as keyof typeof HOUSEHOLD_ROLE]}</span>}
                  {family && family.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-[14px]">
                      {family.map((f) => (
                        <li key={f.id}>
                          <Link href={`/members/${f.id}`} className="hover:underline">
                            {fullName(f)}
                          </Link>
                          {f.household_role && <span className="text-ink-2"> · {HOUSEHOLD_ROLE[f.household_role as keyof typeof HOUSEHOLD_ROLE]}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-[14px] text-ink-2">Not linked to a family.</p>
              )}
            </Section>

            {giving && (
              <Section title={`Giving in ${new Date().getFullYear()}`}>
                <p className="figure text-[22px]">{money(yearTotal)}</p>
                <p className="mt-1 text-[13px] text-ink-2">
                  {giving.data?.length ?? 0} recorded {giving.data?.length === 1 ? "gift" : "gifts"}.{" "}
                  <Link href={`/finance/giving?member=${m.member_no}`} className="link">
                    See all
                  </Link>
                </p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

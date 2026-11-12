import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMinister } from "@/app/(app)/records-actions";
import { DeleteButton } from "@/components/action-form";
import { Badge, Detail, PageHeader, Section } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { MARITAL_STATUS, MILESTONE_KINDS, MINISTER_STATUS, type MilestoneKind } from "@/lib/constants";
import { age, day, fullName } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minister" };

export default async function MinisterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: m }, { data: officiated }] = await Promise.all([
    supabase.from("ministers").select("*, members(id, member_no, first_name, last_name, other_names)").eq("id", id).maybeSingle(),
    supabase.from("milestones").select("kind").eq("officiant_id", id),
  ]);
  if (!m) notFound();

  const member = (Array.isArray(m.members) ? m.members[0] : m.members) as
    | { id: string; member_no: string; first_name: string; last_name: string; other_names: string }
    | null;
  const counts = (officiated ?? []).reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {});
  const name = [m.title, m.full_name].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader
        eyebrow={m.position}
        title={name}
        back={{ href: "/ministers", label: "Ministers" }}
        actions={
          <>
            <Link href={`/ministers/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            <DeleteButton
              action={deleteMinister.bind(null, id)}
              label="Delete"
              confirm={`Delete ${name}'s record? Ceremonies they officiated keep their name but lose the link. To keep the record, set their status to Retired or Transferred instead.`}
            />
          </>
        }
      />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={m.status === "active" ? "ok" : "neutral"}>{MINISTER_STATUS[m.status as keyof typeof MINISTER_STATUS]}</Badge>
          <Badge>{m.branch}</Badge>
        </div>

        <Section title="Ministry">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail label="Position">{m.position}</Detail>
            <Detail label="Saved on">{day(m.salvation_date)}</Detail>
            <Detail label="Ordained">{[day(m.ordination_date), m.ordained_by && `by ${m.ordained_by}`].filter(Boolean).join(" ")}</Detail>
            <Detail label="Serving since">{day(m.date_started)}</Detail>
            <Detail label="Left / retired">{day(m.date_left)}</Detail>
            <Detail label="Member record">
              {member && (
                <Link href={`/members/${member.id}`} className="link">
                  {fullName(member)} <span className="figure text-[13px]">({member.member_no})</span>
                </Link>
              )}
            </Detail>
            <Detail label="Ceremonies officiated">
              {Object.keys(counts).length
                ? Object.entries(counts)
                    .map(([k, n]) => `${n} ${n === 1 ? MILESTONE_KINDS[k as MilestoneKind].label.toLowerCase() : MILESTONE_KINDS[k as MilestoneKind].plural.toLowerCase()}`)
                    .join(", ")
                : ""}
            </Detail>
          </dl>
        </Section>

        <Section title="Personal">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail label="Sex">{m.gender === "male" ? "Male" : m.gender === "female" ? "Female" : ""}</Detail>
            <Detail label="Date of birth">{m.date_of_birth ? `${day(m.date_of_birth)} (${age(m.date_of_birth)})` : ""}</Detail>
            <Detail label="National ID">{m.national_id && <span className="figure">{m.national_id}</span>}</Detail>
            <Detail label="Marital status">{m.marital_status ? MARITAL_STATUS[m.marital_status as keyof typeof MARITAL_STATUS] : ""}</Detail>
            <Detail label="Spouse">{m.spouse_name}</Detail>
            <Detail label="Children">{m.children_count ?? ""}</Detail>
            <Detail label="Home district">{m.home_district}</Detail>
            <Detail label="Phone">{[m.phone, m.alt_phone].filter(Boolean).join(" · ")}</Detail>
            <Detail label="Email">{m.email}</Detail>
            <Detail label="Lives in">{m.address}</Detail>
          </dl>
        </Section>

        <Section title="Education & training">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Education">{m.education && <span className="whitespace-pre-line">{m.education}</span>}</Detail>
            <Detail label="Theological training">
              {m.theological_training && <span className="whitespace-pre-line">{m.theological_training}</span>}
            </Detail>
          </dl>
        </Section>

        <Section title="Next of kin">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail label="Name">{m.next_of_kin_name}</Detail>
            <Detail label="Relationship">{m.next_of_kin_relationship}</Detail>
            <Detail label="Phone">{m.next_of_kin_phone}</Detail>
          </dl>
        </Section>

        {m.notes && (
          <Section title="Notes">
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{m.notes}</p>
          </Section>
        )}
      </div>
    </>
  );
}

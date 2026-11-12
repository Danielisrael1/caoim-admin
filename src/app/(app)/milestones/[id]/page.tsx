import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMilestone } from "@/app/(app)/records-actions";
import { DeleteButton } from "@/components/action-form";
import { Detail, Notice, PageHeader, Section } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { MILESTONE_KINDS } from "@/lib/constants";
import { longDay } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { loadMilestone } from "@/lib/milestones";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Record" };

export default async function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const ms = await loadMilestone(supabase, id);
  if (!ms) notFound();
  const info = MILESTONE_KINDS[ms.kind];
  const roleLabel = (role: string) => info.roles.find((r) => r.role === role)?.label ?? role;

  return (
    <>
      <PageHeader
        eyebrow={<span className="figure">{ms.certificate_no}</span>}
        title={info.label}
        back={{ href: `/milestones?kind=${ms.kind}`, label: info.plural }}
        actions={
          <>
            <Link href={`/certificate/${id}`} className="btn btn-primary" target="_blank">
              Print certificate
            </Link>
            <Link href={`/milestones/${id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
            <DeleteButton action={deleteMilestone.bind(null, id)} label="Delete" confirm={`Delete ${info.label.toLowerCase()} record ${ms.certificate_no}?`} />
          </>
        }
      />
      <div className="space-y-6">
        {ms.kind === "wedding" && (
          <Notice tone="brand">
            This is the church&apos;s own certificate. The legal marriage certificate is the registrar&apos;s form under the
            Marriage Act, completed and returned to the registrar as usual.
          </Notice>
        )}
        <Section title="Who">
          <ul className="divide-y divide-line">
            {ms.people.map((p, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="text-[13px] font-medium tracking-wide text-ink-3 uppercase">{roleLabel(p.role)}</span>
                {p.member ? (
                  <Link href={`/members/${p.member.id}`} className="link">
                    {p.name} <span className="figure text-[13px]">({p.member.member_no})</span>
                  </Link>
                ) : (
                  <span>{p.name}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Details">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail label="Date">{longDay(ms.date)}</Detail>
            <Detail label="Place">{ms.place}</Detail>
            <Detail label="Officiated by">{ms.officiant}</Detail>
          </dl>
          {ms.notes && <p className="mt-5 border-t border-line pt-4 text-[15px] leading-relaxed whitespace-pre-line">{ms.notes}</p>}
        </Section>
      </div>
    </>
  );
}

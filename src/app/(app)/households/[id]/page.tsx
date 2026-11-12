import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteHousehold, saveHousehold } from "@/app/(app)/records-actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { Grid, PageHeader, Section, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { HOUSEHOLD_ROLE, MEMBER_STATUS, type MemberStatus } from "@/lib/constants";
import { age, fullName } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Family" };

type Household = { name: string; address: string; phone: string; notes: string };

export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  let h: Household = { name: "", address: "", phone: "", notes: "" };
  let people: {
    id: string;
    first_name: string;
    last_name: string;
    other_names: string;
    household_role: string | null;
    date_of_birth: string | null;
    status: string;
  }[] = [];

  if (!isNew) {
    const supabase = await createClient();
    const [{ data }, { data: members }] = await Promise.all([
      supabase.from("households").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("members")
        .select("id, first_name, last_name, other_names, household_role, date_of_birth, status")
        .eq("household_id", id)
        .order("date_of_birth", { ascending: true, nullsFirst: false }),
    ]);
    if (!data) notFound();
    h = data as Household;
    people = members ?? [];
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add family" : h.name}
        back={{ href: "/households", label: "Families" }}
        actions={
          !isNew && (
            <DeleteButton
              action={deleteHousehold.bind(null, id)}
              label="Delete family"
              confirm={`Delete “${h.name}”? The members stay in the register; they just won't be grouped any more.`}
            />
          )
        }
      />
      <div className="space-y-6">
        {!isNew && (
          <Section title="Members of this family">
            {people.length === 0 ? (
              <p className="text-[14px] text-ink-2">No one is linked to this family yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
                    <Link href={`/members/${p.id}`} className="link">
                      {fullName(p)}
                    </Link>
                    <span className="text-[14px] text-ink-2">
                      {[
                        p.household_role ? HOUSEHOLD_ROLE[p.household_role as keyof typeof HOUSEHOLD_ROLE] : null,
                        p.date_of_birth ? `${age(p.date_of_birth)} yrs` : null,
                        p.status !== "member" ? MEMBER_STATUS[p.status as MemberStatus] : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/members/new?household=${id}`} className="btn btn-secondary btn-sm mt-4">
              Add a member to this family
            </Link>
          </Section>
        )}

        <ActionForm action={saveHousehold.bind(null, isNew ? null : id)} submitLabel={isNew ? "Add family" : "Save family details"} cancelHref="/households">
          <Section title={isNew ? undefined : "Family details"}>
            <div className="space-y-5">
              <Grid>
                <TextField label="Family name" name="name" defaultValue={h.name} required placeholder="The Tamale family" />
                <TextField label="Home phone" name="phone" type="tel" defaultValue={h.phone} />
              </Grid>
              <TextField label="Where they live" name="address" defaultValue={h.address} />
              <TextArea label="Notes" name="notes" defaultValue={h.notes} rows={3} />
            </div>
          </Section>
        </ActionForm>
      </div>
    </>
  );
}

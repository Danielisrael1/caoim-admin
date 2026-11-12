import type { Metadata } from "next";

import { ActionForm, DeleteButton } from "@/components/action-form";
import { Grid, Notice, PageHeader, Section, SelectField, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { ROLE_INFO, ROLES, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

import { createUser, deleteUser, resetPassword, setRole } from "./actions";

export const metadata: Metadata = { title: "Users & roles" };

type Search = { updated?: string; removed?: string };

const roleOptions = Object.fromEntries(ROLES.map((r) => [r, ROLE_INFO[r].label]));

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, email, full_name, role, created_at").order("full_name");
  const users = data ?? [];

  return (
    <>
      <PageHeader title="Users & roles" description="Who can sign in, and what each person can see and change." />

      <div className="space-y-6">
        {sp.updated && <Notice tone="ok">Role updated.</Notice>}
        {sp.removed && <Notice tone="ok">Account removed.</Notice>}

        <Section title="What each role can do">
          <dl className="grid gap-4 sm:grid-cols-2">
            {ROLES.filter((r) => r !== "none").map((r) => (
              <div key={r}>
                <dt className="font-medium">{ROLE_INFO[r].label}</dt>
                <dd className="mt-0.5 text-[14px] leading-snug text-ink-2">{ROLE_INFO[r].summary}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="People">
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-medium">
                    {u.full_name || u.email}
                    {u.id === viewer.id && <span className="ml-2 text-[13px] font-normal text-ink-2">(you)</span>}
                  </p>
                  <p className="truncate text-[13px] text-ink-2">
                    {u.email} · added {dateTime(u.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <ActionForm action={setRole.bind(null, u.id)} submitLabel="Change" className="flex flex-wrap items-start gap-2">
                    <label htmlFor={`role-${u.id}`} className="sr-only">
                      Role for {u.email}
                    </label>
                    <select id={`role-${u.id}`} name="role" defaultValue={u.role as Role} className="input w-auto">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_INFO[r].label}
                        </option>
                      ))}
                    </select>
                  </ActionForm>
                  <DeleteButton action={resetPassword.bind(null, u.id)} label="New password" confirm={`Give ${u.email} a new temporary password? Their old password stops working.`} />
                  {u.id !== viewer.id && (
                    <DeleteButton action={deleteUser.bind(null, u.id)} label="Remove" confirm={`Remove ${u.email}'s account? They won't be able to sign in. Records they entered stay.`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Add a person" description="They get a temporary password to sign in with. No email is sent.">
          <ActionForm action={createUser} submitLabel="Create account">
            <Grid cols={3}>
              <TextField label="Name" name="full_name" required />
              <TextField label="Email" name="email" type="email" required autoComplete="off" />
              <SelectField label="Role" name="role" options={roleOptions} defaultValue="editor" />
            </Grid>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}

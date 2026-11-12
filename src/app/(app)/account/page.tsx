import type { Metadata } from "next";

import { changePassword } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Detail, Notice, PageHeader, Section, TextField } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { ROLE_INFO } from "@/lib/roles";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const viewer = await requireViewer();
  const { changed } = await searchParams;

  return (
    <>
      <PageHeader title="My account" />
      <div className="max-w-2xl space-y-6">
        {changed && <Notice tone="ok">Your password has been changed.</Notice>}
        <Section>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Name">{viewer.name}</Detail>
            <Detail label="Email">{viewer.email}</Detail>
            <Detail label="Role">{ROLE_INFO[viewer.role].label}</Detail>
            <Detail label="Can">{ROLE_INFO[viewer.role].summary}</Detail>
          </dl>
        </Section>
        <Section title="Change password" description="At least 10 characters. A short sentence is easier to remember than a jumble.">
          <ActionForm action={changePassword} submitLabel="Change password">
            <TextField label="New password" name="password" type="password" autoComplete="new-password" minLength={10} required />
            <TextField label="Type it again" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}

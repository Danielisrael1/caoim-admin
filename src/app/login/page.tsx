import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { signIn } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Notice, TextField } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (isConfigured && (await getViewer())) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Image src="/logo.png" alt="Christ the Alpha & Omega International Ministries" width={188} height={98} priority className="mb-8 h-auto w-[150px]" />
        <h1 className="font-serif text-[28px] font-semibold">Sign in</h1>
        <p className="mt-2 mb-8 text-[15px] leading-relaxed text-ink-2">
          Church office and website editing for CAOIM. Accounts are created by an administrator.
        </p>

        {!isConfigured ? (
          <Notice>
            This copy isn&apos;t connected to a database yet. Add the Supabase keys to <code>.env.local</code> (see the
            README), then restart.
          </Notice>
        ) : (
          <div className="panel p-6">
            <ActionForm action={signIn} submitLabel="Sign in">
              <input type="hidden" name="next" value={next} />
              <TextField label="Email" name="email" type="email" autoComplete="email" required />
              <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
            </ActionForm>
          </div>
        )}
        <p className="mt-6 text-[13px] leading-relaxed text-ink-2">
          Forgotten your password? Ask an administrator to set a new one for you.
        </p>
      </div>
    </main>
  );
}

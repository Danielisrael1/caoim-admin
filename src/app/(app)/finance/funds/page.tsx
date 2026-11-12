import type { Metadata } from "next";

import { saveFundOrCategory } from "@/app/(app)/finance/actions";
import { ActionForm } from "@/components/action-form";
import { Notice, PageHeader, Section } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { loadCategories, loadFunds, type Named } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Funds & categories" };

function List({ table, items, noun }: { table: "funds" | "expense_categories"; items: Named[]; noun: string }) {
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <ActionForm key={i.id} action={saveFundOrCategory.bind(null, table, i.id)} submitLabel="Save" className="space-y-3 rounded-md border border-line p-3">
          <div className="grid grid-cols-[1fr_80px] gap-3 sm:grid-cols-[1fr_80px_auto] sm:items-end">
            <div>
              <label className="label" htmlFor={`name-${i.id}`}>
                Name
              </label>
              <input id={`name-${i.id}`} name="name" defaultValue={i.name} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor={`sort-${i.id}`}>
                Order
              </label>
              <input id={`sort-${i.id}`} name="sort" type="number" defaultValue={i.sort} className="input" />
            </div>
            <label className="col-span-2 inline-flex min-h-10 items-center gap-2 text-[14px] sm:col-span-1">
              <input type="checkbox" name="active" defaultChecked={i.active} className="size-4 accent-brand" />
              In use
            </label>
          </div>
        </ActionForm>
      ))}
      <ActionForm action={saveFundOrCategory.bind(null, table, null)} submitLabel={`Add ${noun}`} className="space-y-3 rounded-md border border-dashed border-line-strong p-3">
        <label className="label" htmlFor={`new-${table}`}>
          New {noun}
        </label>
        <input id={`new-${table}`} name="name" className="input" required />
      </ActionForm>
    </div>
  );
}

export default async function FundsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireArea("finance");
  const { saved } = await searchParams;
  const supabase = await createClient();
  const [funds, categories] = await Promise.all([loadFunds(supabase), loadCategories(supabase)]);

  return (
    <>
      <PageHeader
        title="Funds & categories"
        description="Funds are what giving goes towards; categories group expenses. Untick “In use” to retire one without losing its history."
      />
      {saved && (
        <div className="mb-5">
          <Notice tone="ok">Saved.</Notice>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Giving funds">
          <List table="funds" items={funds} noun="fund" />
        </Section>
        <Section title="Expense categories">
          <List table="expense_categories" items={categories} noun="category" />
        </Section>
      </div>
    </>
  );
}

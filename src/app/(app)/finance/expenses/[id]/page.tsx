import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteExpense } from "@/app/(app)/finance/actions";
import { DeleteButton } from "@/components/action-form";
import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { loadCategories } from "@/lib/finance";
import { dateTime, money } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

import { ExpenseForm, type ExpenseRow } from "../expense-form";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("finance");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  const supabase = await createClient();
  const categories = await loadCategories(supabase);
  let expense: (ExpenseRow & { created_at?: string }) | null = null;
  if (!isNew) {
    const { data } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    expense = data;
  }

  return (
    <>
      <PageHeader
        title={expense ? money(Number(expense.amount)) : "Record expense"}
        eyebrow={expense?.created_at ? `Recorded ${dateTime(expense.created_at)}` : undefined}
        back={{ href: "/finance/expenses", label: "Expenses" }}
        actions={expense && <DeleteButton action={deleteExpense.bind(null, id)} label="Delete" confirm={`Delete this ${money(Number(expense.amount))} expense?`} />}
      />
      <ExpenseForm expense={expense} categories={categories} />
    </>
  );
}

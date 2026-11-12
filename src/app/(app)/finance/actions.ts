"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionClient } from "@/lib/auth";
import { BRANCHES, PAY_METHOD } from "@/lib/constants";
import { amount, bool, date, dbError, int, memberNoFrom, text, type ActionState } from "@/lib/forms";
import { isUuid } from "@/lib/ids";

const method = (v: string) => (v in PAY_METHOD ? v : "cash");
const branchOf = (v: string) => ((BRANCHES as readonly string[]).includes(v) ? v : "Maya");

async function resolveGiver(supabase: SupabaseClient, label: string) {
  const no = memberNoFrom(label);
  if (!no) return { member_id: null, giver_name: label };
  const { data } = await supabase.from("member_directory").select("id").eq("member_no", no).maybeSingle();
  return { member_id: (data?.id as string | undefined) ?? null, giver_name: label.replace(/\s*\(M-\d+\)\s*$/, "") };
}

// ───────── Giving ─────────

/** Several lines at once — e.g. everything collected at one service. */
export async function recordGiving(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };

  const when = date(fd, "date");
  if (!when) return { error: "Enter the date." };
  const service = text(fd, "service");
  const branch = branchOf(text(fd, "branch"));

  const funds = fd.getAll("fund_id").map(String);
  const amounts = fd.getAll("amount").map(String);
  const methods = fd.getAll("method").map(String);
  const givers = fd.getAll("giver").map((v) => String(v).trim());
  const refs = fd.getAll("reference").map((v) => String(v).trim());

  const rows = [];
  for (let i = 0; i < amounts.length; i++) {
    const raw = amounts[i].trim();
    if (!raw) continue;
    const single = new FormData();
    single.set("a", raw);
    const value = amount(single, "a");
    if (!value) return { error: `Line ${i + 1}: “${raw}” isn't an amount in shillings.` };
    if (!isUuid(funds[i] ?? "")) return { error: `Line ${i + 1}: choose which fund it goes to.` };
    const giver = givers[i] ? await resolveGiver(ctx.supabase, givers[i]) : { member_id: null, giver_name: "" };
    rows.push({
      date: when,
      service,
      branch,
      fund_id: funds[i],
      amount: value,
      method: method(methods[i] ?? "cash"),
      reference: refs[i] ?? "",
      ...giver,
    });
  }
  if (rows.length === 0) return { error: "Enter at least one amount." };

  const { error } = await ctx.supabase.from("contributions").insert(rows);
  if (error) return dbError(error);
  revalidatePath("/finance");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  redirect(`/finance/giving?recorded=${rows.length}&total=${total}`);
}

export async function updateContribution(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };
  const when = date(fd, "date");
  const value = amount(fd, "amount");
  const fund = text(fd, "fund_id");
  if (!when) return { error: "Enter the date." };
  if (!value) return { error: "Enter the amount in shillings." };
  if (!isUuid(fund)) return { error: "Choose a fund." };

  const giverLabel = text(fd, "giver");
  const giver = giverLabel ? await resolveGiver(ctx.supabase, giverLabel) : { member_id: null, giver_name: "" };
  const { error } = await ctx.supabase
    .from("contributions")
    .update({
      date: when,
      amount: value,
      fund_id: fund,
      method: method(text(fd, "method")),
      service: text(fd, "service"),
      branch: branchOf(text(fd, "branch")),
      reference: text(fd, "reference"),
      notes: text(fd, "notes"),
      ...giver,
    })
    .eq("id", id);
  if (error) return dbError(error);
  redirect("/finance/giving");
}

export async function deleteContribution(id: string): Promise<ActionState> {
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("contributions").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/finance/giving");
}

// ───────── Expenses ─────────

export async function saveExpense(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };
  const when = date(fd, "date");
  const value = amount(fd, "amount");
  const category = text(fd, "category_id");
  const description = text(fd, "description");
  if (!when) return { error: "Enter the date." };
  if (!value) return { error: "Enter the amount in shillings." };
  if (!isUuid(category)) return { error: "Choose a category." };
  if (!description) return { error: "Say what the money was spent on." };

  const row = {
    date: when,
    amount: value,
    category_id: category,
    description,
    payee: text(fd, "payee"),
    method: method(text(fd, "method")),
    branch: branchOf(text(fd, "branch")),
    reference: text(fd, "reference"),
    approved_by: text(fd, "approved_by"),
    notes: text(fd, "notes"),
  };
  const { error } = id
    ? await ctx.supabase.from("expenses").update(row).eq("id", id)
    : await ctx.supabase.from("expenses").insert(row);
  if (error) return dbError(error);
  revalidatePath("/finance");
  redirect(id ? "/finance/expenses" : `/finance/expenses?recorded=${value}`);
}

export async function deleteExpense(id: string): Promise<ActionState> {
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("expenses").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/finance/expenses");
}

// ───────── Funds & categories ─────────

export async function saveFundOrCategory(table: "funds" | "expense_categories", id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  if (table !== "funds" && table !== "expense_categories") return { error: "Unknown list." };
  const ctx = await actionClient("finance");
  if (!ctx.ok) return { error: ctx.error };
  const name = text(fd, "name");
  if (!name) return { error: "Enter a name." };
  const row = { name, active: id ? bool(fd, "active") : true, sort: int(fd, "sort") ?? 0 };
  const { error } = id ? await ctx.supabase.from(table).update(row).eq("id", id) : await ctx.supabase.from(table).insert(row);
  if (error) return dbError(error);
  revalidatePath("/finance/funds");
  redirect("/finance/funds?saved=1");
}

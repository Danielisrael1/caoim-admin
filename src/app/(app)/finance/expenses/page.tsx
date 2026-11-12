import type { Metadata } from "next";
import Link from "next/link";

import { Empty, Notice, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { loadCategories, monthRange, MONTHS_LONG } from "@/lib/finance";
import { day, money, num, today } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string; category?: string; recorded?: string }> }) {
  await requireArea("finance");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today().slice(0, 7);
  const supabase = await createClient();
  const categories = await loadCategories(supabase);
  const category = categories.some((c) => c.id === sp.category) ? sp.category! : "";

  const [from, to] = monthRange(month);
  let query = supabase
    .from("expenses")
    .select("id, date, amount, description, payee, category_id, reference")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category_id", category);
  const { data } = await query;
  const rows = data ?? [];
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const [y, m] = month.split("-").map(Number);
  const shift = (d: number) => {
    const dt = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const link = (mo: string) => `/finance/expenses?month=${mo}${category ? `&category=${category}` : ""}`;

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Money paid out, by category."
        actions={
          <Link href="/finance/expenses/new" className="btn btn-primary">
            Record expense
          </Link>
        }
      />
      {sp.recorded && (
        <div className="mb-5">
          <Notice tone="ok">Recorded an expense of {money(Number(sp.recorded) || 0)}.</Notice>
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={link(shift(-1))} className="btn btn-secondary btn-sm" aria-label="Previous month">
            ←
          </Link>
          <h2 className="min-w-[150px] text-center font-medium">
            {MONTHS_LONG[m - 1]} {y}
          </h2>
          <Link href={link(shift(1))} className="btn btn-secondary btn-sm" aria-label="Next month">
            →
          </Link>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="month" value={month} />
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className="input w-auto">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary">Show</button>
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty title="No expenses recorded for this month" />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>What for</th>
                <th>Category</th>
                <th>Paid to</th>
                <th className="text-right">Amount (UGX)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{day(r.date)}</td>
                  <td className="min-w-[180px]">
                    <Link href={`/finance/expenses/${r.id}`} className="link">
                      {r.description}
                    </Link>
                  </td>
                  <td className="text-ink-2">{catName.get(r.category_id)}</td>
                  <td className="text-ink-2">{r.payee}</td>
                  <td className="figure text-right whitespace-nowrap">{num(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="border-t border-line-strong px-4 py-3 font-semibold">
                  Total
                </td>
                <td className="figure border-t border-line-strong px-4 py-3 text-right font-semibold whitespace-nowrap">{num(total)}</td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
      )}
    </>
  );
}

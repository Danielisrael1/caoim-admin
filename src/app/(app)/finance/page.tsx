import type { Metadata } from "next";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { PageHeader, Section, Stat, TableWrap, cx } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { PAY_METHOD, type PayMethod } from "@/lib/constants";
import { loadCategories, loadFunds, MONTHS, MONTHS_LONG } from "@/lib/finance";
import { money, num, today } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Finance reports" };

type Search = { year?: string; month?: string };

function sumBy<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const out = new Map<string, number>();
  for (const r of rows) out.set(key(r), (out.get(key(r)) ?? 0) + value(r));
  return out;
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireArea("finance");
  const sp = await searchParams;
  const now = today();
  const year = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : Number(now.slice(0, 4));
  const month = Number(sp.month) >= 1 && Number(sp.month) <= 12 ? Number(sp.month) : null;

  const supabase = await createClient();
  const [funds, categories, { data: totals }] = await Promise.all([
    loadFunds(supabase),
    loadCategories(supabase),
    supabase.rpc("finance_totals", { from_date: `${year}-01-01`, to_date: `${year}-12-31` }),
  ]);
  const rows = ((totals ?? []) as { kind: string; month: number; key: string; total: number; entries: number }[]).map((r) => ({
    ...r,
    total: Number(r.total),
    entries: Number(r.entries),
  }));
  const of = (kind: string) => rows.filter((r) => r.kind === kind);
  const inPeriod = of("income").filter((r) => !month || r.month === month);
  const outPeriod = of("expense").filter((r) => !month || r.month === month);
  const methodPeriod = of("method").filter((r) => !month || r.month === month);

  const totalIn = inPeriod.reduce((s, r) => s + r.total, 0);
  const totalOut = outPeriod.reduce((s, r) => s + r.total, 0);
  const countIn = inPeriod.reduce((s, r) => s + r.entries, 0);
  const countOut = outPeriod.reduce((s, r) => s + r.entries, 0);

  const byFund = sumBy(inPeriod, (r) => r.key, (r) => r.total);
  const byCategory = sumBy(outPeriod, (r) => r.key, (r) => r.total);
  const byMethod = sumBy(methodPeriod, (r) => r.key, (r) => r.total);
  const inByMonth = sumBy(of("income"), (r) => String(r.month), (r) => r.total);
  const outByMonth = sumBy(of("expense"), (r) => String(r.month), (r) => r.total);
  const yearIn = of("income").reduce((s, r) => s + r.total, 0);
  const yearOut = of("expense").reduce((s, r) => s + r.total, 0);

  const fundRows = funds.map((f) => ({ name: f.name, total: byFund.get(f.id) ?? 0 })).filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
  const catRows = categories.map((c) => ({ name: c.name, total: byCategory.get(c.id) ?? 0 })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const period = month ? `${MONTHS_LONG[month - 1]} ${year}` : String(year);
  const lastMonth = year === Number(now.slice(0, 4)) ? Number(now.slice(5, 7)) : 12;

  const share = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);
  const href = (y: number, m: number | null) => `/finance?year=${y}${m ? `&month=${m}` : ""}`;

  return (
    <>
      <PageHeader
        title="Finance reports"
        description={`Income and spending for ${period}.`}
        actions={<PrintButton label="Print report" />}
      />

      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href(year - 1, month)} className="btn btn-secondary btn-sm" aria-label="Previous year">
            ←
          </Link>
          <span className="figure min-w-[60px] text-center font-medium">{year}</span>
          <Link href={href(year + 1, month)} className="btn btn-secondary btn-sm" aria-label="Next year">
            →
          </Link>
        </div>
        <nav aria-label="Month" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          <Link href={href(year, null)} aria-current={!month ? "page" : undefined} className={cx("rounded-md px-2.5 py-1.5 text-[13px]", !month ? "bg-brand-tint font-medium text-brand" : "text-ink-2 hover:bg-sunken")}>
            Whole year
          </Link>
          {MONTHS.map((label, i) => (
            <Link
              key={label}
              href={href(year, i + 1)}
              aria-current={month === i + 1 ? "page" : undefined}
              className={cx("rounded-md px-2.5 py-1.5 text-[13px]", month === i + 1 ? "bg-brand-tint font-medium text-brand" : "text-ink-2 hover:bg-sunken")}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Giving received" value={<span className="figure text-[24px]">{money(totalIn)}</span>} sub={`${countIn} entries`} />
        <Stat label="Expenses paid" value={<span className="figure text-[24px]">{money(totalOut)}</span>} sub={`${countOut} entries`} />
        <Stat
          label={totalIn - totalOut >= 0 ? "Surplus" : "Shortfall"}
          value={<span className={cx("figure text-[24px]", totalIn - totalOut < 0 && "text-danger")}>{money(Math.abs(totalIn - totalOut))}</span>}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title="Giving by fund">
          {fundRows.length === 0 ? (
            <p className="text-[14px] text-ink-2">Nothing recorded.</p>
          ) : (
            <ul className="space-y-3">
              {fundRows.map((f) => (
                <li key={f.name}>
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span>{f.name}</span>
                    <span className="figure">{num(f.total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-sunken" aria-hidden>
                    <div className="h-full rounded bg-brand" style={{ width: `${share(f.total, totalIn)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {byMethod.size > 0 && (
            <p className="mt-5 border-t border-line pt-3 text-[13px] text-ink-2">
              {[...byMethod.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${PAY_METHOD[k as PayMethod]} ${share(v, totalIn)}%`)
                .join(" · ")}
            </p>
          )}
        </Section>
        <Section title="Expenses by category">
          {catRows.length === 0 ? (
            <p className="text-[14px] text-ink-2">Nothing recorded.</p>
          ) : (
            <ul className="space-y-3">
              {catRows.map((c) => (
                <li key={c.name}>
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span>{c.name}</span>
                    <span className="figure">{num(c.total)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-sunken" aria-hidden>
                    <div className="h-full rounded bg-ink-2" style={{ width: `${share(c.total, totalOut)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold">Month by month, {year}</h2>
      <TableWrap>
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="text-right">Giving (UGX)</th>
              <th className="text-right">Expenses (UGX)</th>
              <th className="text-right">Difference (UGX)</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS_LONG.slice(0, lastMonth).map((label, i) => {
              const a = inByMonth.get(String(i + 1)) ?? 0;
              const b = outByMonth.get(String(i + 1)) ?? 0;
              return (
                <tr key={label} className={month === i + 1 ? "bg-brand-tint/50" : undefined}>
                  <td>
                    <Link href={href(year, i + 1)} className="hover:underline">
                      {label}
                    </Link>
                  </td>
                  <td className="figure text-right">{num(a)}</td>
                  <td className="figure text-right">{num(b)}</td>
                  <td className={cx("figure text-right", a - b < 0 && "text-danger")}>{a - b < 0 ? `−${num(b - a)}` : num(a - b)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="border-t border-line-strong px-4 py-3 font-semibold">Year</td>
              {(() => {
                const a = yearIn;
                const b = yearOut;
                return (
                  <>
                    <td className="figure border-t border-line-strong px-4 py-3 text-right font-semibold">{num(a)}</td>
                    <td className="figure border-t border-line-strong px-4 py-3 text-right font-semibold">{num(b)}</td>
                    <td className={cx("figure border-t border-line-strong px-4 py-3 text-right font-semibold", a - b < 0 && "text-danger")}>
                      {a - b < 0 ? `−${num(b - a)}` : num(a - b)}
                    </td>
                  </>
                );
              })()}
            </tr>
          </tfoot>
        </table>
      </TableWrap>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Empty, Notice, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { PAY_METHOD, type PayMethod } from "@/lib/constants";
import { loadFunds, monthRange, MONTHS_LONG } from "@/lib/finance";
import { day, money, num, today } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Giving" };

type Search = { month?: string; fund?: string; member?: string; recorded?: string; total?: string };

export default async function GivingPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireArea("finance");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today().slice(0, 7);
  const memberNo = /^M-\d+$/.test(sp.member ?? "") ? sp.member! : "";
  const supabase = await createClient();
  const funds = await loadFunds(supabase);
  const fund = funds.some((f) => f.id === sp.fund) ? sp.fund! : "";

  let query = supabase
    .from("contributions")
    .select("id, date, amount, method, giver_name, service, reference, fund_id, member_id")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  let memberName = "";
  if (memberNo) {
    const { data: m } = await supabase.from("member_directory").select("id, first_name, last_name").eq("member_no", memberNo).maybeSingle();
    memberName = m ? `${m.first_name} ${m.last_name}` : "";
    query = query.eq("member_id", m?.id ?? "00000000-0000-0000-0000-000000000000");
  } else {
    const [from, to] = monthRange(month);
    query = query.gte("date", from).lte("date", to);
  }
  if (fund) query = query.eq("fund_id", fund);

  const { data } = await query;
  const rows = data ?? [];
  const fundName = new Map(funds.map((f) => [f.id, f.name]));
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const [y, m] = month.split("-").map(Number);
  const shift = (d: number) => {
    const dt = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const link = (mo: string) => `/finance/giving?month=${mo}${fund ? `&fund=${fund}` : ""}`;

  return (
    <>
      <PageHeader
        title="Giving"
        description="Tithes, offerings and other gifts. Record a whole service's collection in one go."
        actions={
          <Link href="/finance/giving/new" className="btn btn-primary">
            Record giving
          </Link>
        }
      />

      {sp.recorded && (
        <div className="mb-5">
          <Notice tone="ok">
            Recorded {sp.recorded} {sp.recorded === "1" ? "line" : "lines"} totalling {money(Number(sp.total) || 0)}.
          </Notice>
        </div>
      )}

      {memberNo ? (
        <p className="mb-5 text-[15px]">
          All giving by <strong>{memberName || memberNo}</strong>.{" "}
          <Link href="/finance/giving" className="link">
            Show everyone
          </Link>
        </p>
      ) : (
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
            <label htmlFor="fund" className="sr-only">
              Fund
            </label>
            <select id="fund" name="fund" defaultValue={fund} className="input w-auto">
              <option value="">All funds</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary">Show</button>
          </form>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty title="Nothing recorded for this period" />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fund</th>
                <th>From</th>
                <th>Method</th>
                <th className="text-right">Amount (UGX)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/finance/giving/${r.id}`} className="link">
                      {day(r.date)}
                    </Link>
                  </td>
                  <td>{fundName.get(r.fund_id) ?? ""}</td>
                  <td className="min-w-[160px]">
                    {r.giver_name || <span className="text-ink-2">{r.service || "Collection"}</span>}
                    {r.giver_name && r.service && <span className="block text-[13px] text-ink-2">{r.service}</span>}
                  </td>
                  <td className="whitespace-nowrap text-ink-2">
                    {PAY_METHOD[r.method as PayMethod]}
                    {r.reference && <span className="figure block text-[12px]">{r.reference}</span>}
                  </td>
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

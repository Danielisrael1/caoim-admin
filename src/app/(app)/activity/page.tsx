import type { Metadata } from "next";
import Link from "next/link";

import { Empty, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Activity log" };

const TABLES: Record<string, string> = {
  members: "Member",
  households: "Family",
  ministers: "Minister",
  milestones: "Baptism / wedding / dedication / funeral",
  milestone_people: "People in a ceremony",
  contributions: "Giving",
  expenses: "Expense",
  funds: "Fund",
  expense_categories: "Expense category",
  site_settings: "Website settings",
  events: "Website event",
  ministries: "Website ministry",
  leaders: "Website leader",
  programmes: "Website programme",
  profiles: "User account",
};
const ACTIONS: Record<string, string> = { insert: "Added", update: "Changed", delete: "Deleted" };

function describe(table: string, data: Record<string, unknown> | null) {
  if (!data) return "";
  const pick = (...keys: string[]) => keys.map((k) => data[k]).find((v) => typeof v === "string" && v) as string | undefined;
  if (table === "members") return [data.first_name, data.last_name].filter(Boolean).join(" ");
  if (table === "contributions" || table === "expenses") return `UGX ${Number(data.amount).toLocaleString("en-UG")}${data.description ? ` · ${data.description}` : ""}`;
  return pick("name", "full_name", "title", "certificate_no", "email") ?? "";
}

const PAGE = 100;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireArea("admin");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, at, actor_email, table_name, action, old_data, new_data")
    .order("at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Activity log" description="Every change to records, finance and the website, with who made it. Entries can't be edited or deleted." />
      {rows.length === 0 ? (
        <Empty title="No activity yet" />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-[13px] whitespace-nowrap text-ink-2">{dateTime(r.at)}</td>
                  <td className="text-[14px]">{r.actor_email || <span className="text-ink-3">system</span>}</td>
                  <td className="text-[14px]">
                    {ACTIONS[r.action] ?? r.action} {(TABLES[r.table_name] ?? r.table_name).toLowerCase()}
                    {describe(r.table_name, (r.new_data ?? r.old_data) as Record<string, unknown> | null) && (
                      <span className="text-ink-2"> · {describe(r.table_name, (r.new_data ?? r.old_data) as Record<string, unknown> | null)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <nav className="mt-4 flex justify-between" aria-label="Pages">
        {page > 1 ? (
          <Link href={`/activity?page=${page - 1}`} className="btn btn-secondary btn-sm">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {rows.length === PAGE && (
          <Link href={`/activity?page=${page + 1}`} className="btn btn-secondary btn-sm">
            Older →
          </Link>
        )}
      </nav>
    </>
  );
}

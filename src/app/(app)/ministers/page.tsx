import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { MINISTER_STATUS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ministers" };

export default async function MinistersPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireArea("records");
  const { all } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("ministers").select("id, title, full_name, position, branch, phone, status").order("full_name");
  if (!all) query = query.in("status", ["active", "on_leave"]);
  const { data } = await query;
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Ministers"
        description="Pastors, elders and other ministers serving the church, with their personal and ordination details. Only the church secretary and administrators can see this."
        actions={
          <Link href="/ministers/new" className="btn btn-primary">
            Add minister
          </Link>
        }
      />
      <p className="mb-4 text-[14px]">
        {all ? (
          <Link href="/ministers" className="link">
            Show only those serving now
          </Link>
        ) : (
          <Link href="/ministers?all=1" className="link">
            Include retired, transferred and deceased
          </Link>
        )}
      </p>
      {items.length === 0 ? (
        <Empty title="No ministers recorded yet" />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Branch</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td className="min-w-[180px]">
                    <Link href={`/ministers/${m.id}`} className="link">
                      {[m.title, m.full_name].filter(Boolean).join(" ")}
                    </Link>
                  </td>
                  <td>{m.position}</td>
                  <td className="text-ink-2">{m.branch}</td>
                  <td className="whitespace-nowrap">{m.phone}</td>
                  <td>
                    <Badge tone={m.status === "active" ? "ok" : "neutral"}>{MINISTER_STATUS[m.status as keyof typeof MINISTER_STATUS]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}

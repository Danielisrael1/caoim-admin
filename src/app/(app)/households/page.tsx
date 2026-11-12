import type { Metadata } from "next";
import Link from "next/link";

import { Empty, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Families" };

export default async function HouseholdsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireArea("records");
  const { q: raw = "" } = await searchParams;
  const q = raw.replace(/[,()%*\\]/g, " ").trim();
  const supabase = await createClient();
  let query = supabase.from("households").select("id, name, address, phone, members(count)").order("name").limit(500);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Families"
        description="Group members who live together, so you can see a whole family at once."
        actions={
          <Link href="/households/new" className="btn btn-primary">
            Add family
          </Link>
        }
      />
      <form className="mb-5 flex gap-3" role="search">
        <label htmlFor="q" className="sr-only">
          Search families
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search family name" className="input" />
        <button className="btn btn-secondary">Search</button>
      </form>
      {items.length === 0 ? (
        <Empty title={q ? "No family matches" : "No families yet"} />
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Members</th>
                <th>Phone</th>
                <th>Area</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/households/${h.id}`} className="link">
                      {h.name}
                    </Link>
                  </td>
                  <td className="figure">{(h.members as unknown as { count: number }[])[0]?.count ?? 0}</td>
                  <td>{h.phone}</td>
                  <td className="text-ink-2">{h.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}

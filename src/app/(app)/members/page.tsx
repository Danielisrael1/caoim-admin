import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader, TableWrap } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { BRANCHES, MEMBER_STATUS, type MemberStatus } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Members" };

const PAGE = 50;

const statusTone = (s: MemberStatus) =>
  s === "member" ? "ok" : s === "deceased" || s === "inactive" || s === "transferred" ? "neutral" : "brand";

type Search = { q?: string; status?: string; branch?: string; page?: string };

export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireArea("records");
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const status = sp.status && sp.status in MEMBER_STATUS ? sp.status : "";
  const branch = (BRANCHES as readonly string[]).includes(sp.branch ?? "") ? sp.branch! : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("members")
    .select("id, member_no, first_name, last_name, other_names, phone, branch, status, household_id, households(name)", {
      count: "exact",
    })
    .order("last_name")
    .order("first_name")
    .range((page - 1) * PAGE, page * PAGE - 1);

  if (q) {
    // Every word must match a name, phone or member number:
    // or=(and(or(first_name.ilike.*jane*,…),or(first_name.ilike.*doe*,…)))
    const clauses = q
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .map((w) =>
        ["first_name", "last_name", "other_names", "phone", "member_no"].map((c) => `${c}.ilike.*${w}*`).join(","),
      )
      .map((c) => `or(${c})`);
    query = query.or(`and(${clauses.join(",")})`);
  }
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "deceased");
  if (branch) query = query.eq("branch", branch);

  const { data, count, error } = await query;
  const members = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (branch) u.set("branch", branch);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/members?${s}` : "/members";
  };

  return (
    <>
      <PageHeader
        title="Members"
        description="The church register. Deceased members are hidden unless you filter for them."
        actions={
          <Link href="/members/new" className="btn btn-primary">
            Add member
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <label className="sr-only" htmlFor="q">
          Search members
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, phone or member number" className="input" />
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={status} className="input">
          <option value="">All living</option>
          {Object.entries(MEMBER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="branch">
          Branch
        </label>
        <select id="branch" name="branch" defaultValue={branch} className="input">
          <option value="">All branches</option>
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <button className="btn btn-secondary">Search</button>
      </form>

      {error ? (
        <Empty title="Couldn't load members">{error.message}</Empty>
      ) : members.length === 0 ? (
        <Empty title={q || status || branch ? "No one matches" : "No members yet"}>
          {q || status || branch ? (
            <Link href="/members" className="link">
              Clear the search
            </Link>
          ) : (
            "Add the first member to start the register."
          )}
        </Empty>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-ink-2">
            {total.toLocaleString("en-UG")} {total === 1 ? "person" : "people"}
            {pages > 1 && ` · page ${page} of ${pages}`}
          </p>
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>No.</th>
                  <th>Phone</th>
                  <th>Family</th>
                  <th>Branch</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const household = (Array.isArray(m.households) ? m.households[0] : m.households) as { name: string } | null;
                  return (
                    <tr key={m.id}>
                      <td className="min-w-[180px]">
                        <Link href={`/members/${m.id}`} className="link">
                          {fullName(m)}
                        </Link>
                      </td>
                      <td className="figure text-[13px] whitespace-nowrap text-ink-2">{m.member_no}</td>
                      <td className="whitespace-nowrap">{m.phone}</td>
                      <td>
                        {household && m.household_id && (
                          <Link href={`/households/${m.household_id}`} className="text-ink-2 hover:text-ink">
                            {household.name}
                          </Link>
                        )}
                      </td>
                      <td className="text-ink-2">{m.branch}</td>
                      <td>
                        <Badge tone={statusTone(m.status as MemberStatus)}>{MEMBER_STATUS[m.status as MemberStatus]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Pages">
              {page > 1 ? (
                <Link href={qs(page - 1)} className="btn btn-secondary btn-sm">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {page < pages && (
                <Link href={qs(page + 1)} className="btn btn-secondary btn-sm">
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

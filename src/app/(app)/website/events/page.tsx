import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader, TableWrap } from "@/components/ui";
import { WEEKDAYS } from "@/lib/constants";
import { requireArea } from "@/lib/auth";
import { day, today } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Events" };

type EventRow = {
  id: string;
  title: string;
  date: string | null;
  repeat_weekday: number | null;
  date_note: string;
  time_label: string;
  featured: boolean;
  published: boolean;
};

export default async function EventsPage() {
  await requireArea("website");
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, date, repeat_weekday, date_note, time_label, featured, published")
    .order("date", { ascending: true, nullsFirst: false })
    .order("title");
  const events = (data ?? []) as EventRow[];
  const now = today();
  // Past dated events no longer show on the website; list them last.
  const past = (e: EventRow) => !!e.date && e.date < now;
  const sorted = [...events.filter((e) => !past(e)), ...events.filter(past).reverse()];

  return (
    <>
      <PageHeader
        title="Events"
        description="Dated events disappear from the website two days after they happen. Weekly services always show their next date."
        actions={
          <Link href="/website/events/new" className="btn btn-primary">
            Add event
          </Link>
        }
      />
      {sorted.length === 0 ? (
        <Empty title="No events yet">Add the next conference, crusade or service.</Empty>
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>On the website</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/website/events/${e.id}`} className="link">
                      {e.title}
                    </Link>
                    {e.featured && (
                      <span className="ml-2">
                        <Badge tone="brand">Featured</Badge>
                      </span>
                    )}
                  </td>
                  <td className="text-ink-2">
                    {e.date
                      ? day(e.date)
                      : e.repeat_weekday !== null
                        ? `Every ${WEEKDAYS[e.repeat_weekday]}`
                        : e.date_note}
                    {e.time_label && <span className="block text-[13px]">{e.time_label}</span>}
                  </td>
                  <td>
                    {!e.published ? (
                      <Badge>Hidden</Badge>
                    ) : past(e) ? (
                      <Badge tone="warn">Past — not shown</Badge>
                    ) : (
                      <Badge tone="ok">Showing</Badge>
                    )}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cx } from "@/components/ui";

export type NavGroup = { title: string; items: { href: string; label: string }[] };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Links({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Highlight only the most specific match (so /finance doesn't light up on /finance/giving).
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  const best = all.filter((h) => isActive(pathname, h)).sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{g.title}</p>
          <ul>
            {g.items.map((item) => {
              const active = item.href === best;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "relative flex min-h-9 items-center rounded-md px-3 text-[14px] transition-colors",
                      active ? "bg-brand-tint font-medium text-brand" : "text-ink-2 hover:bg-sunken hover:text-ink",
                    )}
                  >
                    {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-gold" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  return <Links groups={groups} />;
}

/** Phone and tablet: a menu button that opens the same links in a sheet. */
export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        Menu
      </button>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col overflow-y-auto border-r border-line bg-surface p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-[17px] font-semibold">CAOIM Admin</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <Links groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

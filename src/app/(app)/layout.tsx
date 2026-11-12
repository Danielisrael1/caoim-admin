import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/app/actions";
import { MobileNav, Sidebar, type NavGroup } from "@/components/nav";
import { requireViewer } from "@/lib/auth";
import { allowed, ROLE_INFO, type Role } from "@/lib/roles";

function navFor(role: Role): NavGroup[] {
  const groups: NavGroup[] = [{ title: "Overview", items: [{ href: "/", label: "Dashboard" }] }];

  if (allowed(role, "website")) {
    groups.push({
      title: "Website · caoim.org",
      items: [
        { href: "/website", label: "Pages & settings" },
        { href: "/website/events", label: "Events" },
        { href: "/website/programmes", label: "Weekly programme" },
        { href: "/website/ministries", label: "Ministries" },
        { href: "/website/leaders", label: "Leaders" },
      ],
    });
  }
  if (allowed(role, "records")) {
    groups.push({
      title: "Church records",
      items: [
        { href: "/members", label: "Members" },
        { href: "/households", label: "Families" },
        { href: "/ministers", label: "Ministers" },
        { href: "/milestones", label: "Baptisms, weddings & more" },
      ],
    });
  }
  if (allowed(role, "finance")) {
    groups.push({
      title: "Finance",
      items: [
        { href: "/finance", label: "Reports" },
        { href: "/finance/giving", label: "Giving" },
        { href: "/finance/expenses", label: "Expenses" },
        { href: "/finance/funds", label: "Funds & categories" },
      ],
    });
  }
  const account = [{ href: "/account", label: "My account" }];
  if (allowed(role, "admin")) {
    account.unshift({ href: "/users", label: "Users & roles" }, { href: "/activity", label: "Activity log" });
  }
  groups.push({ title: "Administration", items: account });
  return groups;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const groups = navFor(viewer.role);

  const userBlock = (
    <div className="border-t border-line pt-4">
      <p className="truncate text-[14px] font-medium text-ink" title={viewer.email}>
        {viewer.name}
      </p>
      <p className="text-[12px] text-ink-2">{ROLE_INFO[viewer.role].label}</p>
      <form action={signOut} className="mt-3">
        <button type="submit" className="btn btn-secondary btn-sm w-full">
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[256px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside className="no-print hidden border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="sticky top-0 flex max-h-dvh flex-1 flex-col gap-6 overflow-y-auto p-4">
          <Link href="/" className="flex items-center gap-3 px-2 pt-2">
            <Image src="/logo.png" alt="" width={72} height={38} className="h-auto w-[56px]" />
            <span className="leading-tight">
              <span className="block font-serif text-[16px] font-semibold">CAOIM</span>
              <span className="block text-[12px] text-ink-2">Church admin</span>
            </span>
          </Link>
          <div className="flex-1">
            <Sidebar groups={groups} />
          </div>
          {userBlock}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={72} height={38} className="h-auto w-[44px]" />
            <span className="font-serif text-[16px] font-semibold">CAOIM Admin</span>
          </Link>
          <MobileNav groups={groups} />
        </header>

        <main id="main" className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {viewer.role === "none" ? <NoAccess email={viewer.email} /> : children}
        </main>
      </div>
    </div>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-[28px] font-semibold">Your account is waiting for access</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        You&apos;re signed in as <strong className="text-ink">{email}</strong>, but no role has been given to this
        account yet. Ask the church administrator to open <em>Users &amp; roles</em> and choose what you should work
        on.
      </p>
    </div>
  );
}

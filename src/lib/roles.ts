// Mirrors public.can(area) in supabase/migrations/0001_init.sql.
// The database is the real gate (row-level security); this only decides what
// the interface shows.

export const ROLES = ["none", "editor", "secretary", "treasurer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type Area = "website" | "records" | "finance" | "directory" | "admin";

const AREAS: Record<Area, readonly Role[]> = {
  website: ["editor", "secretary", "admin"],
  records: ["secretary", "admin"],
  finance: ["treasurer", "admin"],
  directory: ["secretary", "treasurer", "admin"],
  admin: ["admin"],
};

export function allowed(role: Role, area: Area) {
  return AREAS[area].includes(role);
}

export const ROLE_INFO: Record<Role, { label: string; summary: string }> = {
  none: { label: "No access", summary: "Can sign in but sees nothing until a role is given." },
  editor: { label: "Website editor", summary: "Edits caoim.org: events, ministries, leaders, photos, page text." },
  secretary: {
    label: "Church secretary",
    summary: "Members, families, ministers, baptisms, weddings, dedications, funerals, and the website.",
  },
  treasurer: { label: "Treasurer", summary: "Giving, expenses, funds and finance reports." },
  admin: { label: "Administrator", summary: "Everything, plus user accounts and the activity log." },
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

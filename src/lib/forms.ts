// Small helpers for reading <form> submissions in server actions.

export type ActionState = { error: string } | null;

export function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Text or null when blank — for nullable columns with check constraints. */
export function opt(fd: FormData, key: string) {
  return text(fd, key) || null;
}

/** A YYYY-MM-DD date or null. */
export function date(fd: FormData, key: string) {
  const v = text(fd, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function int(fd: FormData, key: string) {
  const v = text(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export function bool(fd: FormData, key: string) {
  return fd.get(key) === "on";
}

/** One item per non-empty line. */
export function lines(fd: FormData, key: string) {
  return text(fd, key)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Paragraphs separated by a blank line. */
export function paragraphs(fd: FormData, key: string) {
  return text(fd, key)
    .split(/\r?\n\s*\r?\n/)
    .map((s) => s.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Shillings typed as "50,000" or "50000". Returns null unless a positive whole number. */
export function amount(fd: FormData, key: string) {
  const v = text(fd, key).replace(/[,\s]/g, "").replace(/^UGX/i, "");
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}

/** JSON written by a <Repeater>. */
export function rows<T>(fd: FormData, key: string): T[] {
  try {
    const parsed = JSON.parse(text(fd, key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** "Jane Doe (M-00012)" → "M-00012" */
export function memberNoFrom(label: string) {
  return label.match(/\((M-\d+)\)\s*$/)?.[1] ?? null;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turn a Postgres/PostgREST error into something a church secretary can act on. */
export function dbError(error: { code?: string; message: string; details?: string | null } | null): ActionState {
  if (!error) return null;
  switch (error.code) {
    case "23505":
      return { error: "Something with that name or number already exists. Use a different one." };
    case "23514":
      return { error: "Some details aren't valid. Check the dates and required fields." };
    case "23503":
      return { error: "This is still linked to other records, so it can't be removed." };
    case "42501":
      return { error: "Your account isn't allowed to make this change." };
    default:
      return { error: `Couldn't save: ${error.message}` };
  }
}

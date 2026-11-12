const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** 1500000 → "UGX 1,500,000" */
export function money(amount: number | null | undefined) {
  return `UGX ${ugx.format(amount ?? 0)}`;
}

/** 1500000 → "1,500,000" */
export function num(amount: number | null | undefined) {
  return ugx.format(amount ?? 0);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const longDateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Kampala",
});

/** "2026-01-13" → "13 Jan 2026" */
export function day(iso: string | null | undefined) {
  if (!iso) return "";
  return dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
}

/** "2026-01-13" → "13 January 2026" */
export function longDay(iso: string | null | undefined) {
  if (!iso) return "";
  return longDateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
}

export function dateTime(iso: string | null | undefined) {
  return iso ? dateTimeFmt.format(new Date(iso)) : "";
}

export function age(dob: string | null | undefined) {
  if (!dob) return null;
  const b = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let a = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

/** Today in Kampala as YYYY-MM-DD. */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala" }).format(new Date());
}

export function fullName(p: { first_name: string; last_name: string; other_names?: string | null }) {
  return [p.first_name, p.other_names, p.last_name].filter(Boolean).join(" ");
}

/** Label used in member pickers; the trailing "(M-00012)" is how forms find the member again. */
export function memberLabel(p: { member_no: string; first_name: string; last_name: string; other_names?: string | null }) {
  return `${fullName(p)} (${p.member_no})`;
}

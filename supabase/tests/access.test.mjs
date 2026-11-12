import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(process.argv[2] ?? new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
const db = new PGlite();

// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
`);

await db.exec(migration);
console.log("✓ migration applied");

const ids = {
  admin: "00000000-0000-0000-0000-00000000000a",
  editor: "00000000-0000-0000-0000-00000000000e",
  secretary: "00000000-0000-0000-0000-00000000000c",
  treasurer: "00000000-0000-0000-0000-00000000000f",
  none: "00000000-0000-0000-0000-000000000000",
};
for (const [role, id] of Object.entries(ids)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, `${role}@test`, { full_name: role }]);
  if (role !== "none") await db.query(`update public.profiles set role = $1 where id = $2`, [role, id]);
}
const { rows: profs } = await db.query(`select email, role from public.profiles order by email`);
console.log("✓ profiles via trigger:", profs.map((p) => `${p.email}=${p.role}`).join(", "));

let failures = 0;
const fundId = (await db.query(`select id from public.funds limit 1`)).rows[0].id;
async function as(role, fn) {
  await db.exec("reset role");
  if (role === "anon") {
    await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
  } else {
    await db.exec(`select set_config('request.jwt.claim.sub', '${ids[role]}', false); set role authenticated;`);
  }
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function expect(label, fn, { fails = false } = {}) {
  try {
    const out = await fn();
    if (fails) {
      failures++;
      console.log(`✗ ${label}: expected an error, got`, out);
    } else console.log(`✓ ${label}`, out ?? "");
  } catch (e) {
    if (fails) console.log(`✓ ${label} (refused: ${e.message.split("\n")[0]})`);
    else {
      failures++;
      console.log(`✗ ${label}: ${e.message}`);
    }
  }
}
const count = async (sql, params) => Number((await db.query(sql, params)).rows[0]?.n ?? (await db.query(sql, params)).rows.length);
function check(cond, label) {
  if (!cond) {
    failures++;
    console.log(`✗ ${label}`);
  } else console.log(`✓ ${label}`);
}

// ── Website content ──
await as("editor", async () => {
  await expect("editor adds a dated event", () =>
    db.query(`insert into events (slug, title, date) values ('youth-day', 'Youth Day', current_date + 10)`));
  await expect("editor adds a weekly event", () =>
    db.query(`insert into events (slug, title, repeat_weekday) values ('sunday', 'Sunday Services', 0)`));
  await expect("editor adds an undated event with a note", () =>
    db.query(`insert into events (slug, title, date_note, featured) values ('believers', 'Believers Conference', 'A full week every January', true)`));
  await expect("event with no date, weekday or note is refused", () =>
    db.query(`insert into events (slug, title) values ('nowhen', 'No when')`), { fails: true });
  await expect("a second featured event is refused", () =>
    db.query(`insert into events (slug, title, date, featured) values ('two', 'Two', current_date, true)`), { fails: true });
  await expect("bad slug is refused", () =>
    db.query(`insert into events (slug, title, date) values ('Bad Slug', 'x', current_date)`), { fails: true });
  await expect("editor hides an old event", () =>
    db.query(`insert into events (slug, title, date) values ('old', 'Old', current_date - 30)`));
  await expect("editor adds a hidden leader", () =>
    db.query(`insert into leaders (name, published) values ('Hidden Person', false)`));
  await expect("editor merges settings", () =>
    db.query(`select merge_site_settings('{"name":"CAOIM test","contact":{"email":"a@b.c"}}'::jsonb)`));
  await expect("editor merges more settings without losing name", async () => {
    await db.query(`select merge_site_settings('{"hero":{"headline":"Hi"}}'::jsonb)`);
    const { rows } = await db.query(`select data->>'name' as name, data->'hero'->>'headline' as h from site_settings`);
    if (rows[0].name !== "CAOIM test" || rows[0].h !== "Hi") throw new Error(JSON.stringify(rows[0]));
  });
  check((await count(`select count(*)::int as n from members`)) === 0, "editor sees no members");
  await expect("editor cannot add a member", () =>
    db.query(`insert into members (first_name, last_name) values ('a','b')`), { fails: true });
  await expect("editor cannot record giving", () =>
    db.query(`insert into contributions (fund_id, amount) values ($1, 1000)`, [fundId]), { fails: true });
  check((await count(`select count(*)::int as n from audit_log`)) === 0, "editor cannot read the activity log");
  await expect("editor uploads to site-media", () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('site-media', 'events/x.jpg')`));
  await expect("editor cannot upload to another bucket", () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('other', 'x.jpg')`), { fails: true });
});

await as("anon", async () => {
  const { rows } = await db.query(`select site_content() as c`);
  const c = rows[0].c;
  const slugs = c.events.map((e) => e.slug).sort();
  check(JSON.stringify(slugs) === JSON.stringify(["believers", "sunday", "youth-day"]), `public site_content events = ${slugs.join(",")} (old + hidden excluded)`);
  check(c.leadership.length === 0, "public site_content hides unpublished leaders");
  check(c.settings.name === "CAOIM test", "public site_content includes settings");
  check(c.events.find((e) => e.slug === "believers").featured === true && !("featured" in c.events.find((e) => e.slug === "sunday")), "featured flag only on the featured event");
  check(c.events.find((e) => e.slug === "sunday").repeatWeekday === 0, "repeatWeekday 0 survives jsonb_strip_nulls");
  await expect("anon cannot read members", () => db.query(`select * from members`), { fails: true });
  await expect("anon cannot read the member directory", () => db.query(`select * from member_directory`), { fails: true });
  await expect("anon cannot change settings", () => db.query(`select merge_site_settings('{"name":"hacked"}'::jsonb)`), { fails: true });
  await expect("anon cannot call finance_totals", () => db.query(`select * from finance_totals('2026-01-01','2026-12-31')`), { fails: true });
  await expect("anon cannot insert events", () => db.query(`insert into events (slug,title,date) values ('x','x',current_date)`), { fails: true });
});

// ── Records ──
let memberId;
await as("secretary", async () => {
  const { rows } = await db.query(`insert into members (first_name, last_name, phone) values ('Jane', 'Nakato', '0772000000') returning id, member_no`);
  memberId = rows[0].id;
  check(/^M-\d{5}$/.test(rows[0].member_no), `member number assigned: ${rows[0].member_no}`);
  await db.query(`insert into members (first_name, last_name) values ('John', 'Ssemanda')`);
  const { rows: m2 } = await db.query(`select member_no from members order by member_no`);
  check(m2.length === 2 && m2[0].member_no < m2[1].member_no, `member numbers increase: ${m2.map((r) => r.member_no).join(", ")}`);

  const { rows: min } = await db.query(`insert into ministers (title, full_name, position) values ('Pr.', 'Robert Tamale', 'Lead Pastor') returning id`);
  const { rows: b1 } = await db.query(`insert into milestones (kind, date, officiant_id) values ('baptism', '2026-03-01', $1) returning id, certificate_no`, [min[0].id]);
  const { rows: b2 } = await db.query(`insert into milestones (kind, date) values ('baptism', '2026-04-01') returning certificate_no`);
  const { rows: w1 } = await db.query(`insert into milestones (kind, date) values ('wedding', '2026-04-01') returning certificate_no`);
  const { rows: b3 } = await db.query(`insert into milestones (kind, date) values ('baptism', '2025-12-01') returning certificate_no`);
  const { rows: b4 } = await db.query(`insert into milestones (kind, date, certificate_no) values ('baptism', '2019-01-01', 'OLD-17') returning certificate_no`);
  check(
    [b1[0].certificate_no, b2[0].certificate_no, w1[0].certificate_no, b3[0].certificate_no, b4[0].certificate_no].join(",") ===
      "BAP-2026-001,BAP-2026-002,WED-2026-001,BAP-2025-001,OLD-17",
    `certificate numbers: ${[b1, b2, w1, b3, b4].map((r) => r[0].certificate_no).join(", ")}`,
  );
  await expect("duplicate certificate number refused", () =>
    db.query(`insert into milestones (kind, date, certificate_no) values ('baptism', '2026-05-01', 'BAP-2026-001')`), { fails: true });
  await expect("secretary links a person to a milestone", () =>
    db.query(`insert into milestone_people (milestone_id, role, member_id, name) values ($1, 'candidate', $2, 'Jane Nakato')`, [b1[0].id, memberId]));
  await expect("secretary cannot record giving", () =>
    db.query(`insert into contributions (fund_id, amount) values ($1, 1000)`, [fundId]), { fails: true });
  check((await count(`select count(*)::int as n from contributions`)) === 0, "secretary sees no giving");
  check((await count(`select count(*)::int as n from member_directory`)) === 2, "secretary sees the directory");
});

// ── Finance ──
await as("treasurer", async () => {
  check((await count(`select count(*)::int as n from members`)) === 0, "treasurer cannot see member details");
  check((await count(`select count(*)::int as n from ministers`)) === 0, "treasurer cannot see ministers");
  const { rows: dir } = await db.query(`select member_no, first_name from member_directory order by member_no`);
  check(dir.length === 2 && !("phone" in dir[0]), "treasurer sees names (no phone) in the directory");
  await expect("treasurer records giving", () =>
    db.query(`insert into contributions (date, fund_id, amount, method, member_id)
              select '2026-03-01', id, 50000, 'mtn_momo', $1 from funds where name = 'Tithe'`, [memberId]));
  await db.query(`insert into contributions (date, fund_id, amount) select '2026-03-08', id, 120000 from funds where name = 'Offering'`);
  await db.query(`insert into contributions (date, fund_id, amount) select '2026-04-08', id, 30000 from funds where name = 'Offering'`);
  await db.query(`insert into expenses (date, category_id, amount, description) select '2026-03-10', id, 40000, 'Power' from expense_categories where name = 'Utilities'`);
  await expect("zero amount refused", () =>
    db.query(`insert into contributions (fund_id, amount) select id, 0 from funds limit 1`), { fails: true });
  const { rows: t } = await db.query(`select kind, month, sum(total)::int as total from finance_totals('2026-01-01','2026-12-31') group by 1,2 order by 1,2`);
  const s = t.map((r) => `${r.kind}:${r.month}=${r.total}`).join(" ");
  check(s === "expense:3=40000 income:3=170000 income:4=30000 method:3=170000 method:4=30000", `finance_totals: ${s}`);
  const { rows: rec } = await db.query(`select recorded_by from contributions limit 1`);
  check(rec[0].recorded_by === ids.treasurer, "recorded_by defaults to the signed-in user");
  await expect("treasurer cannot edit the website", () =>
    db.query(`insert into events (slug,title,date) values ('t','t',current_date)`), { fails: true });
  check((await count(`select count(*)::int as n from profiles`)) === 1, "treasurer sees only their own profile");
  await expect("treasurer cannot promote themselves", async () => {
    await db.query(`update profiles set role = 'admin' where id = $1`, [ids.treasurer]);
    const { rows } = await db.query(`select my_role() as r`);
    if (rows[0].r !== "treasurer") throw new Error("role changed to " + rows[0].r);
  });
});

await as("none", async () => {
  check((await count(`select count(*)::int as n from member_directory`)) === 0, "no-role user sees no directory");
  await expect("no-role user cannot edit the website", () =>
    db.query(`insert into events (slug,title,date) values ('n','n',current_date)`), { fails: true });
});

await as("admin", async () => {
  const n = await count(`select count(*)::int as n from audit_log`);
  check(n > 10, `admin reads the activity log (${n} entries)`);
  const { rows } = await db.query(`select actor_email, table_name, action from audit_log where table_name = 'contributions' limit 1`);
  check(rows[0]?.actor_email === "treasurer@test", `audit records who: ${JSON.stringify(rows[0])}`);
  await expect("admin changes a role", () => db.query(`update profiles set role = 'editor' where id = $1`, [ids.none]));
  await expect("admin cannot edit the audit log", async () => {
    await db.query(`delete from audit_log`);
    const left = await count(`select count(*)::int as n from audit_log`);
    if (left === 0) throw new Error("audit log was deleted");
  });
});

// Deleting a member keeps their giving and ceremony records.
await as("secretary", async () => {
  await db.query(`delete from members where id = $1`, [memberId]);
});
const { rows: kept } = await db.query(`select (select count(*) from contributions where member_id is null)::int as gifts, (select count(*) from milestone_people where name = 'Jane Nakato')::int as people`);
check(kept[0].gifts === 3 && kept[0].people === 1, `deleting a member keeps their records: ${JSON.stringify(kept[0])}`);

console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);

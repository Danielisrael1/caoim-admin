-- CAOIM admin: website content (CMS) + church records + finance.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table has row-level security; access is decided by public.can(area).

-- ───────────────────────── Roles & profiles ─────────────────────────

create type public.app_role as enum ('none', 'editor', 'secretary', 'treasurer', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '',
  role        public.app_role not null default 'none',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Every new auth user gets a profile with no access until an admin grants a role.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.my_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'none'::public.app_role
  )
$$;

-- What each role may touch:
--   website    edit caoim.org content           editor, secretary, admin
--   records    members, families, ministers,     secretary, admin
--              baptisms/weddings/dedications/funerals
--   finance    giving, expenses, funds, reports   treasurer, admin
--   directory  look up member names (to link     secretary, treasurer, admin
--              a gift to a member)
--   admin      users and the activity log        admin
create function public.can(area text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case area
    when 'website'   then public.my_role() in ('editor', 'secretary', 'admin')
    when 'records'   then public.my_role() in ('secretary', 'admin')
    when 'finance'   then public.my_role() in ('treasurer', 'admin')
    when 'directory' then public.my_role() in ('secretary', 'treasurer', 'admin')
    when 'admin'     then public.my_role() = 'admin'
    else false
  end
$$;

alter table public.profiles enable row level security;
create policy "read own profile, admins read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.can('admin'));
create policy "admins update profiles" on public.profiles
  for update to authenticated using (public.can('admin')) with check (public.can('admin'));

-- ───────────────────────── Shared triggers ─────────────────────────

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor        uuid references auth.users (id) on delete set null,
  actor_email  text,
  table_name   text not null,
  row_id       text,
  action       text not null,
  old_data     jsonb,
  new_data     jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy "admins read the activity log" on public.audit_log
  for select to authenticated using (public.can('admin'));

create function public.audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor, actor_email, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    tg_table_name,
    row_data ->> 'id',
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger audit after insert or update or delete on public.profiles
  for each row execute function public.audit();

-- ───────────────────────── Website content (caoim.org) ─────────────────────────

-- One row. `data` mirrors the top-level keys of the website's src/content/site.js
-- (name, tagline, hero, homeWelcome, contact, social, youtube, serviceTimes,
-- about, leadPastors, giving, …) so the site can merge it straight in.
create table public.site_settings (
  id          smallint primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

create table public.leaders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  department  text not null default '',
  bio         text not null default '',
  photo_url   text not null default '',
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.ministries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  audience    text not null default '',
  summary     text not null default '',
  meets       text not null default '',
  details     text[] not null default '{}',
  image_url   text not null default '',
  gallery     text[] not null default '{}',
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  theme           text not null default '',
  -- When it happens: a date, OR a weekday it repeats on, OR a free-text note.
  date            date,
  repeat_weekday  smallint check (repeat_weekday between 0 and 6),  -- 0 = Sunday
  date_note       text not null default '',
  time_label      text not null default '',
  location        text not null default '',
  speakers        text not null default '',
  recurring       text not null default '',
  summary         text not null default '',
  poster_url      text not null default '',
  featured        boolean not null default false,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint events_when check (date is not null or repeat_weekday is not null or date_note <> '')
);
-- Only one event can be featured on the Home page at a time.
create unique index events_one_featured on public.events ((true)) where featured;

create table public.programmes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text not null default '',
  poster_url  text not null default '',
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['site_settings', 'leaders', 'ministries', 'events', 'programmes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
    execute format('create policy "editors manage" on public.%I for all to authenticated using (public.can(''website'')) with check (public.can(''website''))', t);
  end loop;
end $$;

create policy "public reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public reads published" on public.leaders    for select to anon, authenticated using (published);
create policy "public reads published" on public.ministries for select to anon, authenticated using (published);
create policy "public reads published" on public.events     for select to anon, authenticated using (published);
create policy "public reads published" on public.programmes for select to anon, authenticated using (published);

-- Replace one top-level section of the settings (e.g. 'contact') atomically.
create function public.set_site_section(section text, value jsonb)
returns void language sql set search_path = '' as $$
  update public.site_settings
     set data = data || jsonb_build_object(section, value)
   where id = 1
$$;

-- Everything the public website needs, in the same shape as site.js, in one call:
--   POST /rest/v1/rpc/site_content
-- Runs as the caller, so the anon key only ever sees published rows.
create function public.site_content()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'settings', (select data from public.site_settings where id = 1),

    'leadership', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', name, 'department', department, 'bio', bio, 'photo', photo_url
      ) order by sort, name)
      from public.leaders where published
    ), '[]'::jsonb),

    'ministries', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'slug', slug, 'name', name, 'audience', audience, 'summary', summary,
        'meets', meets, 'details', to_jsonb(details), 'image', image_url,
        'gallery', case when cardinality(gallery) > 0 then to_jsonb(gallery) end
      )) order by sort, name)
      from public.ministries where published
    ), '[]'::jsonb),

    -- Past dated events drop off two days after they happen.
    'events', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'slug', slug, 'title', title, 'theme', nullif(theme, ''),
        'date', date, 'dateNote', nullif(date_note, ''), 'repeatWeekday', repeat_weekday,
        'time', nullif(time_label, ''), 'location', nullif(location, ''),
        'speakers', nullif(speakers, ''), 'recurring', nullif(recurring, ''),
        'summary', summary, 'poster', nullif(poster_url, ''),
        'featured', case when featured then true end
      )) order by date nulls last, title)
      from public.events
      where published and (date is null or date >= current_date - 2)
    ), '[]'::jsonb),

    'programmes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', title, 'detail', detail, 'poster', poster_url
      ) order by sort, title)
      from public.programmes where published
    ), '[]'::jsonb)
  )
$$;
grant execute on function public.site_content() to anon, authenticated;

-- Photos and posters for the website. Public read; editors upload.
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true)
  on conflict (id) do nothing;
create policy "editors upload site media" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-media' and public.can('website'));
create policy "editors replace site media" on storage.objects
  for update to authenticated using (bucket_id = 'site-media' and public.can('website'));
create policy "editors delete site media" on storage.objects
  for delete to authenticated using (bucket_id = 'site-media' and public.can('website'));

-- ───────────────────────── Church records ─────────────────────────

create type public.member_status as enum
  ('visitor', 'regular', 'member', 'inactive', 'transferred', 'deceased');

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create sequence public.member_no_seq;

create table public.members (
  id                 uuid primary key default gen_random_uuid(),
  member_no          text not null unique
                       default ('M-' || lpad(nextval('public.member_no_seq')::text, 5, '0')),
  first_name         text not null,
  last_name          text not null,
  other_names        text not null default '',
  gender             text check (gender in ('male', 'female')),
  date_of_birth      date,
  phone              text not null default '',
  alt_phone          text not null default '',
  email              text not null default '',
  address            text not null default '',
  occupation         text not null default '',
  marital_status     text check (marital_status in ('single', 'married', 'widowed', 'divorced', 'separated')),
  household_id       uuid references public.households (id) on delete set null,
  household_role     text check (household_role in ('head', 'spouse', 'child', 'relative', 'other')),
  branch             text not null default 'Maya',
  status             public.member_status not null default 'member',
  date_joined        date,
  department         text not null default '',
  emergency_contact  text not null default '',
  notes              text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index members_name_idx on public.members (last_name, first_name);
create index members_household_idx on public.members (household_id);

create table public.ministers (
  id                         uuid primary key default gen_random_uuid(),
  member_id                  uuid references public.members (id) on delete set null,
  title                      text not null default '',         -- Pr., Rev., Ap., Ev., Bishop, Elder, Deacon
  full_name                  text not null,
  position                   text not null default '',         -- Lead Pastor, Youth Pastor, Overseer …
  branch                     text not null default 'Maya',
  status                     text not null default 'active'
                               check (status in ('active', 'on_leave', 'retired', 'transferred', 'deceased')),
  gender                     text check (gender in ('male', 'female')),
  date_of_birth              date,
  national_id                text not null default '',         -- NIN
  marital_status             text check (marital_status in ('single', 'married', 'widowed', 'divorced', 'separated')),
  spouse_name                text not null default '',
  children_count             integer check (children_count >= 0),
  phone                      text not null default '',
  alt_phone                  text not null default '',
  email                      text not null default '',
  address                    text not null default '',
  home_district              text not null default '',
  education                  text not null default '',
  theological_training       text not null default '',
  salvation_date             date,
  ordination_date            date,
  ordained_by                text not null default '',
  date_started               date,
  date_left                  date,
  next_of_kin_name           text not null default '',
  next_of_kin_relationship   text not null default '',
  next_of_kin_phone          text not null default '',
  notes                      text not null default '',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create type public.milestone_kind as enum ('baptism', 'wedding', 'dedication', 'funeral');

create table public.milestones (
  id              uuid primary key default gen_random_uuid(),
  kind            public.milestone_kind not null,
  date            date not null,
  place           text not null default '',
  officiant_id    uuid references public.ministers (id) on delete set null,
  officiant_name  text not null default '',
  certificate_no  text,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (kind, certificate_no)
);
create index milestones_date_idx on public.milestones (date desc);

-- The people in a milestone: the candidate, the couple and witnesses, the child
-- and parents, the deceased. Linked to a member when they are one; the name is
-- always stored so the record stands on its own.
create table public.milestone_people (
  id            uuid primary key default gen_random_uuid(),
  milestone_id  uuid not null references public.milestones (id) on delete cascade,
  role          text not null check (role in ('candidate', 'groom', 'bride', 'witness', 'child', 'father', 'mother', 'deceased')),
  member_id     uuid references public.members (id) on delete set null,
  name          text not null,
  sort          smallint not null default 0
);
create index milestone_people_member_idx on public.milestone_people (member_id);
create index milestone_people_milestone_idx on public.milestone_people (milestone_id);

-- Certificate numbers like BAP-2026-004, numbered per kind per year.
create function public.number_milestone()
returns trigger language plpgsql set search_path = '' as $$
declare
  prefix text := case new.kind
    when 'baptism' then 'BAP' when 'wedding' then 'WED'
    when 'dedication' then 'DED' when 'funeral' then 'FUN' end;
  yr text := to_char(new.date, 'YYYY');
  n int;
begin
  if new.certificate_no is null or new.certificate_no = '' then
    select coalesce(max(split_part(certificate_no, '-', 3)::int), 0) + 1 into n
      from public.milestones
     where kind = new.kind and certificate_no like prefix || '-' || yr || '-%'
       and split_part(certificate_no, '-', 3) ~ '^\d+$';
    new.certificate_no := prefix || '-' || yr || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
create trigger number_milestone before insert on public.milestones
  for each row execute function public.number_milestone();

do $$
declare t text;
begin
  foreach t in array array['households', 'members', 'ministers', 'milestones', 'milestone_people'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
    execute format('create policy "records staff manage" on public.%I for all to authenticated using (public.can(''records'')) with check (public.can(''records''))', t);
  end loop;
  foreach t in array array['households', 'members', 'ministers', 'milestones'] loop
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Names only, for linking a gift to a giver. The treasurer sees this, not the
-- member's personal details.
create view public.member_directory as
  select id, member_no, first_name, last_name, other_names, branch, status
    from public.members
   where public.can('directory');
revoke all on public.member_directory from anon;
grant select on public.member_directory to authenticated;

-- ───────────────────────── Finance ─────────────────────────

create type public.pay_method as enum ('cash', 'mtn_momo', 'airtel_money', 'bank', 'cheque', 'other');

create table public.funds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null default '',
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Amounts are whole Uganda shillings.
create table public.contributions (
  id           uuid primary key default gen_random_uuid(),
  date         date not null default current_date,
  fund_id      uuid not null references public.funds (id),
  amount       bigint not null check (amount > 0),
  method       public.pay_method not null default 'cash',
  member_id    uuid references public.members (id) on delete set null,
  giver_name   text not null default '',    -- blank = a service collection
  service      text not null default '',
  branch       text not null default 'Maya',
  reference    text not null default '',    -- MoMo transaction ID, receipt no.
  notes        text not null default '',
  recorded_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index contributions_date_idx on public.contributions (date desc);
create index contributions_member_idx on public.contributions (member_id);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  date         date not null default current_date,
  category_id  uuid not null references public.expense_categories (id),
  amount       bigint not null check (amount > 0),
  description  text not null,
  payee        text not null default '',
  method       public.pay_method not null default 'cash',
  branch       text not null default 'Maya',
  reference    text not null default '',
  approved_by  text not null default '',
  notes        text not null default '',
  recorded_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (date desc);

do $$
declare t text;
begin
  foreach t in array array['funds', 'expense_categories', 'contributions', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
    execute format('create policy "finance staff manage" on public.%I for all to authenticated using (public.can(''finance'')) with check (public.can(''finance''))', t);
  end loop;
  foreach t in array array['contributions', 'expenses'] loop
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

insert into public.funds (name, sort) values
  ('Tithe', 1), ('Offering', 2), ('Thanksgiving', 3), ('Seed', 4),
  ('Building fund', 5), ('Missions & outreach', 6);

insert into public.expense_categories (name, sort) values
  ('Allowances & salaries', 1), ('Utilities', 2), ('Building & maintenance', 3),
  ('Outreach & crusades', 4), ('Welfare', 5), ('Transport', 6),
  ('Office & stationery', 7), ('Sound & media', 8), ('Other', 9);

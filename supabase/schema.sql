
-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'user' check (role in ('user','admin')),
  expo_push_token text,
  created_at timestamptz default now()
);

-- Ensure row exists on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user();

-- Items
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Item <-> Tag
create table if not exists public.item_tags (
  item_id uuid references public.items(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

-- Stock Reports
create table if not exists public.stock_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  start_stock integer not null,
  end_stock integer not null,
  sold integer not null,
  revenue numeric(12,2),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Multi-item Stock Report (header + lines)
create table if not exists public.stock_report_batches (
  id uuid primary key default gen_random_uuid(),
  total_revenue numeric(12,2),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.stock_report_lines (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.stock_report_batches(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  start_stock integer not null,
  end_stock integer not null,
  sold integer not null
);

-- View for items with tags + is_low flag
create or replace view public.items_view as
select
  i.*,
  (i.current_stock <= i.low_stock_threshold) as is_low,
  coalesce(array_agg(t.name order by t.name) filter (where t.name is not null), '{}') as tags
from public.items i
left join public.item_tags it on it.item_id = i.id
left join public.tags t on t.id = it.tag_id
group by i.id;

-- RPC: add item with tags csv
create or replace function public.add_item_with_tags(
  p_name text,
  p_sku text,
  p_initial_stock int,
  p_low_stock_threshold int,
  p_tags_csv text
) returns uuid
language plpgsql security definer
as $$
declare
  v_item_id uuid;
  v_tag text;
  v_tag_id uuid;
begin
  insert into public.items (name, sku, current_stock, low_stock_threshold, created_by)
  values (p_name, p_sku, p_initial_stock, p_low_stock_threshold, auth.uid())
  returning id into v_item_id;

  if p_tags_csv is not null then
    foreach v_tag in array string_to_array(p_tags_csv, ',') loop
      v_tag := trim(v_tag);
      if length(v_tag) > 0 then
        insert into public.tags(name) values (v_tag)
        on conflict (name) do update set name = excluded.name
        returning id into v_tag_id;
        insert into public.item_tags(item_id, tag_id) values (v_item_id, v_tag_id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_item_id;
end $$;

-- RPC: record stock report (transactional)
create or replace function public.record_stock_report(
  p_item_id uuid,
  p_start_stock int,
  p_end_stock int,
  p_revenue numeric,
  p_note text
) returns uuid
language plpgsql security definer
as $$
declare
  v_sold int;
  v_id uuid;
begin
  v_sold := greatest(0, p_start_stock - p_end_stock);
  -- Update item stock atomically (subtract sold from current_stock)
  update public.items
  set current_stock = greatest(0, current_stock - v_sold)
  where id = p_item_id;

  insert into public.stock_reports (item_id, start_stock, end_stock, sold, revenue, note, created_by)
  values (p_item_id, p_start_stock, p_end_stock, v_sold, p_revenue, p_note, auth.uid())
  returning id into v_id;

  return v_id;
end $$;

-- RPC: record multi-item stock report
-- p_lines is an array of objects: [{item_id, start_stock, end_stock}]
create or replace function public.record_stock_report_multi(
  p_note text,
  p_total_revenue numeric,
  p_lines jsonb
) returns uuid
language plpgsql security definer
as $$
declare
  v_report_id uuid;
  v_line jsonb;
  v_item_id uuid;
  v_start int;
  v_end int;
  v_sold int;
begin
  insert into public.stock_report_batches (note, total_revenue, created_by)
  values (p_note, p_total_revenue, auth.uid())
  returning id into v_report_id;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    return v_report_id; -- empty report allowed
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_item_id := (v_line->>'item_id')::uuid;
    v_start := coalesce((v_line->>'start_stock')::int, 0);
    v_end := coalesce((v_line->>'end_stock')::int, 0);
    v_sold := greatest(0, v_start - v_end);

    update public.items
    set current_stock = greatest(0, current_stock - v_sold)
    where id = v_item_id;

    insert into public.stock_report_lines (report_id, item_id, start_stock, end_stock, sold)
    values (v_report_id, v_item_id, v_start, v_end, v_sold);
  end loop;

  return v_report_id;
end $$;

-- Report RPC
create or replace function public.reports_between(p_from date, p_to date)
returns table (
  id uuid,
  item_id uuid,
  item_name text,
  start_stock int,
  end_stock int,
  sold int,
  revenue numeric,
  note text,
  created_at timestamptz
)
language sql security definer
as $$
  select r.id, r.item_id, i.name as item_name, r.start_stock, r.end_stock, r.sold, r.revenue, r.note, r.created_at
  from public.stock_reports r
  join public.items i on i.id = r.item_id
  where r.created_at >= p_from::timestamptz
    and r.created_at < (p_to::timestamptz + interval '1 day')
  order by r.created_at desc;
$$;

-- Multi-item Report RPC (flattened rows)
create or replace function public.reports_between_multi(p_from date, p_to date)
returns table (
  report_id uuid,
  line_id uuid,
  item_id uuid,
  item_name text,
  start_stock int,
  end_stock int,
  sold int,
  revenue numeric,
  note text,
  total_revenue numeric,
  created_at timestamptz
)
language sql security definer
as $$
  select b.id as report_id,
         l.id as line_id,
         l.item_id,
         i.name as item_name,
         l.start_stock,
         l.end_stock,
         l.sold,
         l.revenue,
         b.note,
         b.total_revenue,
         b.created_at
  from public.stock_report_batches b
  join public.stock_report_lines l on l.report_id = b.id
  join public.items i on i.id = l.item_id
  where b.created_at >= p_from::timestamptz
    and b.created_at < (p_to::timestamptz + interval '1 day')
  order by b.created_at desc, i.name asc;
$$;

-- RPC: update multi-item stock report
-- p_lines is an array of objects: [{item_id, start_stock, end_stock}]
create or replace function public.update_stock_report_batch(
  p_report_id uuid,
  p_note text,
  p_total_revenue numeric,
  p_lines jsonb
) returns uuid
language plpgsql security definer
as $$
declare
  v_line jsonb;
  v_item_id uuid;
  v_start int;
  v_end int;
  v_sold int;
  v_old_line record;
  v_old_sold int;
begin
  -- First, check if user owns this report
  if not exists (select 1 from public.stock_report_batches where id = p_report_id and created_by = auth.uid()) then
    raise exception 'You can only edit your own reports';
  end if;

  -- Revert previous stock changes for this report
  for v_old_line in 
    select item_id, sold from public.stock_report_lines 
    where report_id = p_report_id
  loop
    -- Add back the previously subtracted stock
    update public.items
    set current_stock = current_stock + v_old_line.sold
    where id = v_old_line.item_id;
  end loop;

  -- Update the report header
  update public.stock_report_batches
  set note = p_note, total_revenue = p_total_revenue
  where id = p_report_id;

  -- Delete all existing lines for this report
  delete from public.stock_report_lines where report_id = p_report_id;

  -- Insert new lines and update stock
  if p_lines is not null and jsonb_array_length(p_lines) > 0 then
    for v_line in select * from jsonb_array_elements(p_lines)
    loop
      v_item_id := (v_line->>'item_id')::uuid;
      v_start := coalesce((v_line->>'start_stock')::int, 0);
      v_end := coalesce((v_line->>'end_stock')::int, 0);
      v_sold := greatest(0, v_start - v_end);

      -- Subtract the new sold amount from current stock
      update public.items
      set current_stock = greatest(0, current_stock - v_sold)
      where id = v_item_id;

      -- Insert the new line
      insert into public.stock_report_lines (report_id, item_id, start_stock, end_stock, sold)
      values (p_report_id, v_item_id, v_start, v_end, v_sold);
    end loop;
  end if;

  return p_report_id;
end $$;

-- RPC: delete multi-item stock report
create or replace function public.delete_stock_report_batch(
  p_report_id uuid
) returns void
language plpgsql security definer
as $$
declare
  v_old_line record;
begin
  -- Check if user owns this report or is admin
  if not exists (
    select 1 from public.stock_report_batches b
    join public.profiles p on p.id = auth.uid()
    where b.id = p_report_id 
    and (b.created_by = auth.uid() or p.role = 'admin')
  ) then
    raise exception 'You can only delete your own reports or admin can delete any report';
  end if;

  -- Revert stock changes before deleting
  for v_old_line in 
    select item_id, sold from public.stock_report_lines 
    where report_id = p_report_id
  loop
    -- Add back the previously subtracted stock
    update public.items
    set current_stock = current_stock + v_old_line.sold
    where id = v_old_line.item_id;
  end loop;

  -- Delete the report (lines will cascade)
  delete from public.stock_report_batches where id = p_report_id;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.stock_reports enable row level security;
alter table public.stock_report_batches enable row level security;
alter table public.stock_report_lines enable row level security;

-- Policies
-- Profiles: users can view themselves; admins can view all
drop policy if exists "profiles select self or admin" on public.profiles;
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles select self or admin"
on public.profiles for select
using (
  id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "profiles update self"
on public.profiles for update
using (id = auth.uid());

-- Items: anyone authenticated can select; insert/update by any authenticated; deletes by admin
drop policy if exists "items select all authed" on public.items;
drop policy if exists "items insert authed" on public.items;
drop policy if exists "items update authed" on public.items;
drop policy if exists "items delete admin" on public.items;
create policy "items select all authed" on public.items for select using (auth.uid() is not null);
create policy "items insert authed" on public.items for insert with check (auth.uid() is not null);
create policy "items update authed" on public.items for update using (auth.uid() is not null);
create policy "items delete admin" on public.items for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Tags & item_tags similar
drop policy if exists "tags select all authed" on public.tags;
drop policy if exists "tags upsert authed" on public.tags;
drop policy if exists "tags update authed" on public.tags;
create policy "tags select all authed" on public.tags for select using (auth.uid() is not null);
create policy "tags upsert authed" on public.tags for insert with check (auth.uid() is not null);
create policy "tags update authed" on public.tags for update using (auth.uid() is not null);

drop policy if exists "item_tags select all authed" on public.item_tags;
drop policy if exists "item_tags upsert authed" on public.item_tags;
drop policy if exists "item_tags delete authed" on public.item_tags;
create policy "item_tags select all authed" on public.item_tags for select using (auth.uid() is not null);
create policy "item_tags upsert authed" on public.item_tags for insert with check (auth.uid() is not null);
create policy "item_tags delete authed" on public.item_tags for delete using (auth.uid() is not null);

-- Stock reports: select all; insert/update own; delete admin
drop policy if exists "stock_reports select all authed" on public.stock_reports;
drop policy if exists "stock_reports insert authed" on public.stock_reports;
drop policy if exists "stock_reports update own" on public.stock_reports;
drop policy if exists "stock_reports delete admin" on public.stock_reports;
create policy "stock_reports select all authed" on public.stock_reports for select using (auth.uid() is not null);
create policy "stock_reports insert authed" on public.stock_reports for insert with check (auth.uid() is not null);
create policy "stock_reports update own" on public.stock_reports for update using (created_by = auth.uid());
create policy "stock_reports delete admin" on public.stock_reports for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Multi-item reports policies
drop policy if exists "stock_report_batches select all authed" on public.stock_report_batches;
drop policy if exists "stock_report_batches insert authed" on public.stock_report_batches;
drop policy if exists "stock_report_batches update own" on public.stock_report_batches;
drop policy if exists "stock_report_batches delete admin" on public.stock_report_batches;
create policy "stock_report_batches select all authed" on public.stock_report_batches for select using (auth.uid() is not null);
create policy "stock_report_batches insert authed" on public.stock_report_batches for insert with check (auth.uid() is not null);
create policy "stock_report_batches update own" on public.stock_report_batches for update using (created_by = auth.uid());
create policy "stock_report_batches delete admin" on public.stock_report_batches for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "stock_report_lines select all authed" on public.stock_report_lines;
drop policy if exists "stock_report_lines insert authed" on public.stock_report_lines;
drop policy if exists "stock_report_lines update own" on public.stock_report_lines;
drop policy if exists "stock_report_lines delete admin" on public.stock_report_lines;
create policy "stock_report_lines select all authed" on public.stock_report_lines for select using (auth.uid() is not null);
create policy "stock_report_lines insert authed" on public.stock_report_lines for insert with check (auth.uid() is not null);
create policy "stock_report_lines update own" on public.stock_report_lines for update using (
  exists (select 1 from public.stock_report_batches b where b.id = report_id and b.created_by = auth.uid())
);
create policy "stock_report_lines delete admin" on public.stock_report_lines for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);


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

-- RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.stock_reports enable row level security;

-- Policies
-- Profiles: users can view themselves; admins can view all
create policy "profiles select self or admin"
on public.profiles for select
using (
  id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "profiles update self"
on public.profiles for update
using (id = auth.uid());

-- Items: anyone authenticated can select; insert/update by any authenticated; deletes by admin
create policy "items select all authed" on public.items for select using (auth.uid() is not null);
create policy "items insert authed" on public.items for insert with check (auth.uid() is not null);
create policy "items update authed" on public.items for update using (auth.uid() is not null);
create policy "items delete admin" on public.items for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Tags & item_tags similar
create policy "tags select all authed" on public.tags for select using (auth.uid() is not null);
create policy "tags upsert authed" on public.tags for insert with check (auth.uid() is not null);
create policy "tags update authed" on public.tags for update using (auth.uid() is not null);

create policy "item_tags select all authed" on public.item_tags for select using (auth.uid() is not null);
create policy "item_tags upsert authed" on public.item_tags for insert with check (auth.uid() is not null);
create policy "item_tags delete authed" on public.item_tags for delete using (auth.uid() is not null);

-- Stock reports: select all; insert/update own; delete admin
create policy "stock_reports select all authed" on public.stock_reports for select using (auth.uid() is not null);
create policy "stock_reports insert authed" on public.stock_reports for insert with check (auth.uid() is not null);
create policy "stock_reports update own" on public.stock_reports for update using (created_by = auth.uid());
create policy "stock_reports delete admin" on public.stock_reports for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

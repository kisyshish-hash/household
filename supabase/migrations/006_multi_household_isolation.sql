-- 여러 가족이 각자의 데이터만 볼 수 있도록 household 단위 격리 추가
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가족',
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

alter table members add column if not exists household_id uuid references households(id) on delete cascade;
alter table house_tasks add column if not exists household_id uuid references households(id) on delete cascade;
alter table weekly_assignments add column if not exists household_id uuid references households(id) on delete cascade;
alter table family_events add column if not exists household_id uuid references households(id) on delete cascade;
alter table event_preparations add column if not exists household_id uuid references households(id) on delete cascade;
alter table gift_history add column if not exists household_id uuid references households(id) on delete cascade;

-- 기존 데이터가 있다면 하나의 기본 가족으로 묶어 둔다.
insert into households (name)
select '기존 가족'
where not exists (select 1 from households);

update members set household_id = (select id from households order by created_at limit 1) where household_id is null;
update house_tasks set household_id = (select id from households order by created_at limit 1) where household_id is null;
update weekly_assignments set household_id = (select id from households order by created_at limit 1) where household_id is null;
update family_events set household_id = (select id from households order by created_at limit 1) where household_id is null;
update event_preparations set household_id = (select id from households order by created_at limit 1) where household_id is null;
update gift_history set household_id = (select id from households order by created_at limit 1) where household_id is null;

create index if not exists idx_members_household_id on members(household_id);
create index if not exists idx_house_tasks_household_id on house_tasks(household_id);
create index if not exists idx_weekly_assignments_household_id on weekly_assignments(household_id);
create index if not exists idx_family_events_household_id on family_events(household_id);
create index if not exists idx_event_preparations_household_id on event_preparations(household_id);
create index if not exists idx_gift_history_household_id on gift_history(household_id);

create or replace function public.user_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id
  from public.members
  where auth_user_id = auth.uid()
    and household_id is not null
$$;

alter table households enable row level security;
alter table members enable row level security;
alter table house_tasks enable row level security;
alter table weekly_assignments enable row level security;
alter table family_events enable row level security;
alter table event_preparations enable row level security;
alter table gift_history enable row level security;

drop policy if exists households_access on households;
create policy households_access on households
  for all
  using (id in (select public.user_household_ids()) or owner_user_id = auth.uid())
  with check (id in (select public.user_household_ids()) or owner_user_id = auth.uid());

drop policy if exists members_access on members;
create policy members_access on members
  for all
  using (household_id in (select public.user_household_ids()) or auth_user_id = auth.uid())
  with check (
    household_id in (select public.user_household_ids())
    or household_id in (select id from public.households where owner_user_id = auth.uid())
  );

drop policy if exists house_tasks_access on house_tasks;
create policy house_tasks_access on house_tasks
  for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

drop policy if exists weekly_assignments_access on weekly_assignments;
create policy weekly_assignments_access on weekly_assignments
  for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

drop policy if exists family_events_access on family_events;
create policy family_events_access on family_events
  for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

drop policy if exists event_preparations_access on event_preparations;
create policy event_preparations_access on event_preparations
  for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

drop policy if exists gift_history_access on gift_history;
create policy gift_history_access on gift_history
  for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

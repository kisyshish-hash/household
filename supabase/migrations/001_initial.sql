-- 가족 구성원
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  preferred_tasks text[] default '{}',
  disliked_tasks text[] default '{}',
  weekly_capacity integer default 5,
  created_at timestamp with time zone default now()
);

-- 집안일 목록
create table if not exists house_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  frequency text default 'weekly',
  preferred_day text,
  difficulty integer default 1,
  estimated_minutes integer default 10,
  required_people integer default 1,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 주간 집안일 배정
create table if not exists weekly_assignments (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  task_id uuid references house_tasks(id) on delete cascade,
  assigned_to uuid references members(id) on delete set null,
  due_date date,
  status text default 'pending',
  ai_reason text,
  created_at timestamp with time zone default now()
);

-- 경조사/가정행사
create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person_name text,
  event_type text,
  event_date date not null,
  repeat_type text default 'yearly',
  importance integer default 3,
  gift_budget_min integer,
  gift_budget_max integer,
  preference_note text,
  created_at timestamp with time zone default now()
);

-- 행사 준비 체크리스트
create table if not exists event_preparations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references family_events(id) on delete cascade,
  preparation_task text not null,
  due_date date,
  assigned_to uuid references members(id) on delete set null,
  status text default 'pending',
  ai_suggestion text,
  created_at timestamp with time zone default now()
);

-- 선물 이력
create table if not exists gift_history (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  event_title text,
  gift_item text,
  price integer,
  reaction text,
  avoid_next_time boolean default false,
  note text,
  created_at timestamp with time zone default now()
);

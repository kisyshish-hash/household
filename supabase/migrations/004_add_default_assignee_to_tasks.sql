-- house_tasks에 주 담당자 컬럼 추가
alter table house_tasks
  add column if not exists default_assigned_to uuid references members(id) on delete set null;

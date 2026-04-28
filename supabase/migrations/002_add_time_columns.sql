-- house_tasks에 시작/종료 시간 컬럼 추가
alter table house_tasks
  add column if not exists start_time time,
  add column if not exists end_time time;

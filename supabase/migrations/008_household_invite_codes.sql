-- 가족 공유를 위한 초대 코드
alter table households
  add column if not exists invite_code text unique;

update households
set invite_code = upper(substr(replace(id::text, '-', ''), 1, 8))
where invite_code is null;

alter table households
  alter column invite_code set not null;

create index if not exists idx_households_invite_code on households(invite_code);

drop policy if exists households_join_by_invite_code on households;
create policy households_join_by_invite_code on households
  for select
  using (auth.uid() is not null);

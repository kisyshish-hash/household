-- 경조사 음력 여부 컬럼 추가
alter table family_events add column if not exists is_lunar boolean default false;

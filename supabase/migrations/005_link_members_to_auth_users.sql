-- 가족 구성원과 Supabase Auth 사용자를 연결
alter table members
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

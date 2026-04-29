-- auth_user_id는 가족 단위에서만 유일하면 된다.
alter table members
  drop constraint if exists members_auth_user_id_key;

create unique index if not exists members_household_auth_user_unique
  on members(household_id, auth_user_id)
  where auth_user_id is not null;

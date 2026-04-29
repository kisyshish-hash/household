-- 초대 코드로 기존 가족에 참여한다.
-- 클라이언트가 다른 가족 household_id를 직접 업데이트하면 RLS에 막히므로,
-- 검증과 구성원 이동을 security definer 함수 안에서 처리한다.
drop policy if exists households_join_by_invite_code on households;

create or replace function public.join_household_by_invite_code(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  current_member_id uuid;
  display_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id into target_household_id
  from public.households
  where invite_code = upper(trim(join_code))
  limit 1;

  if target_household_id is null then
    raise exception 'invalid_invite_code';
  end if;

  select id into current_member_id
  from public.members
  where auth_user_id = auth.uid()
  order by created_at desc
  limit 1;

  if current_member_id is null then
    display_name := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      auth.jwt() ->> 'email',
      '나'
    );

    insert into public.members (household_id, auth_user_id, name, role)
    values (target_household_id, auth.uid(), display_name, '나')
    returning id into current_member_id;
  else
    update public.members
    set household_id = target_household_id
    where id = current_member_id
      and auth_user_id = auth.uid();
  end if;

  return target_household_id;
end;
$$;

grant execute on function public.join_household_by_invite_code(text) to authenticated;

alter table public."User"
add column if not exists "authUserId" uuid;

create unique index if not exists "User_authUserId_key"
on public."User" ("authUserId")
where "authUserId" is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'User_authUserId_fkey'
  ) then
    alter table public."User"
    add constraint "User_authUserId_fkey"
    foreign key ("authUserId")
    references auth.users(id)
    on delete set null;
  end if;
end $$;

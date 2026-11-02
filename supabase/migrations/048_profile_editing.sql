alter table public.profiles
  add column if not exists business_name text;

update public.profiles as profile
set email = account.email
from auth.users as account
where profile.id = account.id
  and account.email is not null
  and profile.email is distinct from account.email;

create or replace function public.sync_confirmed_auth_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_confirmed_auth_email on auth.users;
create trigger sync_confirmed_auth_email
after update of email on auth.users
for each row execute function public.sync_confirmed_auth_email();

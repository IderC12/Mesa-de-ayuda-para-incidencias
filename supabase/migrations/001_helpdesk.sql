-- Ejecutar UNA VEZ en el SQL Editor de Supabase, preferiblemente en un proyecto nuevo.
-- Las tablas hd_* conviven con la tabla usuarios del proyecto original, sin modificarla.
begin;

create table public.hd_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null,
  role text not null default 'requester' check (role in ('admin', 'agent', 'requester')),
  created_at timestamptz not null default now()
);
create table public.hd_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 200),
  active boolean not null default true
);
create unique index hd_categories_name_unique on public.hd_categories (lower(btrim(name)));
create table public.hd_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique not null,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 15 and 5000),
  category_id uuid not null references public.hd_categories(id),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  requester_id uuid not null references public.hd_profiles(id),
  requester_name text not null default '',
  assignee_id uuid references public.hd_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table public.hd_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.hd_tickets(id) on delete cascade,
  author_id uuid not null references public.hd_profiles(id),
  author_name text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.hd_activities (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.hd_tickets(id) on delete cascade,
  actor_name text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
create index hd_tickets_requester on public.hd_tickets(requester_id);
create index hd_tickets_assignee_status on public.hd_tickets(assignee_id, status);
create index hd_tickets_created on public.hd_tickets(created_at desc);
create index hd_tickets_category on public.hd_tickets(category_id);
create index hd_comments_ticket_created on public.hd_comments(ticket_id, created_at);
create index hd_activities_ticket_created on public.hd_activities(ticket_id, created_at);

-- SECURITY DEFINER con search_path vacío impide sustituir objetos mediante otro esquema.
-- El rol se obtiene de una tabla controlada por servidor, nunca de metadata editable del usuario.
create function public.hd_current_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.hd_profiles where id = (select auth.uid()); $$;
create function public.hd_is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.hd_current_role() in ('admin', 'agent'), false); $$;
create function public.hd_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.hd_current_role() = 'admin', false); $$;
create function public.hd_can_read_ticket(target_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.hd_tickets where id = target_id and (requester_id = (select auth.uid()) or public.hd_is_staff())); $$;

create function public.hd_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.hd_profiles(id, name, email)
  values (new.id, left(case when char_length(btrim(coalesce(new.raw_user_meta_data->>'name', ''))) >= 2 then btrim(new.raw_user_meta_data->>'name') else 'Usuario' end, 80), coalesce(new.email, ''));
  return new;
end;
$$;
create trigger hd_on_auth_user_created after insert on auth.users
for each row execute function public.hd_create_profile();
-- Backfill para cuentas que ya existían. No copia roles de otras tablas ni metadata.
insert into public.hd_profiles(id, name, email)
select id, left(case when char_length(btrim(coalesce(raw_user_meta_data->>'name', ''))) >= 2 then btrim(raw_user_meta_data->>'name') else 'Usuario' end, 80), coalesce(email, '') from auth.users;

create function public.hd_guard_ticket() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.requester_id is distinct from auth.uid() then raise exception 'Solo puedes crear tickets para tu propia cuenta.'; end if;
    if not exists(select 1 from public.hd_categories where id = new.category_id and active) then raise exception 'La categoría no está disponible.'; end if;
    select name into new.requester_name from public.hd_profiles where id = auth.uid();
    new.status := 'open'; new.assignee_id := null; new.resolved_at := null;
    new.created_at := now(); new.updated_at := now();
    new.title := btrim(new.title); new.description := btrim(new.description);
  else
    if not public.hd_is_staff() then raise exception 'Solo soporte puede gestionar tickets.'; end if;
    if row(new.id,new.number,new.title,new.description,new.category_id,new.requester_id,new.requester_name,new.created_at)
       is distinct from row(old.id,old.number,old.title,old.description,old.category_id,old.requester_id,old.requester_name,old.created_at)
    then raise exception 'No se pueden modificar los datos originales del ticket.'; end if;
    if new.status <> old.status then
      if not ((old.status='open' and new.status in ('in_progress','resolved'))
        or (old.status='in_progress' and new.status in ('open','resolved'))
        or (old.status='resolved' and new.status in ('in_progress','closed'))
        or (old.status='closed' and new.status='open')) then raise exception 'Cambio de estado no permitido.'; end if;
      new.resolved_at := case when new.status in ('resolved','closed') then coalesce(old.resolved_at, now()) else null end;
    else new.resolved_at := old.resolved_at;
    end if;
    if new.assignee_id is not null and not exists(select 1 from public.hd_profiles where id = new.assignee_id and role in ('agent','admin')) then raise exception 'El responsable debe pertenecer a soporte.'; end if;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;
create trigger hd_guard_ticket before insert or update on public.hd_tickets
for each row execute function public.hd_guard_ticket();

create function public.hd_audit_ticket() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor text; state_label text;
begin
  select name into actor from public.hd_profiles where id=auth.uid();
  actor := coalesce(actor,'Sistema');
  if tg_op='INSERT' then
    insert into public.hd_activities(ticket_id,actor_name,detail) values(new.id,actor,'Creó el ticket');
  else
    if new.status <> old.status then
      state_label := case new.status when 'open' then 'abierto' when 'in_progress' then 'en proceso' when 'resolved' then 'resuelto' else 'cerrado' end;
      insert into public.hd_activities(ticket_id,actor_name,detail) values(new.id,actor,'Cambió el estado a ' || state_label);
    end if;
    if new.assignee_id is distinct from old.assignee_id then
      insert into public.hd_activities(ticket_id,actor_name,detail) values(new.id,actor,'Actualizó la asignación');
    end if;
    if new.priority <> old.priority then
      insert into public.hd_activities(ticket_id,actor_name,detail) values(new.id,actor,'Actualizó la prioridad');
    end if;
  end if;
  return new;
end;
$$;
create trigger hd_audit_ticket after insert or update on public.hd_tickets
for each row execute function public.hd_audit_ticket();

create function public.hd_guard_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ticket_status text;
begin
  if new.author_id is distinct from auth.uid() or not public.hd_can_read_ticket(new.ticket_id) then raise exception 'No tienes acceso a este ticket.'; end if;
  -- Serializa comentario/cierre para impedir comentarios posteriores al cierre.
  select status into ticket_status from public.hd_tickets where id=new.ticket_id for update;
  if ticket_status='closed' then raise exception 'El ticket está cerrado.'; end if;
  select name into new.author_name from public.hd_profiles where id=auth.uid();
  new.body := btrim(new.body); new.created_at := now();
  return new;
end;
$$;
create trigger hd_guard_comment before insert on public.hd_comments
for each row execute function public.hd_guard_comment();

-- Cambiar roles requiere una RPC. El cliente solo tiene UPDATE sobre la columna name.
create function public.hd_set_role(target_id uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(901204);
  if not public.hd_is_admin() then raise exception 'Acceso reservado a administradores.'; end if;
  if target_id = auth.uid() then raise exception 'No puedes cambiar tu propio rol.'; end if;
  if new_role not in ('admin','agent','requester') or new_role is null then raise exception 'Rol no válido.'; end if;
  if not exists(select 1 from public.hd_profiles where id=target_id) then raise exception 'Usuario no encontrado.'; end if;
  if new_role='requester' then
    update public.hd_tickets set assignee_id=null where assignee_id=target_id and status in ('open','in_progress');
  end if;
  update public.hd_profiles set role=new_role where id=target_id;
end;
$$;

alter table public.hd_profiles enable row level security;
alter table public.hd_categories enable row level security;
alter table public.hd_tickets enable row level security;
alter table public.hd_comments enable row level security;
alter table public.hd_activities enable row level security;

create policy hd_profiles_read on public.hd_profiles for select to authenticated using (id=(select auth.uid()) or public.hd_is_staff());
create policy hd_profiles_update_own on public.hd_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy hd_categories_read on public.hd_categories for select to authenticated using (true);
create policy hd_categories_insert on public.hd_categories for insert to authenticated with check (public.hd_is_admin());
create policy hd_categories_update on public.hd_categories for update to authenticated using (public.hd_is_admin()) with check (public.hd_is_admin());
create policy hd_tickets_read on public.hd_tickets for select to authenticated using (requester_id=(select auth.uid()) or public.hd_is_staff());
create policy hd_tickets_insert on public.hd_tickets for insert to authenticated with check (requester_id=(select auth.uid()));
create policy hd_tickets_update on public.hd_tickets for update to authenticated using (public.hd_is_staff()) with check (public.hd_is_staff());
create policy hd_comments_read on public.hd_comments for select to authenticated using (public.hd_can_read_ticket(ticket_id));
create policy hd_comments_insert on public.hd_comments for insert to authenticated with check (author_id=(select auth.uid()) and public.hd_can_read_ticket(ticket_id));
create policy hd_activities_read on public.hd_activities for select to authenticated using (public.hd_can_read_ticket(ticket_id));

-- Revoca permisos amplios que Supabase puede asignar por defecto a tablas nuevas.
revoke all on public.hd_profiles, public.hd_categories, public.hd_tickets, public.hd_comments, public.hd_activities from anon, authenticated;
grant select on public.hd_profiles, public.hd_categories, public.hd_tickets, public.hd_comments, public.hd_activities to authenticated;
grant update(name) on public.hd_profiles to authenticated;
grant insert(name,description,active), update(name,description,active) on public.hd_categories to authenticated;
grant insert(title,description,category_id,priority,requester_id) on public.hd_tickets to authenticated;
grant update(status,priority,assignee_id) on public.hd_tickets to authenticated;
grant insert(ticket_id,author_id,body) on public.hd_comments to authenticated;
grant usage, select on sequence public.hd_tickets_number_seq to authenticated;

revoke all on function public.hd_current_role(), public.hd_is_staff(), public.hd_is_admin(), public.hd_can_read_ticket(uuid), public.hd_set_role(uuid,text), public.hd_create_profile(), public.hd_guard_ticket(), public.hd_audit_ticket(), public.hd_guard_comment() from public, anon, authenticated;
grant execute on function public.hd_current_role(), public.hd_is_staff(), public.hd_is_admin(), public.hd_can_read_ticket(uuid), public.hd_set_role(uuid,text) to authenticated;

insert into public.hd_categories(name,description) values
('Hardware','Equipos, periféricos e impresoras'),
('Software','Aplicaciones, instalaciones y errores'),
('Redes','Internet, Wi-Fi y conectividad'),
('Accesos','Cuentas y permisos de acceso');
commit;

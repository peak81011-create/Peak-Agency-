-- =============================================================================
-- Service client : tickets, messages (avec notes internes) et réponses
-- enregistrées. Statuts : ouvert → en cours → en attente de votre réponse →
-- résolu (rouvrable pendant 7 jours).
-- =============================================================================

insert into public.permissions (key, grp, sort_order) values ('support.manage', 'requests', 225)
on conflict (key) do nothing;
insert into public.role_permissions (role, permission) values ('assistant', 'support.manage')
on conflict (role, permission) do nothing;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  author_id uuid not null references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('createur', 'clipper', 'equipe')),
  category text not null check (category in (
    'paiement', 'clips', 'comptes', 'demande', 'compte', 'mission', 'remuneration', 'autre'
  )),
  subject text not null check (char_length(subject) between 3 and 200),
  status text not null default 'ouvert' check (status in ('ouvert', 'en_cours', 'attente_utilisateur', 'resolu')),
  priority public.priority_level not null default 'normale',
  assigned_to uuid references public.profiles (id) on delete set null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  satisfaction smallint check (satisfaction between 1 and 5),
  satisfaction_comment text check (char_length(satisfaction_comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_author_idx on public.support_tickets (author_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status, created_at);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  attachments jsonb not null default '[]'::jsonb,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

create table public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body_fr text not null default '',
  body_en text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger saved_replies_updated_at before update on public.saved_replies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Statut et premier délai de réponse mis à jour à chaque message
-- ---------------------------------------------------------------------------
create or replace function public.ticket_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  select * into v_ticket from public.support_tickets where id = new.ticket_id for update;
  if new.is_internal then
    return new;
  end if;
  if new.author_id = v_ticket.author_id then
    -- L'utilisateur répond : le ticket repasse à l'équipe.
    update public.support_tickets
    set status = case when status = 'attente_utilisateur' then 'en_cours' else status end
    where id = v_ticket.id and status <> 'resolu';
  else
    -- L'équipe répond : premier délai de réponse, puis attente de l'utilisateur.
    update public.support_tickets
    set first_response_at = coalesce(first_response_at, new.created_at),
        status = case when status = 'resolu' then status else 'attente_utilisateur' end
    where id = v_ticket.id;
  end if;
  return new;
end;
$$;
create trigger ticket_messages_after_insert after insert on public.ticket_messages
  for each row execute function public.ticket_message_after_insert();

-- ---------------------------------------------------------------------------
-- Actions de l'auteur du ticket
-- ---------------------------------------------------------------------------
-- Marquer résolu
create or replace function public.ticket_resolve(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets set status = 'resolu', resolved_at = now()
  where id = p_ticket_id and status <> 'resolu'
    and (author_id = auth.uid() or public.has_permission('support.manage'));
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Rouvrir un ticket résolu depuis moins de 7 jours
create or replace function public.ticket_reopen(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets set status = 'ouvert', resolved_at = null, satisfaction = null, satisfaction_comment = null
  where id = p_ticket_id and author_id = auth.uid() and status = 'resolu' and resolved_at > now() - interval '7 days';
  if not found then
    raise exception 'ticket: réouverture impossible' using errcode = 'P0001';
  end if;
end;
$$;

-- Noter la réponse (ticket résolu)
create or replace function public.ticket_rate(p_ticket_id uuid, p_rating smallint, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'ticket: note invalide' using errcode = 'P0001';
  end if;
  update public.support_tickets
  set satisfaction = p_rating, satisfaction_comment = nullif(left(trim(coalesce(p_comment, '')), 2000), '')
  where id = p_ticket_id and author_id = auth.uid() and status = 'resolu';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Règles d'accès : chacun ses tickets ; l'équipe support voit tout.
-- Les notes internes ne sont jamais lisibles par l'auteur du ticket.
-- ---------------------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.saved_replies enable row level security;

create policy support_tickets_select on public.support_tickets for select to authenticated
  using (author_id = auth.uid() or public.has_permission('support.manage'));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (author_id = auth.uid() and status = 'ouvert' and assigned_to is null
              and first_response_at is null and resolved_at is null and satisfaction is null);
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (public.has_permission('support.manage')) with check (public.has_permission('support.manage'));

create policy ticket_messages_select on public.ticket_messages for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and ((t.author_id = auth.uid() and not is_internal) or public.has_permission('support.manage'))
  ));
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and ((t.author_id = auth.uid() and not is_internal and t.status <> 'resolu')
           or public.has_permission('support.manage'))
  ));

create policy saved_replies_all on public.saved_replies for all to authenticated
  using (public.has_permission('support.manage')) with check (public.has_permission('support.manage'));

grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.ticket_messages to authenticated;
grant select, insert, update, delete on public.saved_replies to authenticated;
grant all on public.support_tickets, public.ticket_messages, public.saved_replies to service_role;
grant usage on sequence public.support_tickets_number_seq to authenticated, service_role;
grant execute on function public.ticket_resolve(uuid), public.ticket_reopen(uuid), public.ticket_rate(uuid, smallint, text)
  to authenticated;
revoke execute on function public.ticket_resolve(uuid), public.ticket_reopen(uuid), public.ticket_rate(uuid, smallint, text),
  public.ticket_message_after_insert() from public, anon;

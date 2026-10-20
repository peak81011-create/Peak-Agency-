-- =============================================================================
-- Phase 3 : cœur de l'agence — vidéos sources, comptes de diffusion, clips,
-- statistiques (relevés datés), demandes, commentaires et pièces jointes.
-- =============================================================================

create type public.video_kind as enum ('fichier', 'lien');
create type public.video_status as enum ('envoi', 'recue', 'en_traitement', 'clips_extraits', 'archivee', 'erreur');
create type public.priority_level as enum ('basse', 'normale', 'haute');
create type public.platform as enum ('tiktok', 'instagram', 'youtube', 'autre');
create type public.account_status as enum ('actif', 'en_croissance', 'bloque', 'abandonne');
create type public.clip_status as enum ('planifie', 'en_montage', 'a_valider', 'valide', 'programme', 'publie', 'rejete');
create type public.request_type as enum ('clip', 'style', 'nouveau_compte', 'modification', 'autre');
create type public.request_status as enum ('nouvelle', 'en_cours', 'terminee', 'refusee');
create type public.stats_source as enum ('manuel', 'csv', 'api');

-- Le client peut-il encore envoyer / demander ? (actif ou délai de grâce)
create or replace function public.client_can_write(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client_id and c.status in ('actif', 'grace'));
$$;

-- Le client voit-il son espace complet ? (actif, grâce ou lecture seule)
create or replace function public.client_unlocked(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client_id and c.status in ('actif', 'grace', 'lecture_seule'));
$$;

-- Le client courant voit cette donnée de son espace (espace débloqué)
create or replace function public.client_sees(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_own_client(p_client_id) and public.client_unlocked(p_client_id);
$$;

-- ---------------------------------------------------------------------------
-- Vidéos sources
-- ---------------------------------------------------------------------------
create table public.source_videos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  title text not null default '',
  kind public.video_kind not null,
  storage_key text,
  url text,
  file_name text,
  size_bytes bigint check (size_bytes >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  recorded_at date,
  notes text not null default '',
  priority public.priority_level not null default 'normale',
  status public.video_status not null default 'recue',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'fichier' and storage_key is not null) or (kind = 'lien' and url is not null))
);
create index source_videos_client_idx on public.source_videos (client_id, created_at desc);
create trigger source_videos_updated_at before update on public.source_videos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Comptes de diffusion (les mots de passe ne sont JAMAIS stockés ici)
-- ---------------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  platform public.platform not null,
  handle text not null,
  url text,
  owner_employee_id uuid references public.profiles (id) on delete set null,
  created_on date,
  status public.account_status not null default 'actif',
  followers_count integer not null default 0 check (followers_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_accounts_client_idx on public.social_accounts (client_id);
create trigger social_accounts_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();

-- Informations internes du compte (jamais visibles par le client)
create table public.social_account_private (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  password_manager_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_account_private_updated_at before update on public.social_account_private
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clips
-- ---------------------------------------------------------------------------
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  source_video_id uuid references public.source_videos (id) on delete set null,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  editor_id uuid references public.profiles (id) on delete set null,
  title text not null,
  hook text not null default '',
  caption text not null default '',
  hashtags text[] not null default '{}',
  start_seconds integer check (start_seconds >= 0),
  end_seconds integer check (end_seconds >= 0),
  storage_key text,
  file_name text,
  thumbnail_path text,
  status public.clip_status not null default 'planifie',
  due_at timestamptz,
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text,
  client_feedback text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_seconds is null or start_seconds is null or end_seconds > start_seconds)
);
create index clips_client_idx on public.clips (client_id, status);
create index clips_editor_idx on public.clips (editor_id, status);
create trigger clips_updated_at before update on public.clips
  for each row execute function public.set_updated_at();

-- Statuts visibles par le client (un clip rejeté en interne ne l'est pas)
create or replace function public.client_visible_clip_status(p_status public.clip_status)
returns boolean
language sql
immutable
as $$
  select p_status <> 'rejete';
$$;

-- ---------------------------------------------------------------------------
-- Relevés de statistiques (historique daté ; source : manuel, csv, api)
-- ---------------------------------------------------------------------------
create table public.clip_stats_snapshots (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips (id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  source public.stats_source not null default 'manuel',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clip_stats_clip_idx on public.clip_stats_snapshots (clip_id, captured_at desc);

create table public.account_stats_snapshots (
  id uuid primary key default gen_random_uuid(),
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  captured_at timestamptz not null default now(),
  followers bigint not null default 0 check (followers >= 0),
  source public.stats_source not null default 'manuel',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index account_stats_account_idx on public.account_stats_snapshots (social_account_id, captured_at desc);

-- Derniers chiffres connus (vues : dernier relevé de chaque clip)
create view public.clip_latest_stats with (security_invoker = true) as
  select distinct on (s.clip_id) s.clip_id, s.views, s.likes, s.comments, s.shares, s.captured_at
  from public.clip_stats_snapshots s
  order by s.clip_id, s.captured_at desc;

-- ---------------------------------------------------------------------------
-- Demandes des clients
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  type public.request_type not null,
  title text not null,
  description text not null default '',
  desired_due_date date,
  status public.request_status not null default 'nouvelle',
  priority public.priority_level not null default 'normale',
  assigned_to uuid references public.profiles (id) on delete set null,
  converted_clip_id uuid references public.clips (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_client_idx on public.requests (client_id, status);
create trigger requests_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Commentaires (fils de discussion) et notes internes
-- entity_type : clip, request, video, client (notes internes de la fiche)
-- client_id est recopié pour appliquer les règles d'accès simplement.
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  entity_type text not null check (entity_type in ('clip', 'request', 'video', 'client')),
  entity_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  attachments jsonb not null default '[]'::jsonb,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entity_type <> 'client' or is_internal)
);
create index comments_entity_idx on public.comments (entity_type, entity_id, created_at);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- Pièces jointes (fichiers légers dans le bucket privé « attachments »)
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null,
  entity_type text not null check (entity_type in ('clip', 'request', 'video', 'client')),
  entity_id uuid not null,
  storage text not null default 'supabase',
  path text not null unique,
  name text not null,
  mime text not null,
  size bigint not null check (size >= 0),
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments (entity_type, entity_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 26214400, null)
on conflict (id) do nothing;

-- Les notes internes de la fiche client deviennent des commentaires internes
-- datés et signés (plusieurs notes, avec leur auteur).
insert into public.comments (client_id, entity_type, entity_id, author_id, body, is_internal, created_at)
select n.client_id, 'client', n.client_id, n.updated_by, n.body, true, n.created_at
from public.client_private_notes n
where length(n.body) between 1 and 5000;
drop table public.client_private_notes;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.source_videos enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_private enable row level security;
alter table public.clips enable row level security;
alter table public.clip_stats_snapshots enable row level security;
alter table public.account_stats_snapshots enable row level security;
alter table public.requests enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;

-- Vidéos sources
create policy source_videos_select on public.source_videos for select to authenticated
  using (public.client_sees(client_id)
         or (public.has_permission('videos.read') and public.staff_can_see_client(client_id)));
create policy source_videos_insert on public.source_videos for insert to authenticated
  with check (
    uploaded_by = auth.uid() and public.has_permission('videos.upload') and (
      (public.is_own_client(client_id) and public.client_can_write(client_id))
      or (public.is_staff() and public.staff_can_see_client(client_id))
    )
  );
create policy source_videos_update on public.source_videos for update to authenticated
  using (public.staff_can_see_client(client_id)
         and (public.has_permission('clips.create') or public.has_permission('clients.update')))
  with check (public.staff_can_see_client(client_id));

-- Comptes de diffusion
create policy social_accounts_select on public.social_accounts for select to authenticated
  using (public.client_sees(client_id)
         or (public.has_permission('accounts.read') and public.staff_can_see_client(client_id)));
create policy social_accounts_write on public.social_accounts for all to authenticated
  using (public.has_permission('accounts.manage') and public.staff_can_see_client(client_id))
  with check (public.has_permission('accounts.manage') and public.staff_can_see_client(client_id));

create policy social_account_private_all on public.social_account_private for all to authenticated
  using (exists (
    select 1 from public.social_accounts a
    where a.id = account_id and public.has_permission('accounts.manage') and public.staff_can_see_client(a.client_id)
  ))
  with check (exists (
    select 1 from public.social_accounts a
    where a.id = account_id and public.has_permission('accounts.manage') and public.staff_can_see_client(a.client_id)
  ));

-- Clips : le client voit les siens (sauf rejetés) ; l'équipe ceux de ses clients
create policy clips_select on public.clips for select to authenticated
  using ((public.client_sees(client_id) and public.client_visible_clip_status(status))
         or (public.has_permission('clips.read') and public.staff_can_see_client(client_id)));
create policy clips_insert on public.clips for insert to authenticated
  with check (public.has_permission('clips.create') and public.staff_can_see_client(client_id));
-- Un monteur ne modifie que ses clips (ou non attribués) ; clients.update modifie tout
create policy clips_update on public.clips for update to authenticated
  using (public.staff_can_see_client(client_id) and (
    public.has_permission('clients.update')
    or ((public.has_permission('clips.create') or public.has_permission('clips.publish'))
        and (editor_id is null or editor_id = auth.uid()))
  ))
  with check (public.staff_can_see_client(client_id));
create policy clips_delete on public.clips for delete to authenticated
  using (public.has_permission('clients.update') and public.staff_can_see_client(client_id));

-- Statistiques : lecture comme le clip / le compte ; saisie avec stats.write
create policy clip_stats_select on public.clip_stats_snapshots for select to authenticated
  using (exists (select 1 from public.clips c where c.id = clip_id));
create policy clip_stats_insert on public.clip_stats_snapshots for insert to authenticated
  with check (public.has_permission('stats.write') and exists (
    select 1 from public.clips c where c.id = clip_id and public.staff_can_see_client(c.client_id)
  ));
create policy account_stats_select on public.account_stats_snapshots for select to authenticated
  using (exists (select 1 from public.social_accounts a where a.id = social_account_id));
create policy account_stats_insert on public.account_stats_snapshots for insert to authenticated
  with check (public.has_permission('stats.write') and exists (
    select 1 from public.social_accounts a where a.id = social_account_id and public.staff_can_see_client(a.client_id)
  ));

-- Demandes
create policy requests_select on public.requests for select to authenticated
  using (public.client_sees(client_id)
         or (public.has_permission('requests.read') and public.staff_can_see_client(client_id))
         or (public.has_permission('requests.manage') and public.staff_can_see_client(client_id)));
create policy requests_insert on public.requests for insert to authenticated
  with check (
    created_by = auth.uid() and (
      (public.is_own_client(client_id) and public.has_permission('requests.create') and public.client_can_write(client_id)
       and status = 'nouvelle' and assigned_to is null)
      or (public.has_permission('requests.manage') and public.staff_can_see_client(client_id))
    )
  );
create policy requests_update on public.requests for update to authenticated
  using (public.has_permission('requests.manage') and public.staff_can_see_client(client_id))
  with check (public.has_permission('requests.manage') and public.staff_can_see_client(client_id));

-- Commentaires : le client ne voit jamais les commentaires internes
create policy comments_select on public.comments for select to authenticated
  using ((public.client_sees(client_id) and not is_internal)
         or (public.staff_can_see_client(client_id)
             and (entity_type <> 'client' or public.has_permission('clients.internal_notes'))));
create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid() and (
      (public.is_own_client(client_id) and not is_internal and public.client_can_write(client_id))
      or (public.staff_can_see_client(client_id)
          and (entity_type <> 'client' or public.has_permission('clients.internal_notes')))
    )
  );

-- Pièces jointes : mêmes règles que les commentaires
create policy attachments_select on public.attachments for select to authenticated
  using ((public.client_sees(client_id) and not is_internal) or public.staff_can_see_client(client_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    owner_id = auth.uid() and (
      (public.is_own_client(client_id) and not is_internal and public.client_can_write(client_id))
      or public.staff_can_see_client(client_id)
    )
  );

-- =============================================================================
-- Actions du client (fonctions de confiance avec contrôles explicites)
-- =============================================================================

-- Valider un clip ou demander une modification
create or replace function public.client_review_clip(p_clip_id uuid, p_approve boolean, p_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clip public.clips%rowtype;
begin
  select * into v_clip from public.clips where id = p_clip_id for update;
  if not found or not public.is_own_client(v_clip.client_id) or not public.has_permission('clips.validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.client_can_write(v_clip.client_id) then
    raise exception 'clip: espace en lecture seule' using errcode = 'P0001';
  end if;
  if v_clip.status <> 'a_valider' then
    raise exception 'clip: pas en attente de validation' using errcode = 'P0001';
  end if;
  if not p_approve and coalesce(trim(p_feedback), '') = '' then
    raise exception 'clip: précisez la modification' using errcode = 'P0001';
  end if;

  update public.clips
  set status = case when p_approve then 'valide'::public.clip_status else 'en_montage'::public.clip_status end,
      client_feedback = nullif(left(trim(coalesce(p_feedback, '')), 2000), '')
  where id = v_clip.id;

  if not p_approve then
    insert into public.comments (client_id, entity_type, entity_id, author_id, body)
    values (v_clip.client_id, 'clip', v_clip.id, auth.uid(), left(trim(p_feedback), 5000));
  end if;
  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values (auth.uid(), case when p_approve then 'clip.approved' else 'clip.changes_requested' end, 'clip', v_clip.id);
end;
$$;

-- Le client marque sa demande comme résolue
create or replace function public.client_close_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
begin
  select * into v_request from public.requests where id = p_request_id for update;
  if not found or not public.is_own_client(v_request.client_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.requests set status = 'terminee' where id = v_request.id and status in ('nouvelle', 'en_cours');
  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'request.closed_by_client', 'request', v_request.id);
end;
$$;

-- =============================================================================
-- Gestion de l'abonnement par l'agence (prolonger, suspendre, réactiver,
-- changer d'offre, tarif personnalisé, archiver), tracée au journal.
-- =============================================================================
create or replace function public.admin_update_subscription(
  p_client_id uuid,
  p_action text,
  p_plan_id uuid default null,
  p_custom_price_cents integer default null,
  p_period_end date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
begin
  if not public.has_permission('clients.manage_subscription') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_client from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'client: introuvable' using errcode = 'P0001';
  end if;

  if p_action = 'extend' then
    if p_period_end is null then raise exception 'client: date requise' using errcode = 'P0001'; end if;
    update public.clients
    set period_end = p_period_end,
        period_start = coalesce(period_start, current_date),
        status = case when p_period_end >= current_date and status in ('grace', 'lecture_seule') then 'actif' else status end
    where id = p_client_id;
  elsif p_action = 'suspend' then
    update public.clients set status = 'suspendu' where id = p_client_id;
  elsif p_action = 'reactivate' then
    update public.clients
    set status = case
      when period_end is null or period_end >= current_date then 'actif'::public.client_status
      else 'lecture_seule'::public.client_status end
    where id = p_client_id;
  elsif p_action = 'archive' then
    update public.clients set status = 'archive' where id = p_client_id;
  elsif p_action = 'change_plan' then
    if not exists (select 1 from public.plans where id = p_plan_id) then
      raise exception 'client: offre introuvable' using errcode = 'P0001';
    end if;
    update public.clients set plan_id = p_plan_id where id = p_client_id;
  elsif p_action = 'custom_price' then
    if p_custom_price_cents is not null and p_custom_price_cents < 0 then
      raise exception 'client: tarif invalide' using errcode = 'P0001';
    end if;
    update public.clients set custom_price_cents = p_custom_price_cents where id = p_client_id;
  elsif p_action = 'toggle_validation' then
    update public.clients set requires_client_validation = not requires_client_validation where id = p_client_id;
  else
    raise exception 'client: action inconnue' using errcode = 'P0001';
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'client.subscription.' || p_action, 'client', p_client_id,
          jsonb_build_object('plan_id', p_plan_id, 'custom_price_cents', p_custom_price_cents, 'period_end', p_period_end,
                             'previous_status', v_client.status));
end;
$$;

-- Destinataires « équipe du client » : personnes attribuées + owners
create or replace function public.client_team(p_client_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id from public.assignments a
  join public.profiles p on p.id = a.user_id and p.is_active
  where a.client_id = p_client_id
  union
  select p.id from public.profiles p where p.role = 'owner' and p.is_active;
$$;

-- =============================================================================
-- Droits
-- =============================================================================
grant select, insert, update, delete on
  public.source_videos, public.social_accounts, public.social_account_private, public.clips,
  public.clip_stats_snapshots, public.account_stats_snapshots, public.requests, public.comments, public.attachments
to authenticated;
grant select on public.clip_latest_stats to authenticated;
grant all on
  public.source_videos, public.social_accounts, public.social_account_private, public.clips,
  public.clip_stats_snapshots, public.account_stats_snapshots, public.requests, public.comments, public.attachments
to service_role;
grant select on public.clip_latest_stats to service_role;
grant usage on sequence public.requests_number_seq to authenticated, service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_role(), public.is_staff(), public.is_owner(), public.has_permission(text),
  public.my_permissions(), public.is_assigned(uuid), public.is_own_client(uuid),
  public.staff_can_see_client(uuid), public.can_see_client(uuid), public.can_see_profile(uuid),
  public.client_choose_plan(uuid), public.submit_payment_proof(uuid, text, text),
  public.validate_payment(uuid), public.refuse_payment(uuid, text),
  public.client_can_write(uuid), public.client_unlocked(uuid), public.client_sees(uuid),
  public.client_visible_clip_status(public.clip_status),
  public.client_review_clip(uuid, boolean, text), public.client_close_request(uuid),
  public.admin_update_subscription(uuid, text, uuid, integer, date)
to authenticated;
grant execute on function public.plan_visible_to_me(uuid) to anon, authenticated;
grant execute on function
  public.rate_limit_hit(text, integer, integer), public.new_payment_reference(),
  public.run_subscription_lifecycle(date), public.users_with_permission(text), public.client_team(uuid)
to service_role;

-- =============================================================================
-- Envois de gros fichiers vers le stockage vidéo (R2 / S3) : le serveur ne
-- signe que les clés qu'il a lui-même préparées pour cet utilisateur.
-- Table réservée au serveur (aucune policy).
-- =============================================================================
create table public.pending_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  object_key text not null unique,
  purpose text not null check (purpose in ('video', 'clip')),
  entity_id uuid not null,
  size_bytes bigint not null check (size_bytes > 0),
  mime text not null,
  completed_at timestamptz,
  expires_at timestamptz not null default now() + interval '2 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pending_uploads enable row level security;
revoke all on public.pending_uploads from anon, authenticated;
grant all on public.pending_uploads to service_role;

insert into public.settings (key, value) values ('uploads', '{"max_video_bytes": 10737418240}')
on conflict (key) do nothing;

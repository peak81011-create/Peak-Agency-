-- =============================================================================
-- Peak Clipping Agency — Phase 1 : fondations
-- Profils, rôles, permissions, attributions, clients, offres, paiements,
-- paramètres, contenu du site, journal d'activité, notifications, rate limit.
-- Toutes les tables ont la RLS activée. Les règles d'accès reposent sur les
-- fonctions has_permission() / can_see_client(), miroir de can() côté serveur.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('owner', 'assistant', 'prospector', 'editor', 'client');

create type public.client_status as enum (
  'inscrit', 'attente_paiement', 'paiement_a_verifier', 'actif',
  'grace', 'lecture_seule', 'suspendu', 'archive'
);

create type public.payment_status as enum ('en_attente', 'a_verifier', 'valide', 'refuse');

create type public.billing_period as enum ('mensuel', 'trimestriel', 'annuel', 'unique');

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profils (1 par utilisateur auth ; id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role public.app_role not null default 'client',
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  phone text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  notification_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catalogue des permissions + permissions par rôle + exceptions par utilisateur
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  grp text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  permission text not null references public.permissions (key) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role, permission)
);

create table public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null references public.permissions (key) on delete cascade,
  granted boolean not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission)
);
create trigger upo_updated_at before update on public.user_permission_overrides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Offres
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_en text not null,
  description_fr text not null default '',
  description_en text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  billing_period public.billing_period not null default 'mensuel',
  clips_per_period integer check (clips_per_period >= 0),
  accounts_included integer check (accounts_included >= 0),
  platforms text[] not null default '{}',
  delivery_days integer check (delivery_days >= 0),
  features_fr jsonb not null default '[]'::jsonb,
  features_en jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  -- Offre de démonstration : signalée dans l'admin pour être remplacée.
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clients (créateurs)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  creator_name text not null default '',
  niche text,
  language text,
  channels jsonb not null default '{}'::jsonb,
  goals text,
  live_availability text,
  status public.client_status not null default 'inscrit',
  plan_id uuid references public.plans (id) on delete set null,
  custom_price_cents integer check (custom_price_cents >= 0),
  period_start date,
  period_end date,
  requires_client_validation boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_status_idx on public.clients (status);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- Notes internes : table séparée pour qu'aucune règle sur `clients`
-- ne puisse les exposer au client lui-même.
create table public.client_private_notes (
  client_id uuid primary key references public.clients (id) on delete cascade,
  body text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger cpn_updated_at before update on public.client_private_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Attributions employé ↔ client
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  team_role text not null default 'membre',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index assignments_client_idx on public.assignments (client_id);
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Paiements (virements)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  plan_id uuid references public.plans (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  reference text not null unique,
  proof_path text,
  status public.payment_status not null default 'en_attente',
  refusal_reason text,
  submitted_at timestamptz,
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_client_idx on public.payments (client_id);
create index payments_status_idx on public.payments (status);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Paramètres, contenu du site
-- ---------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_fr text not null default '',
  value_en text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Journal d'activité, notifications
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create trigger notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Limitation du nombre de requêtes (fenêtre fixe), utilisable sur Vercel
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

-- =============================================================================
-- Fonctions d'autorisation (SECURITY DEFINER : lisent les tables sans RLS)
-- =============================================================================

-- Rôle de l'utilisateur courant (null si inactif ou non connecté)
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() in ('owner', 'assistant', 'prospector', 'editor'), false);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() = 'owner', false);
$$;

-- Même algorithme que resolvePermission() dans src/lib/auth/permissions.ts :
-- owner = tout, mais seulement après double authentification (session aal2) ;
-- sinon exception utilisateur prioritaire ; sinon défaut du rôle.
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select pr.id, pr.role from public.profiles pr
    where pr.id = auth.uid() and pr.is_active
  )
  select coalesce(
    (select case
      when me.role = 'owner' then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      when o.granted is not null then o.granted
      else exists (
        select 1 from public.role_permissions rp
        where rp.role = me.role and rp.permission = p_permission
      )
    end
    from me
    left join public.user_permission_overrides o
      on o.user_id = me.id and o.permission = p_permission),
    false
  );
$$;

-- Liste effective des permissions de l'utilisateur courant
create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select p.key from public.permissions p where public.has_permission(p.key);
$$;

create or replace function public.is_assigned(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.user_id = auth.uid() and a.client_id = p_client_id
  );
$$;

-- Le client courant est-il propriétaire de cette fiche ?
create or replace function public.is_own_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.profile_id = auth.uid()
  ) and coalesce(public.my_role() = 'client', false);
$$;

-- Un employé peut-il voir ce client ? (tous si clients.read_all, sinon attribués)
create or replace function public.staff_can_see_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() and (
    public.has_permission('clients.read_all')
    or (public.has_permission('clients.read') and public.is_assigned(p_client_id))
  );
$$;

create or replace function public.can_see_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_own_client(p_client_id) or public.staff_can_see_client(p_client_id);
$$;

-- Visibilité d'un profil : soi-même ; les employés entre eux ; un employé voit
-- les clients qu'il peut voir ; un client voit l'équipe qui lui est attribuée.
create or replace function public.can_see_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_profile_id = auth.uid()
    or (public.is_staff() and exists (
      select 1 from public.profiles p
      where p.id = p_profile_id and p.role <> 'client'
    ))
    or exists (
      select 1 from public.clients c
      where c.profile_id = p_profile_id and public.staff_can_see_client(c.id)
    )
    or exists (
      select 1 from public.assignments a
      join public.clients c on c.id = a.client_id
      where a.user_id = p_profile_id and c.profile_id = auth.uid()
    );
$$;

-- Offre masquée mais visible : gestionnaire des offres, ou client qui l'a.
create or replace function public.plan_visible_to_me(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('plans.manage') or exists (
    select 1 from public.clients c
    where c.plan_id = p_plan_id and c.profile_id = auth.uid()
  );
$$;

-- Rate limit : renvoie true si la requête est autorisée. Réservé au serveur.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
          when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else rl.hits + 1 end,
        window_start = case
          when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else rl.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- =============================================================================
-- Gardes : empêchent un utilisateur de modifier les colonnes protégées
-- (rôle, statut, offre, période…) même si la RLS l'autorise à éditer sa ligne.
-- Les opérations serveur (service_role) ne sont pas concernées.
-- =============================================================================
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new; -- service_role / maintenance
  end if;
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'profiles: champ protégé' using errcode = '42501';
  end if;
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    if not public.has_permission('users.manage') then
      raise exception 'profiles: permission users.manage requise' using errcode = '42501';
    end if;
    -- Seul un owner peut toucher à un owner ou nommer un owner.
    if (old.role = 'owner' or new.role = 'owner') and not public.is_owner() then
      raise exception 'profiles: réservé au propriétaire' using errcode = '42501';
    end if;
    if old.id = auth.uid() then
      raise exception 'profiles: impossible de modifier son propre rôle' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.clients_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.profile_id is distinct from old.profile_id then
    raise exception 'clients: champ protégé' using errcode = '42501';
  end if;
  if (new.status, new.plan_id, new.custom_price_cents, new.period_start, new.period_end,
      new.requires_client_validation)
     is distinct from
     (old.status, old.plan_id, old.custom_price_cents, old.period_start, old.period_end,
      old.requires_client_validation)
     and not public.has_permission('clients.manage_subscription') then
    raise exception 'clients: permission clients.manage_subscription requise' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger clients_guard before update on public.clients
  for each row execute function public.clients_guard();

-- =============================================================================
-- Création automatique du profil (et de la fiche client) à l'inscription.
-- Le rôle vient de raw_app_meta_data (fixé uniquement par l'admin via l'API
-- service_role lors d'une invitation), jamais de raw_user_meta_data.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_locale text;
begin
  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'client')::public.app_role;
  v_locale := case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'fr' end;

  insert into public.profiles (id, email, full_name, role, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    v_locale
  );

  if v_role = 'client' then
    insert into public.clients (profile_id, creator_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'creator_name', ''));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.plans enable row level security;
alter table public.clients enable row level security;
alter table public.client_private_notes enable row level security;
alter table public.assignments enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;
alter table public.site_content enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limits enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_see_profile(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_manage on public.profiles for update to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- permissions (catalogue lisible par tout utilisateur connecté)
create policy permissions_select on public.permissions for select to authenticated using (true);

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (true);
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (public.has_permission('permissions.manage'))
  with check (public.has_permission('permissions.manage') and role <> 'owner');

create policy upo_select on public.user_permission_overrides for select to authenticated
  using (user_id = auth.uid() or public.has_permission('permissions.manage'));
create policy upo_write on public.user_permission_overrides for all to authenticated
  using (public.has_permission('permissions.manage'))
  with check (
    public.has_permission('permissions.manage')
    and user_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = user_id and p.role = 'owner')
  );

-- plans : offres visibles publiques, gestion via plans.manage
create policy plans_select_public on public.plans for select to anon, authenticated
  using (is_visible or public.plan_visible_to_me(id));
create policy plans_write on public.plans for all to authenticated
  using (public.has_permission('plans.manage')) with check (public.has_permission('plans.manage'));

-- clients
create policy clients_select on public.clients for select to authenticated
  using (profile_id = auth.uid() or public.staff_can_see_client(id));
create policy clients_update_self on public.clients for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy clients_update_staff on public.clients for update to authenticated
  using (public.has_permission('clients.update') and public.staff_can_see_client(id))
  with check (public.has_permission('clients.update') and public.staff_can_see_client(id));
create policy clients_insert_staff on public.clients for insert to authenticated
  with check (public.has_permission('clients.create'));

-- notes internes : jamais pour le rôle client
create policy cpn_all on public.client_private_notes for all to authenticated
  using (public.has_permission('clients.internal_notes') and public.staff_can_see_client(client_id))
  with check (public.has_permission('clients.internal_notes') and public.staff_can_see_client(client_id));

-- assignments
create policy assignments_select on public.assignments for select to authenticated
  using (user_id = auth.uid() or public.can_see_client(client_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.has_permission('clients.update') and public.has_permission('clients.read_all'))
  with check (public.has_permission('clients.update') and public.has_permission('clients.read_all'));

-- payments : lecture ; les écritures passent par le serveur (fonctions dédiées)
create policy payments_select on public.payments for select to authenticated
  using (
    public.is_own_client(client_id)
    or public.has_permission('payments.validate')
    or (public.has_permission('payments.read') and public.staff_can_see_client(client_id))
  );

-- settings : propriétaire / settings.update uniquement (le serveur expose
-- les valeurs publiques comme l'IBAN au client concerné)
create policy settings_all on public.settings for all to authenticated
  using (public.has_permission('settings.update'))
  with check (public.has_permission('settings.update'));

-- site_content : lecture publique
create policy site_content_select on public.site_content for select to anon, authenticated
  using (true);
create policy site_content_write on public.site_content for all to authenticated
  using (public.has_permission('content.update')) with check (public.has_permission('content.update'));

-- activity_log : lecture réservée ; insertion uniquement côté serveur
create policy activity_log_select on public.activity_log for select to authenticated
  using (public.has_permission('activity.read'));

-- notifications : chacun les siennes
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rate_limits : aucune policy → inaccessible hors service_role

-- =============================================================================
-- Droits SQL (la RLS fait le filtrage ; on retire tout à anon sauf le public)
-- =============================================================================
revoke all on all tables in schema public from anon;
grant select on public.plans, public.site_content to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.rate_limits from authenticated;
grant all on all tables in schema public to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_role(), public.is_staff(), public.is_owner(), public.has_permission(text),
  public.my_permissions(), public.is_assigned(uuid), public.is_own_client(uuid),
  public.staff_can_see_client(uuid), public.can_see_client(uuid), public.can_see_profile(uuid)
to authenticated;
-- plans_select_public est évaluée aussi pour anon
grant execute on function public.plan_visible_to_me(uuid) to anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

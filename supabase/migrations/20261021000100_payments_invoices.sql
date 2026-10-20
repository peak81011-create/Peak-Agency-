-- =============================================================================
-- Phase 2 : parcours de paiement par virement, factures, contact, cycle
-- d'abonnement (rappel, délai de grâce, lecture seule).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Gardes de colonnes : elles ne s'appliquent qu'aux appels directs de l'API
-- (rôles anon / authenticated). Les fonctions de confiance ci-dessous
-- (SECURITY DEFINER) s'exécutent sous le propriétaire et passent donc.
-- Les gardes doivent être SECURITY INVOKER pour voir l'appelant réel.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'profiles: champ protégé' using errcode = '42501';
  end if;
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    if not public.has_permission('users.manage') then
      raise exception 'profiles: permission users.manage requise' using errcode = '42501';
    end if;
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

create or replace function public.clients_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
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

-- Adresse de facturation (facultative ; obligatoire sur facture pour un client professionnel)
alter table public.clients add column billing_address text;

-- ---------------------------------------------------------------------------
-- Paiements : type (première souscription / renouvellement) et refus
-- ---------------------------------------------------------------------------
alter table public.payments
  add column kind text not null default 'initial' check (kind in ('initial', 'renewal')),
  add column proof_mime text,
  add column refused_by uuid references public.profiles (id) on delete set null,
  add column refused_at timestamptz;

-- Un seul paiement « ouvert » (en attente, à vérifier ou refusé) par client.
create unique index payments_one_open_per_client
  on public.payments (client_id)
  where status in ('en_attente', 'a_verifier', 'refuse');

-- ---------------------------------------------------------------------------
-- Compteurs de documents (références de paiement, factures) : une ligne par
-- type et par année, incrémentée sous verrou dans la transaction appelante.
-- Si la transaction échoue, l'incrément est annulé avec elle : aucun trou.
-- ---------------------------------------------------------------------------
create table public.document_counters (
  kind text not null,
  year integer not null,
  last_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (kind, year)
);
alter table public.document_counters enable row level security;

create or replace function public.next_document_number(p_kind text, p_year integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.document_counters as c (kind, year, last_value)
  values (p_kind, p_year, 1)
  on conflict (kind, year) do update
    set last_value = c.last_value + 1, updated_at = now()
  returning last_value;
$$;

-- Valeur d'un paramètre (jsonb) ou défaut
create or replace function public.setting_text(p_key text, p_field text, p_default text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(s.value ->> p_field, ''), p_default)
  from (select 1) d
  left join public.settings s on s.key = p_key;
$$;

-- ---------------------------------------------------------------------------
-- Factures (jamais supprimées : obligation de conservation)
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  number text not null unique,
  issued_at timestamptz not null default now(),
  pdf_path text,
  seller_snapshot jsonb not null,
  buyer_snapshot jsonb not null,
  lines jsonb not null,
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'EUR',
  vat_mention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_client_idx on public.invoices (client_id);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create or replace function public.invoices_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'invoices: une facture ne peut pas être supprimée' using errcode = '42501';
  end if;
  if (new.number, new.payment_id, new.client_id, new.total_cents, new.lines, new.seller_snapshot, new.buyer_snapshot, new.issued_at)
     is distinct from
     (old.number, old.payment_id, old.client_id, old.total_cents, old.lines, old.seller_snapshot, old.buyer_snapshot, old.issued_at) then
    raise exception 'invoices: une facture émise ne peut pas être modifiée' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger invoices_immutable before update or delete on public.invoices
  for each row execute function public.invoices_immutable();

alter table public.invoices enable row level security;
create policy invoices_select on public.invoices for select to authenticated
  using (
    public.is_own_client(client_id)
    or public.has_permission('payments.validate')
    or (public.has_permission('payments.read') and public.staff_can_see_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- Messages du formulaire de contact (insérés par le serveur uniquement)
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  channel_url text,
  message text not null,
  locale text not null default 'fr',
  handled boolean not null default false,
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger contact_messages_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();
alter table public.contact_messages enable row level security;
create policy contact_messages_select on public.contact_messages for select to authenticated
  using (public.has_permission('requests.manage'));
create policy contact_messages_update on public.contact_messages for update to authenticated
  using (public.has_permission('requests.manage')) with check (public.has_permission('requests.manage'));

-- ---------------------------------------------------------------------------
-- Stockage : preuves de virement et factures (buckets privés). Les envois et
-- lectures passent par des URL signées créées par le serveur après contrôle.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- =============================================================================
-- Fonctions métier (SECURITY DEFINER, avec contrôle des droits explicite)
-- =============================================================================

-- Durée d'une période d'abonnement
create or replace function public.period_interval(p_period public.billing_period)
returns interval
language sql
immutable
as $$
  select case p_period
    when 'mensuel' then interval '1 month'
    when 'trimestriel' then interval '3 months'
    when 'annuel' then interval '1 year'
    else null
  end;
$$;

-- Montant dû par un client pour une offre (tarif personnalisé prioritaire)
create or replace function public.amount_due(p_client_id uuid, p_plan_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.custom_price_cents, p.price_cents)
  from public.clients c, public.plans p
  where c.id = p_client_id and p.id = p_plan_id;
$$;

-- Nouvelle référence de paiement : PREFIXE-AAAA-NNNN (préfixe réglable)
create or replace function public.new_payment_reference()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_prefix text := upper(public.setting_text('billing', 'payment_reference_prefix', 'PEAK'));
begin
  return v_prefix || '-' || v_year || '-' || lpad(public.next_document_number('payment_reference', v_year)::text, 4, '0');
end;
$$;

-- Ouvre (ou met à jour) le paiement en attente d'un client
create or replace function public.open_payment(p_client_id uuid, p_plan_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_amount integer := public.amount_due(p_client_id, p_plan_id);
begin
  select * into v_payment from public.payments
  where client_id = p_client_id and status in ('en_attente', 'a_verifier', 'refuse')
  for update;

  if found then
    if v_payment.status = 'a_verifier' then
      raise exception 'payment: preuve en cours de vérification' using errcode = 'P0001';
    end if;
    update public.payments set plan_id = p_plan_id, amount_cents = v_amount where id = v_payment.id;
    return v_payment.id;
  end if;

  insert into public.payments (client_id, plan_id, amount_cents, reference, status, kind)
  values (p_client_id, p_plan_id, v_amount, public.new_payment_reference(), 'en_attente', p_kind)
  returning id into v_payment.id;
  return v_payment.id;
end;
$$;

-- Le client choisit son offre : ouvre le paiement correspondant
create or replace function public.client_choose_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_payment_id uuid;
begin
  select * into v_client from public.clients where profile_id = auth.uid() for update;
  if not found or public.my_role() <> 'client' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_client.status not in ('inscrit', 'attente_paiement') then
    raise exception 'plan: changement impossible dans cet état' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.plans where id = p_plan_id and is_visible) then
    raise exception 'plan: offre indisponible' using errcode = 'P0001';
  end if;

  update public.clients set plan_id = p_plan_id, status = 'attente_paiement' where id = v_client.id;
  v_payment_id := public.open_payment(v_client.id, p_plan_id, 'initial');

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'client.plan_chosen', 'client', v_client.id, jsonb_build_object('plan_id', p_plan_id));
  return v_payment_id;
end;
$$;

-- Le client a déposé sa preuve (le fichier doit exister dans le bucket)
create or replace function public.submit_payment_proof(p_payment_id uuid, p_path text, p_mime text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
begin
  select p.* into v_payment from public.payments p
  join public.clients c on c.id = p.client_id
  where p.id = p_payment_id and c.profile_id = auth.uid()
  for update of p;
  if not found or not public.has_permission('payments.submit_proof') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_payment.status not in ('en_attente', 'refuse') then
    raise exception 'payment: dépôt impossible dans cet état' using errcode = 'P0001';
  end if;
  if p_path not like v_payment.client_id::text || '/' || v_payment.id::text || '/%'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'payment-proofs' and o.name = p_path) then
    raise exception 'payment: fichier introuvable' using errcode = 'P0001';
  end if;

  update public.payments
  set proof_path = p_path, proof_mime = p_mime, status = 'a_verifier', submitted_at = now(), refusal_reason = null
  where id = v_payment.id;
  update public.clients set status = 'paiement_a_verifier'
  where id = v_payment.client_id and status in ('inscrit', 'attente_paiement');

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'payment.proof_submitted', 'payment', v_payment.id, jsonb_build_object('reference', v_payment.reference));
end;
$$;

-- Validation par l'agence : période, statut du client, facture numérotée
create or replace function public.validate_payment(p_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_client public.clients%rowtype;
  v_plan public.plans%rowtype;
  v_profile public.profiles%rowtype;
  v_grace integer := coalesce(public.setting_text('billing', 'grace_days', '7')::integer, 7);
  v_start date;
  v_end date;
  v_year integer := extract(year from now())::integer;
  v_number text;
  v_company jsonb;
  v_invoice_id uuid;
begin
  if not public.has_permission('payments.validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found or v_payment.status = 'valide' then
    raise exception 'payment: introuvable ou déjà validé' using errcode = 'P0001';
  end if;
  select * into v_client from public.clients where id = v_payment.client_id for update;
  select * into v_plan from public.plans where id = v_payment.plan_id;
  select * into v_profile from public.profiles where id = v_client.profile_id;

  -- Renouvellement sans rupture : la nouvelle période suit l'ancienne si le
  -- client est encore dans son délai de grâce ; sinon elle démarre aujourd'hui.
  if v_payment.kind = 'renewal' and v_client.period_end is not null
     and v_client.period_end >= current_date - v_grace then
    v_start := v_client.period_end + 1;
  else
    v_start := current_date;
  end if;
  if public.period_interval(v_plan.billing_period) is null then
    v_end := null;
  else
    v_end := (v_start + public.period_interval(v_plan.billing_period))::date - 1;
  end if;

  update public.payments
  set status = 'valide', validated_by = auth.uid(), validated_at = now(),
      period_start = v_start, period_end = v_end, refusal_reason = null
  where id = v_payment.id;

  update public.clients
  set status = 'actif', plan_id = v_payment.plan_id, period_start = v_start, period_end = v_end
  where id = v_client.id;

  select coalesce(value, '{}'::jsonb) into v_company from public.settings where key = 'company';
  v_number := upper(public.setting_text('billing', 'invoice_prefix', 'F')) || '-' || v_year || '-'
              || lpad(public.next_document_number('invoice', v_year)::text, 4, '0');

  insert into public.invoices (payment_id, client_id, number, seller_snapshot, buyer_snapshot, lines, total_cents, currency, vat_mention)
  values (
    v_payment.id,
    v_client.id,
    v_number,
    coalesce(v_company, '{}'::jsonb),
    jsonb_build_object(
      'creator_name', v_client.creator_name,
      'full_name', v_profile.full_name,
      'email', v_profile.email,
      'billing_address', coalesce(v_client.billing_address, ''),
      'client_id', v_client.id
    ),
    jsonb_build_array(jsonb_build_object(
      'label_fr', 'Offre ' || coalesce(v_plan.name_fr, ''),
      'label_en', 'Plan ' || coalesce(v_plan.name_en, ''),
      'quantity', 1,
      'unit_cents', v_payment.amount_cents,
      'total_cents', v_payment.amount_cents,
      'period_start', v_start,
      'period_end', v_end,
      'reference', v_payment.reference
    )),
    v_payment.amount_cents,
    v_payment.currency,
    coalesce(v_company ->> 'vat_mention', '')
  )
  returning id into v_invoice_id;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'payment.validated', 'payment', v_payment.id,
          jsonb_build_object('reference', v_payment.reference, 'invoice', v_number, 'amount_cents', v_payment.amount_cents));
  return v_invoice_id;
end;
$$;

-- Refus avec motif : le client peut redéposer une preuve
create or replace function public.refuse_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not public.has_permission('payments.validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'payment: motif obligatoire' using errcode = 'P0001';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found or v_payment.status not in ('a_verifier', 'en_attente') then
    raise exception 'payment: refus impossible dans cet état' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'refuse', refusal_reason = left(trim(p_reason), 1000), refused_by = auth.uid(), refused_at = now()
  where id = v_payment.id;
  update public.clients set status = 'attente_paiement'
  where id = v_payment.client_id and status = 'paiement_a_verifier';

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'payment.refused', 'payment', v_payment.id,
          jsonb_build_object('reference', v_payment.reference, 'reason', left(trim(p_reason), 1000)));
end;
$$;

-- Cycle d'abonnement, lancé chaque jour par la tâche planifiée (serveur).
-- Renvoie les événements à notifier.
create or replace function public.run_subscription_lifecycle(p_today date default current_date)
returns table (client_id uuid, event text, payment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grace integer := coalesce(public.setting_text('billing', 'grace_days', '7')::integer, 7);
  v_reminder integer := coalesce(public.setting_text('billing', 'reminder_days_before', '7')::integer, 7);
  r record;
  v_payment_id uuid;
begin
  -- 1. Rappel de renouvellement : ouvre un paiement avec une nouvelle référence
  for r in
    select c.id, c.plan_id from public.clients c
    where c.status = 'actif' and c.period_end is not null and c.plan_id is not null
      and c.period_end - v_reminder <= p_today
      and not exists (
        select 1 from public.payments p
        where p.client_id = c.id and p.status in ('en_attente', 'a_verifier', 'refuse')
      )
  loop
    v_payment_id := public.open_payment(r.id, r.plan_id, 'renewal');
    client_id := r.id; event := 'renewal_reminder'; payment_id := v_payment_id;
    return next;
  end loop;

  -- 2. Fin de période dépassée : délai de grâce
  for r in
    update public.clients c set status = 'grace'
    where c.status = 'actif' and c.period_end is not null and c.period_end < p_today
    returning c.id
  loop
    client_id := r.id; event := 'grace_started'; payment_id := null;
    return next;
  end loop;

  -- 3. Délai de grâce écoulé : lecture seule
  for r in
    update public.clients c set status = 'lecture_seule'
    where c.status = 'grace' and c.period_end is not null and c.period_end + v_grace < p_today
    returning c.id
  loop
    client_id := r.id; event := 'read_only'; payment_id := null;
    return next;
  end loop;
end;
$$;

-- Destinataires d'une notification : utilisateurs actifs ayant la permission
-- (l'owner les a toutes). Même règle que has_permission, sans la condition 2FA.
create or replace function public.users_with_permission(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  left join public.user_permission_overrides o on o.user_id = p.id and o.permission = p_permission
  where p.is_active and (
    p.role = 'owner'
    or coalesce(o.granted, exists (
      select 1 from public.role_permissions rp where rp.role = p.role and rp.permission = p_permission
    ))
  );
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.client_choose_plan(uuid),
  public.submit_payment_proof(uuid, text, text),
  public.validate_payment(uuid),
  public.refuse_payment(uuid, text)
to authenticated;
-- Fonctions déjà accordées en phase 1 (le revoke ci-dessus les couvre aussi)
grant execute on function
  public.my_role(), public.is_staff(), public.is_owner(), public.has_permission(text),
  public.my_permissions(), public.is_assigned(uuid), public.is_own_client(uuid),
  public.staff_can_see_client(uuid), public.can_see_client(uuid), public.can_see_profile(uuid)
to authenticated;
grant execute on function public.plan_visible_to_me(uuid) to anon, authenticated;
grant execute on function
  public.rate_limit_hit(text, integer, integer),
  public.run_subscription_lifecycle(date),
  public.users_with_permission(text)
to service_role;

grant select on public.invoices to authenticated;
grant select, update on public.contact_messages to authenticated;
grant all on public.invoices, public.contact_messages, public.document_counters to service_role;
revoke all on public.document_counters from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vérifier un paiement suppose de savoir de quel client il s'agit : les
-- personnes ayant payments.validate voient la fiche et le profil des clients
-- (identité seulement ; les vidéos, clips, etc. restent liés à l'attribution).
-- ---------------------------------------------------------------------------
drop policy clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (profile_id = auth.uid() or public.staff_can_see_client(id) or public.has_permission('payments.validate'));

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
      where c.profile_id = p_profile_id
        and (public.staff_can_see_client(c.id) or public.has_permission('payments.validate'))
    )
    or exists (
      select 1 from public.assignments a
      join public.clients c on c.id = a.client_id
      where a.user_id = p_profile_id and c.profile_id = auth.uid()
    );
$$;
grant execute on function public.can_see_profile(uuid) to authenticated;

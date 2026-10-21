-- Candidatures des clippers (monteurs) qui veulent rejoindre l'équipe.
-- Envoyées depuis la page publique « Rejoindre la team » par le serveur
-- (clé service), lues et traitées par les personnes ayant users.manage.

create table public.clipper_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  portfolio_url text check (portfolio_url is null or portfolio_url ~* '^https://'),
  platforms text[] not null default '{}',
  experience text not null check (experience in ('debutant', 'intermediaire', 'confirme')),
  tools text,
  hours_per_week text not null check (hours_per_week in ('moins_10', '10_20', '20_35', 'temps_plein')),
  languages text,
  message text,
  locale text not null default 'fr',
  status text not null default 'nouvelle' check (status in ('nouvelle', 'en_cours', 'acceptee', 'refusee')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clipper_applications_created_idx on public.clipper_applications (created_at desc);
create trigger clipper_applications_updated_at before update on public.clipper_applications
  for each row execute function public.set_updated_at();

alter table public.clipper_applications enable row level security;
create policy clipper_applications_select on public.clipper_applications for select to authenticated
  using (public.has_permission('users.manage'));
create policy clipper_applications_update on public.clipper_applications for update to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

grant select, update on public.clipper_applications to authenticated;
grant all on public.clipper_applications to service_role;

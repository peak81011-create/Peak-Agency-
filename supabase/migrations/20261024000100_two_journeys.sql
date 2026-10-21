-- =============================================================================
-- Deux parcours : créateurs et clippers.
-- - le rôle « editor » devient « clipper » (et clips.editor_id → clipper_id)
-- - variables « Textes & engagements » modifiables par l'admin
-- - FAQ par public (créateurs / clippers) avec votes « utile ? »
-- - niveaux des clippers (éditables)
-- - nouvelle candidature clipper (formulaire et statuts du parcours)
-- - page légale « Conditions clippers »
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Rôle clipper
-- ---------------------------------------------------------------------------
alter type public.app_role rename value 'editor' to 'clipper';

-- Les fonctions écrites avec l'ancien nom du rôle sont redéfinies.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() in ('owner', 'assistant', 'prospector', 'clipper'), false);
$$;

alter table public.clips rename column editor_id to clipper_id;
alter table public.clips rename constraint clips_editor_id_fkey to clips_clipper_id_fkey;
alter index public.clips_editor_idx rename to clips_clipper_idx;

-- ---------------------------------------------------------------------------
-- Textes & engagements : vides par défaut (aucune valeur inventée). Un bloc du
-- site qui utilise une variable vide est masqué. Montants en centimes.
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values ('commitments', '{
  "delai_reponse": "",
  "delai_activation": "",
  "delai_premiers_clips": "",
  "conditions_resiliation": "",
  "minimum_par_clip": null,
  "tarif_1000_vues": null,
  "jours_comptage_vues": null,
  "plafond_par_clip": null,
  "jour_paiement": null,
  "clip_test_remunere": "",
  "age_minimum": 18
}')
on conflict (key) do nothing;

-- Les engagements sont publics (affichés sur le site) : lecture par tous.
create or replace function public.public_commitments()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value from public.settings where key = 'commitments'), '{}'::jsonb);
$$;
grant execute on function public.public_commitments() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- FAQ par public
-- ---------------------------------------------------------------------------
create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('createur', 'clipper', 'tous')),
  question_fr text not null,
  answer_fr text not null,
  question_en text not null,
  answer_en text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_top boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faq_items_audience_idx on public.faq_items (audience, sort_order);
create trigger faq_items_updated_at before update on public.faq_items
  for each row execute function public.set_updated_at();

-- Votes « Cette réponse vous a aidé ? » (anonymes, envoyés par le serveur)
create table public.faq_feedback (
  id uuid primary key default gen_random_uuid(),
  faq_id uuid not null references public.faq_items (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now()
);
create index faq_feedback_faq_idx on public.faq_feedback (faq_id);

alter table public.faq_items enable row level security;
alter table public.faq_feedback enable row level security;
create policy faq_items_select on public.faq_items for select to anon, authenticated
  using (is_visible or public.has_permission('content.update'));
create policy faq_items_write on public.faq_items for all to authenticated
  using (public.has_permission('content.update')) with check (public.has_permission('content.update'));
create policy faq_feedback_select on public.faq_feedback for select to authenticated
  using (public.has_permission('content.update'));
grant select on public.faq_items to anon;
grant select, insert, update, delete on public.faq_items to authenticated;
grant select on public.faq_feedback to authenticated;
grant all on public.faq_items, public.faq_feedback to service_role;

-- L'ancienne FAQ (contenu de l'accueil) est remplacée par la table ci-dessus.
delete from public.site_content where key = 'home.faq';

insert into public.faq_items (audience, sort_order, is_top, question_fr, answer_fr, question_en, answer_en) values
  ('createur', 10, true, $q$C'est quoi le clipping ?$q$,
   $q$On prend vos vidéos longues ou vos lives, on en extrait les meilleurs moments et on les transforme en clips courts au format vertical, pour TikTok, Instagram Reels et YouTube Shorts.$q$,
   $q$What is clipping?$q$,
   $q$We take your long videos or streams, pull out the best moments and turn them into short vertical clips for TikTok, Instagram Reels and YouTube Shorts.$q$),
  ('createur', 20, false, $q$Qu'est-ce que je dois faire concrètement ?$q$,
   $q$Presque rien : vous nous envoyez vos vidéos (un lien ou le fichier) depuis votre espace. On s'occupe de la sélection, du montage et de la publication.$q$,
   $q$What do I actually have to do?$q$,
   $q$Almost nothing: you send us your videos (a link or the file) from your space. We handle the selection, the editing and the publishing.$q$),
  ('createur', 30, false, $q$Sur quels comptes les clips sont-ils publiés ?$q$,
   $q$Sur des comptes dédiés que nous créons et gérons pour vous. Vous les retrouvez tous dans votre espace, avec leurs résultats.$q$,
   $q$Which accounts are the clips published on?$q$,
   $q$On dedicated accounts that we create and manage for you. You'll find them all in your space, with their results.$q$),
  ('createur', 40, false, $q$Est-ce que je peux valider les clips avant leur publication ?$q$,
   $q$Oui. Vous pouvez activer la validation : chaque clip vous est alors présenté avant d'être publié, et vous pouvez demander une modification.$q$,
   $q$Can I approve clips before they're published?$q$,
   $q$Yes. You can turn on approval: each clip is then shown to you before it goes live, and you can ask for changes.$q$),
  ('createur', 50, false, $q$Je peux donner des consignes ?$q$,
   $q$Bien sûr : sujets à éviter, style, moments à mettre en avant… Vous pouvez aussi faire une demande précise à tout moment depuis votre espace.$q$,
   $q$Can I give instructions?$q$,
   $q$Of course: topics to avoid, style, moments to highlight… You can also send a specific request at any time from your space.$q$),
  ('createur', 60, false, $q$En combien de temps je vois des résultats ?$q$,
   $q$Vos premiers clips sont publiés sous {delai_premiers_clips}. La croissance d'un compte prend ensuite quelques semaines. Personne ne peut garantir un nombre de vues, mais vous suivez l'évolution en temps réel dans votre espace.$q$,
   $q$How soon will I see results?$q$,
   $q$Your first clips go live within {delai_premiers_clips}. Growing an account then takes a few weeks. Nobody can guarantee a number of views, but you can follow progress in real time in your space.$q$),
  ('createur', 70, true, $q$Combien ça coûte ?$q$,
   $q$Toutes nos offres sont affichées sur la page [Tarifs](/pricing), sans frais cachés.$q$,
   $q$How much does it cost?$q$,
   $q$All our plans are listed on the [Pricing](/pricing) page, with no hidden fees.$q$),
  ('createur', 80, true, $q$Comment je paie ?$q$,
   $q$Par virement bancaire. Votre espace vous affiche le montant, nos coordonnées bancaires et une référence à indiquer dans le virement. Vous déposez ensuite une capture du virement, et votre espace est activé sous {delai_activation} après réception.$q$,
   $q$How do I pay?$q$,
   $q$By bank transfer. Your space shows the amount, our bank details and a reference to include in the transfer. You then upload a screenshot of the transfer, and your space is activated within {delai_activation} of receipt.$q$),
  ('createur', 90, false, $q$Est-ce que je peux arrêter ?$q$,
   $q${conditions_resiliation}$q$,
   $q$Can I stop?$q$,
   $q${conditions_resiliation}$q$),
  ('createur', 100, false, $q$Mes vidéos restent-elles à moi ?$q$,
   $q$Oui. Vos contenus vous appartiennent. Nous les utilisons uniquement pour créer et publier vos clips, comme prévu dans nos [CGV](/legal/terms).$q$,
   $q$Do my videos still belong to me?$q$,
   $q$Yes. Your content belongs to you. We only use it to create and publish your clips, as set out in our [terms of sale](/legal/terms).$q$),
  ('createur', 110, false, $q$Mes données sont-elles protégées ?$q$,
   $q$Oui. Elles sont hébergées en Europe, accessibles uniquement à l'équipe qui travaille pour vous, et vous pouvez demander leur suppression à tout moment.$q$,
   $q$Is my data protected?$q$,
   $q$Yes. It's hosted in Europe, only accessible to the team working for you, and you can ask for it to be deleted at any time.$q$),
  ('createur', 120, false, $q$Et si j'ai un problème ou une question ?$q$,
   $q$Notre service client vous répond sous {delai_reponse}, depuis le bouton « Besoin d'aide ? » ou la page [Aide](/help).$q$,
   $q$What if I have a problem or a question?$q$,
   $q$Our support team replies within {delai_reponse}, from the “Need help?” button or the [Help](/help) page.$q$),

  ('clipper', 10, false, $q$Faut-il de l'expérience ?$q$,
   $q$Pas forcément beaucoup, mais il faut savoir monter un clip vertical propre. Le clip test sert justement à voir ton niveau.$q$,
   $q$Do I need experience?$q$,
   $q$Not necessarily a lot, but you need to be able to edit a clean vertical clip. The test clip is there to see your level.$q$),
  ('clipper', 20, false, $q$De quel matériel ai-je besoin ?$q$,
   $q$Un ordinateur ou un téléphone et le logiciel de montage de ton choix (CapCut, Premiere Pro, DaVinci Resolve…).$q$,
   $q$What equipment do I need?$q$,
   $q$A computer or a phone and the editing software of your choice (CapCut, Premiere Pro, DaVinci Resolve…).$q$),
  ('clipper', 30, false, $q$Est-ce que je dois trouver des créateurs ?$q$,
   $q$Non, jamais. C'est le travail de l'agence. Toi, tu reçois les vidéos et tu montes.$q$,
   $q$Do I have to find creators?$q$,
   $q$No, never. That's the agency's job. You get the videos and you edit.$q$),
  ('clipper', 40, true, $q$Comment je suis payé exactement ?$q$,
   $q$Pour chaque clip validé, tu reçois au minimum {minimum_par_clip}, plus {tarif_1000_vues} pour 1 000 vues. Les vues sont comptées {jours_comptage_vues} jours après la publication. Le simulateur de la page [Clippers](/clippers) te montre un exemple.$q$,
   $q$How exactly do I get paid?$q$,
   $q$For each approved clip, you get at least {minimum_par_clip}, plus {tarif_1000_vues} per 1,000 views. Views are counted {jours_comptage_vues} days after publishing. The simulator on the [Clippers](/clippers) page shows you an example.$q$),
  ('clipper', 50, false, $q$C'est quoi le filet de sécurité ?$q$,
   $q$C'est le minimum garanti : même si un clip validé fait peu de vues, tu touches {minimum_par_clip}. Ton travail est toujours payé.$q$,
   $q$What is the safety net?$q$,
   $q$It's the guaranteed minimum: even if an approved clip gets few views, you earn {minimum_par_clip}. Your work always gets paid.$q$),
  ('clipper', 60, false, $q$Comment les vues sont-elles comptées ?$q$,
   $q$On relève les vues réelles de ton clip sur le compte où il est publié. Tu vois les chiffres de chacun de tes clips dans ton espace.$q$,
   $q$How are views counted?$q$,
   $q$We record the real views of your clip on the account where it's published. You can see the numbers for each of your clips in your space.$q$),
  ('clipper', 70, true, $q$Quand suis-je payé ?$q$,
   $q$Chaque mois, le {jour_paiement}, par virement. Ton espace affiche tes gains en cours et ton relevé détaillé.$q$,
   $q$When do I get paid?$q$,
   $q$Every month, on day {jour_paiement}, by bank transfer. Your space shows your current earnings and your detailed statement.$q$),
  ('clipper', 80, false, $q$Ai-je besoin d'un statut ?$q$,
   $q$Oui. Pour être payé légalement en France, il faut un statut, par exemple micro-entrepreneur. Il se crée gratuitement en ligne, et on t'explique comment faire.$q$,
   $q$Do I need a legal status?$q$,
   $q$Yes. To be paid legally in France, you need a status, for example micro-entrepreneur. It's free to set up online, and we'll explain how.$q$),
  ('clipper', 90, false, $q$Le clip test est-il payé ?$q$,
   $q${clip_test_remunere}$q$,
   $q$Is the test clip paid?$q$,
   $q${clip_test_remunere}$q$),
  ('clipper', 100, false, $q$Combien de temps dois-je y consacrer ?$q$,
   $q$C'est toi qui décides. Tu choisis les missions que tu acceptes, selon ton temps disponible.$q$,
   $q$How much time do I need to put in?$q$,
   $q$It's up to you. You choose the missions you accept, based on the time you have.$q$),
  ('clipper', 110, false, $q$Que se passe-t-il si mon clip est refusé ?$q$,
   $q$Tu reçois un retour clair sur ce qui ne va pas et tu peux le corriger. Seuls les clips validés sont rémunérés.$q$,
   $q$What happens if my clip is rejected?$q$,
   $q$You get clear feedback on what's wrong and you can fix it. Only approved clips are paid.$q$),
  ('clipper', 120, false, $q$Comment je passe au niveau supérieur ?$q$,
   $q$En livrant des clips de qualité, dans les délais. Ton espace t'indique où tu en es et ce qu'il te reste pour passer au niveau suivant.$q$,
   $q$How do I move up a level?$q$,
   $q$By delivering quality clips on time. Your space shows where you stand and what's left to reach the next level.$q$),
  ('clipper', 130, false, $q$Est-ce que je peux travailler pour d'autres en même temps ?$q$,
   $q$Oui, tu restes libre. En revanche, les vidéos des créateurs restent strictement confidentielles.$q$,
   $q$Can I work for others at the same time?$q$,
   $q$Yes, you're free to. However, creators' videos stay strictly confidential.$q$),
  ('clipper', 140, true, $q$Et si j'ai une question ?$q$,
   $q$L'équipe te répond sous {delai_reponse}, depuis le bouton « Besoin d'aide ? » de ton espace.$q$,
   $q$What if I have a question?$q$,
   $q$The team replies within {delai_reponse}, from the “Need help?” button in your space.$q$);

-- ---------------------------------------------------------------------------
-- Niveaux des clippers (conditions et avantages éditables par l'admin)
-- ---------------------------------------------------------------------------
create table public.clipper_levels (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null unique,
  name_fr text not null,
  name_en text not null,
  benefits_fr text not null default '',
  benefits_en text not null default '',
  min_validated_clips integer check (min_validated_clips >= 0),
  min_average_rating numeric(3, 2) check (min_average_rating between 0 and 5),
  min_on_time_rate numeric(5, 2) check (min_on_time_rate between 0 and 100),
  pay_coefficient numeric(4, 2) not null default 1 check (pay_coefficient > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clipper_levels_updated_at before update on public.clipper_levels
  for each row execute function public.set_updated_at();
alter table public.clipper_levels enable row level security;
create policy clipper_levels_select on public.clipper_levels for select to anon, authenticated using (true);
create policy clipper_levels_write on public.clipper_levels for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
grant select on public.clipper_levels to anon;
grant select, insert, update, delete on public.clipper_levels to authenticated;
grant all on public.clipper_levels to service_role;

insert into public.clipper_levels (sort_order, name_fr, name_en, benefits_fr, benefits_en) values
  (1, 'Nouveau', 'New',
   'Tu commences avec des missions accompagnées et un retour détaillé sur chaque clip.',
   'You start with guided missions and detailed feedback on every clip.'),
  (2, 'Confirmé', 'Confirmed',
   'Accès à plus de créateurs et à des missions prioritaires.',
   'Access to more creators and priority missions.'),
  (3, 'Expert', 'Expert',
   'Les meilleures missions, une prime bonus et la possibilité de former les nouveaux.',
   'The best missions, a bonus and the chance to train newcomers.');

-- ---------------------------------------------------------------------------
-- Candidatures clippers : nouveau formulaire et statuts du parcours
-- (reçue → clip test envoyé → clip test reçu → acceptée / refusée)
-- ---------------------------------------------------------------------------
drop table if exists public.clipper_applications;
create table public.clipper_applications (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 60),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  age_confirmed boolean not null check (age_confirmed),
  country text not null check (char_length(country) between 1 and 80),
  languages text not null check (char_length(languages) between 1 and 200),
  portfolio_links text[] not null check (cardinality(portfolio_links) between 1 and 5),
  software text not null check (char_length(software) between 1 and 200),
  experience text not null check (experience in ('debutant', 'intermediaire', 'avance')),
  hours_per_week text not null check (hours_per_week in ('moins_10', '10_20', '20_35', 'plus_35')),
  motivation text check (char_length(motivation) <= 3000),
  locale text not null default 'fr',
  status text not null default 'recue'
    check (status in ('recue', 'test_envoye', 'test_recu', 'acceptee', 'refusee')),
  rating smallint check (rating between 1 and 5),
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

-- ---------------------------------------------------------------------------
-- Textes : accueil (seulement s'ils n'ont pas été modifiés) et conditions clippers
-- ---------------------------------------------------------------------------
update public.site_content
set value_fr = $c$On transforme les longues vidéos en clips qui font grandir les créateurs.$c$,
    value_en = $c$We turn long videos into clips that help creators grow.$c$
where key = 'home.hero.title' and value_fr = $c$Vos lives, découpés en clips qui font des vues.$c$;
update public.site_content
set value_fr = $c$Peak Clipping Agency découpe les lives et les vidéos YouTube en clips courts pour TikTok, Reels et Shorts.$c$,
    value_en = $c$Peak Clipping Agency cuts streams and YouTube videos into short clips for TikTok, Reels and Shorts.$c$
where key = 'home.hero.lead' and value_fr like 'On regarde vos lives%';

insert into public.site_content (key, value_fr, value_en) values
  ('legal.clippers', $c$Modèle de conditions pour les clippers, à compléter et à faire relire par un professionnel du droit. Les passages entre crochets sont à renseigner.

## 1. Objet

Ces conditions encadrent la collaboration entre l'agence et les clippers indépendants qui réalisent des clips à partir des vidéos des créateurs clients.

## 2. Statut

Le clipper travaille en indépendant [préciser : micro-entrepreneur ou autre statut]. Il n'est pas salarié de l'agence et organise librement son temps.

## 3. Missions

L'agence propose des missions. Le clipper choisit celles qu'il accepte. Une mission acceptée doit être livrée avant son échéance.

## 4. Rémunération

La rémunération de chaque clip validé suit les règles affichées dans l'espace du clipper au moment de la validation. Le clipper facture l'agence chaque mois sur la base du relevé. [À compléter avec un comptable.]

## 5. Confidentialité

Les vidéos des créateurs sont confidentielles. Il est interdit de les réutiliser, de les publier ailleurs ou de les partager.

## 6. Propriété des clips

[À compléter : cession des droits sur les clips réalisés au profit de l'agence et du créateur.]

## 7. Fin de la collaboration

[À compléter : conditions et préavis.]$c$, $c$Template terms for clippers, to be completed and reviewed by a legal professional. Text in square brackets must be filled in.

## 1. Purpose

These terms govern the collaboration between the agency and the independent clippers who make clips from client creators' videos.

## 2. Status

The clipper works as an independent contractor [specify the legal status]. They are not an employee of the agency and organise their own time.

## 3. Missions

The agency offers missions. The clipper chooses which ones to accept. An accepted mission must be delivered before its deadline.

## 4. Pay

Pay for each approved clip follows the rules shown in the clipper's space at the time of approval. The clipper invoices the agency every month based on the statement. [To be completed with an accountant.]

## 5. Confidentiality

Creators' videos are confidential. Reusing, publishing elsewhere or sharing them is forbidden.

## 6. Ownership of clips

[To be completed: transfer of rights on the clips to the agency and the creator.]

## 7. End of the collaboration

[To be completed: terms and notice.]$c$)
on conflict (key) do nothing;

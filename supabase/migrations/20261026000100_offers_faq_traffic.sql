-- =============================================================================
-- Offres détaillées (4 offres proposées), FAQ enrichie, fréquentation du site.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Offres : adresse lisible, durée des clips, accroche et description détaillée
-- ---------------------------------------------------------------------------
alter table public.plans
  add column slug text unique check (slug is null or slug ~ '^[a-z0-9-]{2,40}$'),
  add column tagline_fr text not null default '',
  add column tagline_en text not null default '',
  add column clip_length_fr text not null default '',
  add column clip_length_en text not null default '',
  add column details_fr text not null default '',
  add column details_en text not null default '';

-- Les 4 offres proposées (modifiables dans Admin → Offres & tarifs). Ajoutées
-- seulement si aucune offre réelle n'existe encore.
insert into public.plans (
  slug, name_fr, name_en, tagline_fr, tagline_en, description_fr, description_en, price_cents, currency, billing_period,
  clips_per_period, accounts_included, platforms, delivery_days, clip_length_fr, clip_length_en,
  features_fr, features_en, details_fr, details_en, sort_order, is_visible, is_featured, is_demo
)
select * from (values
  ('lancement', 'Lancement', 'Launch',
   'Pour tester le clipping et lancer votre premier compte.', 'To try clipping and launch your first account.',
   'Environ 3 clips par jour sur TikTok.', 'About 3 clips a day on TikTok.',
   14900, 'EUR', 'mensuel'::public.billing_period, 90, 1, array['tiktok'], 3, '15 à 45 secondes', '15 to 45 seconds',
   '["Sous-titres et accroche sur chaque clip", "Compte TikTok créé et géré pour vous", "Validation des clips avant publication (si vous le souhaitez)", "Espace personnel avec vos clips et vos vues"]'::jsonb,
   '["Captions and a hook on every clip", "TikTok account created and managed for you", "Approve clips before they go live (if you want)", "Personal space with your clips and views"]'::jsonb,
   $d$## Pour qui ?

Les créateurs qui veulent découvrir le clipping sans se lancer trop gros : un live ou deux par semaine, ou une chaîne YouTube qui publie régulièrement.

## Ce que vous recevez

- 90 clips verticaux par mois, soit environ 3 par jour.
- Des clips de 15 à 45 secondes : le format qui marche le mieux pour démarrer sur TikTok.
- Un compte TikTok dédié, créé et animé par l'équipe.
- Des sous-titres lisibles et une accroche pensée pour retenir dès la première seconde.

## Comment ça se passe

Vous envoyez vos vidéos depuis votre espace (un lien suffit). Les clippers repèrent les meilleurs moments, montent les clips et les publient. Vous suivez tout, clip par clip, dans votre espace.

## Bon à savoir

Les clips sont livrés sous 3 jours après réception de la vidéo. Vous pouvez passer à une offre supérieure à tout moment.$d$,
   $d$## Who is it for?

Creators who want to discover clipping without going big: one or two streams a week, or a YouTube channel that posts regularly.

## What you get

- 90 vertical clips a month, about 3 a day.
- Clips of 15 to 45 seconds: the format that works best to get started on TikTok.
- A dedicated TikTok account, created and run by the team.
- Readable captions and a hook designed to hold attention from the first second.

## How it works

You send your videos from your space (a link is enough). Clippers spot the best moments, edit the clips and publish them. You follow everything, clip by clip, in your space.

## Good to know

Clips are delivered within 3 days of receiving the video. You can move up to a bigger plan at any time.$d$,
   10, true, false, false),
  ('croissance', 'Croissance', 'Growth',
   'Le meilleur équilibre pour grandir sur deux plateformes.', 'The best balance to grow on two platforms.',
   'Environ 7 clips par jour sur TikTok et YouTube Shorts.', 'About 7 clips a day on TikTok and YouTube Shorts.',
   27900, 'EUR', 'mensuel'::public.billing_period, 200, 2, array['tiktok', 'youtube'], 2, '15 à 60 secondes', '15 to 60 seconds',
   '["Sous-titres, accroche et habillage soigné", "2 comptes dédiés (TikTok et YouTube Shorts)", "Consignes de style et sujets à éviter respectés", "Validation des clips avant publication (si vous le souhaitez)", "Demandes particulières depuis votre espace"]'::jsonb,
   '["Captions, a hook and clean styling", "2 dedicated accounts (TikTok and YouTube Shorts)", "Your style guidelines and topics to avoid respected", "Approve clips before they go live (if you want)", "Special requests from your space"]'::jsonb,
   $d$## Pour qui ?

Les streamers et vidéastes qui publient plusieurs fois par semaine et veulent toucher un public plus large, sur TikTok et YouTube Shorts en même temps.

## Ce que vous recevez

- 200 clips verticaux par mois, soit environ 7 par jour, répartis sur deux comptes.
- Des clips de 15 à 60 secondes, adaptés à chaque plateforme.
- Deux comptes dédiés : TikTok et YouTube Shorts.
- Vos consignes respectées : ton, style, sujets à éviter, moments à mettre en avant.

## Comment ça se passe

Envoyez vos lives et vos vidéos depuis votre espace. Les clips sont livrés sous 2 jours, publiés aux heures où votre audience est active, et vous suivez les vues de chaque clip.

## Bon à savoir

C'est l'offre la plus choisie : assez de clips pour tester ce qui marche, sur deux plateformes, sans exploser votre budget.$d$,
   $d$## Who is it for?

Streamers and video makers who post several times a week and want to reach a wider audience, on TikTok and YouTube Shorts at the same time.

## What you get

- 200 vertical clips a month, about 7 a day, spread over two accounts.
- Clips of 15 to 60 seconds, adapted to each platform.
- Two dedicated accounts: TikTok and YouTube Shorts.
- Your guidelines respected: tone, style, topics to avoid, moments to highlight.

## How it works

Send your streams and videos from your space. Clips are delivered within 2 days, published when your audience is active, and you follow the views of each clip.

## Good to know

This is the most popular plan: enough clips to test what works, on two platforms, without blowing your budget.$d$,
   20, true, true, false),
  ('pro', 'Pro', 'Pro',
   'Être partout : TikTok, Reels et Shorts, tous les jours.', 'Be everywhere: TikTok, Reels and Shorts, every day.',
   '12 clips par jour sur les trois grandes plateformes.', '12 clips a day on the three big platforms.',
   39900, 'EUR', 'mensuel'::public.billing_period, 360, 3, array['tiktok', 'instagram', 'youtube'], 2, '15 à 60 secondes', '15 to 60 seconds',
   '["3 comptes dédiés (TikTok, Reels, Shorts)", "Sous-titres, accroche et habillage soigné", "Calendrier de publication pensé pour chaque plateforme", "Validation des clips avant publication (si vous le souhaitez)", "Demandes particulières traitées en priorité"]'::jsonb,
   '["3 dedicated accounts (TikTok, Reels, Shorts)", "Captions, a hook and clean styling", "Publishing schedule designed for each platform", "Approve clips before they go live (if you want)", "Special requests handled first"]'::jsonb,
   $d$## Pour qui ?

Les créateurs déjà réguliers qui veulent être visibles partout où leur public regarde des vidéos courtes.

## Ce que vous recevez

- 360 clips verticaux par mois, soit 12 par jour, sur trois comptes.
- Des clips de 15 à 60 secondes, montés pour TikTok, Instagram Reels et YouTube Shorts.
- Un calendrier de publication adapté à chaque plateforme.
- Vos demandes particulières traitées en priorité.

## Comment ça se passe

Envoyez tous vos contenus longs : l'équipe en tire un maximum de moments forts. Les clips sont livrés sous 2 jours et vous suivez les résultats de chaque compte dans votre espace.

## Bon à savoir

Avec trois plateformes, chaque bon moment a trois chances de toucher un nouveau public.$d$,
   $d$## Who is it for?

Creators who already post regularly and want to be visible everywhere their audience watches short videos.

## What you get

- 360 vertical clips a month, 12 a day, across three accounts.
- Clips of 15 to 60 seconds, edited for TikTok, Instagram Reels and YouTube Shorts.
- A publishing schedule adapted to each platform.
- Your special requests handled first.

## How it works

Send all your long-form content: the team pulls out as many highlights as possible. Clips are delivered within 2 days and you follow each account's results in your space.

## Good to know

With three platforms, every great moment gets three chances to reach a new audience.$d$,
   30, true, false, false),
  ('elite', 'Élite', 'Elite',
   'Le volume maximum : 600 clips par mois, à 0,80 € le clip.', 'Maximum volume: 600 clips a month, at €0.80 per clip.',
   '20 clips par jour, 5 comptes, livraison sous 24 h.', '20 clips a day, 5 accounts, delivery within 24 h.',
   48000, 'EUR', 'mensuel'::public.billing_period, 600, 5, array['tiktok', 'instagram', 'youtube'], 1, '15 à 90 secondes', '15 to 90 seconds',
   '["5 comptes dédiés sur TikTok, Reels et Shorts", "Livraison sous 24 h", "Interlocuteur dédié et point mensuel sur les résultats", "Sous-titres, accroche et habillage soigné", "Validation des clips avant publication (si vous le souhaitez)"]'::jsonb,
   '["5 dedicated accounts on TikTok, Reels and Shorts", "Delivery within 24 h", "A dedicated contact and a monthly results review", "Captions, a hook and clean styling", "Approve clips before they go live (if you want)"]'::jsonb,
   $d$## Pour qui ?

Les gros streamers, podcasts et chaînes qui produisent beaucoup de contenu long et veulent occuper le terrain tous les jours.

## Ce que vous recevez

- 600 clips verticaux par mois, soit 20 par jour : 0,80 € le clip.
- Des clips de 15 à 90 secondes, du moment court et percutant à l'extrait plus long.
- Cinq comptes dédiés sur TikTok, Instagram Reels et YouTube Shorts.
- Livraison sous 24 heures et un interlocuteur dédié, avec un point mensuel sur vos résultats.

## Comment ça se passe

Vous envoyez vos vidéos au fil de l'eau. Une équipe de clippers travaille en continu sur votre chaîne, et votre interlocuteur ajuste la stratégie chaque mois selon ce qui marche le mieux.

## Bon à savoir

C'est l'offre au meilleur prix par clip : idéale si vous streamez souvent ou publiez de longs formats chaque semaine.$d$,
   $d$## Who is it for?

Big streamers, podcasts and channels that produce a lot of long-form content and want to own the feed every day.

## What you get

- 600 vertical clips a month, 20 a day: €0.80 per clip.
- Clips of 15 to 90 seconds, from short punchy moments to longer excerpts.
- Five dedicated accounts on TikTok, Instagram Reels and YouTube Shorts.
- Delivery within 24 hours and a dedicated contact, with a monthly results review.

## How it works

You send your videos as you go. A team of clippers works continuously on your channel, and your contact adjusts the strategy every month based on what works best.

## Good to know

This is the best price per clip: ideal if you stream often or publish long formats every week.$d$,
   40, true, false, false)
) as v
where not exists (select 1 from public.plans where not is_demo);

-- ---------------------------------------------------------------------------
-- FAQ : questions fréquentes supplémentaires
-- ---------------------------------------------------------------------------
insert into public.faq_items (audience, sort_order, is_top, question_fr, answer_fr, question_en, answer_en) values
  ('createur', 15, false, $q$Combien de temps dure un clip ?$q$,
   $q$Entre 15 et 60 secondes en général, jusqu'à 90 secondes avec l'offre Élite. On choisit la durée selon le moment : court et percutant pour une réaction, un peu plus long pour une histoire.$q$,
   $q$How long is a clip?$q$,
   $q$Usually between 15 and 60 seconds, up to 90 seconds with the Elite plan. We choose the length based on the moment: short and punchy for a reaction, a bit longer for a story.$q$),
  ('createur', 25, true, $q$Combien de clips vais-je recevoir ?$q$,
   $q$Cela dépend de votre offre : de 90 clips par mois (environ 3 par jour) avec Lancement, jusqu'à 600 par mois (20 par jour) avec Élite. Le détail de chaque offre est sur la page [Tarifs](/pricing).$q$,
   $q$How many clips will I get?$q$,
   $q$It depends on your plan: from 90 clips a month (about 3 a day) with Launch, up to 600 a month (20 a day) with Elite. Each plan's details are on the [Pricing](/pricing) page.$q$),
  ('createur', 35, false, $q$Et si je ne fais pas assez de lives ou de vidéos ?$q$,
   $q$Pas d'inquiétude : une seule vidéo longue peut donner beaucoup de clips. Si votre rythme change, vous pouvez passer à une offre plus petite ou plus grande au renouvellement.$q$,
   $q$What if I don't stream or post enough?$q$,
   $q$Don't worry: a single long video can produce many clips. If your pace changes, you can switch to a smaller or bigger plan at renewal.$q$),
  ('createur', 45, false, $q$Sur quelles plateformes publiez-vous ?$q$,
   $q$TikTok, Instagram Reels et YouTube Shorts. Le nombre de plateformes dépend de votre offre.$q$,
   $q$Which platforms do you publish on?$q$,
   $q$TikTok, Instagram Reels and YouTube Shorts. The number of platforms depends on your plan.$q$),
  ('createur', 55, false, $q$Comment choisissez-vous les moments à clipper ?$q$,
   $q$Nos clippers regardent vos contenus et cherchent ce qui fait réagir : un fou rire, une réaction forte, une info utile, une phrase qui marque. Vous pouvez aussi nous indiquer vos moments préférés.$q$,
   $q$How do you choose which moments to clip?$q$,
   $q$Our clippers watch your content and look for what gets reactions: a laugh, a strong reaction, useful info, a line that sticks. You can also point us to your favourite moments.$q$),
  ('createur', 65, false, $q$Les clips risquent-ils de nuire à ma chaîne principale ?$q$,
   $q$Non, au contraire : les clips sont publiés sur des comptes dédiés et renvoient vers vous. Ils font découvrir votre contenu à des personnes qui ne vous connaissaient pas et leur donnent envie de voir la suite.$q$,
   $q$Could clips hurt my main channel?$q$,
   $q$No, quite the opposite: clips are published on dedicated accounts and point back to you. They introduce your content to people who didn't know you and make them want to see more.$q$),
  ('createur', 75, false, $q$Que se passe-t-il avec la musique et les droits d'auteur ?$q$,
   $q$On évite les passages avec de la musique protégée ou du contenu qui ne vous appartient pas. Si un doute existe sur un moment, on ne le publie pas.$q$,
   $q$What about music and copyright?$q$,
   $q$We avoid parts with copyrighted music or content you don't own. If there's any doubt about a moment, we don't publish it.$q$),
  ('createur', 85, false, $q$Puis-je changer d'offre ?$q$,
   $q$Oui. Vous pouvez passer à une offre supérieure à tout moment, ou changer d'offre au moment du renouvellement. Écrivez-nous depuis votre espace.$q$,
   $q$Can I change plans?$q$,
   $q$Yes. You can move up to a bigger plan at any time, or switch plans at renewal. Write to us from your space.$q$),
  ('createur', 95, false, $q$Y a-t-il un prélèvement automatique ?$q$,
   $q$Non. Chaque mois, vous recevez un rappel avec une nouvelle référence, et vous renouvelez par virement. Rien n'est prélevé sans votre action.$q$,
   $q$Is there an automatic charge?$q$,
   $q$No. Each month, you get a reminder with a new reference, and you renew by bank transfer. Nothing is charged without your action.$q$),
  ('createur', 105, false, $q$Je streame en anglais (ou dans une autre langue), c'est possible ?$q$,
   $q$Oui, nous travaillons en français et en anglais. Pour une autre langue, écrivez-nous avant de commencer pour en parler.$q$,
   $q$I stream in another language, is that possible?$q$,
   $q$Yes, we work in French and English. For another language, write to us before you start so we can discuss it.$q$),
  ('createur', 115, false, $q$Que deviennent les comptes si j'arrête ?$q$,
   $q$Les conditions de transfert des comptes créés pour vous sont précisées dans nos [CGV](/legal/terms). Parlez-en avec l'équipe avant d'arrêter.$q$,
   $q$What happens to the accounts if I stop?$q$,
   $q$The transfer conditions for the accounts created for you are set out in our [terms of sale](/legal/terms). Talk to the team before stopping.$q$),
  ('clipper', 15, false, $q$Combien de clips puis-je faire par mois ?$q$,
   $q$Autant que tu veux, selon les missions disponibles et ton niveau. Plus tu livres des clips de qualité dans les délais, plus tu accèdes à des missions.$q$,
   $q$How many clips can I do a month?$q$,
   $q$As many as you want, depending on available missions and your level. The more quality clips you deliver on time, the more missions you unlock.$q$),
  ('clipper', 25, false, $q$Est-ce que je peux faire ça à côté de mes études ou de mon travail ?$q$,
   $q$Oui, c'est fait pour ça. Tu choisis tes missions selon ton temps libre, sans horaires imposés.$q$,
   $q$Can I do this alongside my studies or my job?$q$,
   $q$Yes, that's what it's made for. You pick your missions based on your free time, with no fixed hours.$q$);

-- ---------------------------------------------------------------------------
-- Fréquentation du site, sans cookie ni donnée personnelle : chaque visite
-- est comptée par jour et par page ; un visiteur est identifié par une
-- empreinte anonyme qui change chaque jour (impossible de le suivre).
-- ---------------------------------------------------------------------------
create table public.page_views (
  day date not null,
  path text not null check (char_length(path) between 1 and 200),
  views integer not null default 0,
  primary key (day, path)
);
create table public.daily_visitors (
  day date not null,
  visitor_hash text not null,
  referrer_host text,
  primary key (day, visitor_hash)
);
alter table public.page_views enable row level security;
alter table public.daily_visitors enable row level security;
create policy page_views_select on public.page_views for select to authenticated
  using (public.has_permission('reports.view_all'));
create policy daily_visitors_select on public.daily_visitors for select to authenticated
  using (public.has_permission('reports.view_all'));
grant select on public.page_views, public.daily_visitors to authenticated;
grant all on public.page_views, public.daily_visitors to service_role;

-- Enregistre une page vue (appelée par le serveur uniquement)
create or replace function public.track_page_view(p_path text, p_visitor_hash text, p_referrer_host text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.page_views as v (day, path, views) values (current_date, left(p_path, 200), 1)
  on conflict (day, path) do update set views = v.views + 1;
  insert into public.daily_visitors (day, visitor_hash, referrer_host)
  values (current_date, p_visitor_hash, nullif(left(coalesce(p_referrer_host, ''), 100), ''))
  on conflict (day, visitor_hash) do nothing;
end;
$$;
revoke execute on function public.track_page_view(text, text, text) from public, anon, authenticated;
grant execute on function public.track_page_view(text, text, text) to service_role;

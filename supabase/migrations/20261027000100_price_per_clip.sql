-- =============================================================================
-- Offres au prix unique de 0,99 € le clip, textes raccourcis, nouveau titre
-- d'accueil. Ne touche que les 4 offres proposées (repérées par leur adresse)
-- et les textes encore à leur valeur d'origine.
-- =============================================================================

update public.plans p set
  price_cents = v.price_cents,
  clips_per_period = v.clips,
  tagline_fr = v.tagline_fr,
  tagline_en = v.tagline_en,
  description_fr = v.description_fr,
  description_en = v.description_en,
  details_fr = v.details_fr,
  details_en = v.details_en
from (values
  ('lancement', 9900, 100,
   'Pour tester le clipping.', 'To try clipping.',
   'Environ 3 clips par jour sur TikTok.', 'About 3 clips a day on TikTok.',
   $d$## Pour qui ?

Pour découvrir le clipping avec un premier compte TikTok.

## Ce que vous recevez

- 100 clips par mois (environ 3 par jour).
- Des clips de 15 à 45 secondes, sous-titrés.
- 1 compte TikTok créé et géré pour vous.
- Livraison sous 3 jours.

## Le prix

100 clips × 0,99 € = 99 € par mois.$d$,
   $d$## Who is it for?

To discover clipping with a first TikTok account.

## What you get

- 100 clips a month (about 3 a day).
- 15 to 45 second clips, with captions.
- 1 TikTok account created and run for you.
- Delivery within 3 days.

## The price

100 clips × €0.99 = €99 a month.$d$),
  ('croissance', 19800, 200,
   'Grandir sur deux plateformes.', 'Grow on two platforms.',
   'Environ 7 clips par jour sur TikTok et YouTube Shorts.', 'About 7 clips a day on TikTok and YouTube Shorts.',
   $d$## Pour qui ?

Pour les créateurs qui publient chaque semaine et veulent toucher plus de monde.

## Ce que vous recevez

- 200 clips par mois (environ 7 par jour).
- Des clips de 15 à 60 secondes, sous-titrés.
- 2 comptes dédiés : TikTok et YouTube Shorts.
- Livraison sous 2 jours.

## Le prix

200 clips × 0,99 € = 198 € par mois.$d$,
   $d$## Who is it for?

For creators who post every week and want to reach more people.

## What you get

- 200 clips a month (about 7 a day).
- 15 to 60 second clips, with captions.
- 2 dedicated accounts: TikTok and YouTube Shorts.
- Delivery within 2 days.

## The price

200 clips × €0.99 = €198 a month.$d$),
  ('pro', 39600, 400,
   'Être partout, tous les jours.', 'Be everywhere, every day.',
   'Environ 13 clips par jour sur TikTok, Reels et Shorts.', 'About 13 clips a day on TikTok, Reels and Shorts.',
   $d$## Pour qui ?

Pour être visible partout où votre public regarde des vidéos courtes.

## Ce que vous recevez

- 400 clips par mois (environ 13 par jour).
- Des clips de 15 à 60 secondes, sous-titrés.
- 3 comptes dédiés : TikTok, Reels et Shorts.
- Livraison sous 2 jours, demandes traitées en priorité.

## Le prix

400 clips × 0,99 € = 396 € par mois.$d$,
   $d$## Who is it for?

To be visible everywhere your audience watches short videos.

## What you get

- 400 clips a month (about 13 a day).
- 15 to 60 second clips, with captions.
- 3 dedicated accounts: TikTok, Reels and Shorts.
- Delivery within 2 days, requests handled first.

## The price

400 clips × €0.99 = €396 a month.$d$),
  ('elite', 59400, 600,
   'Le volume maximum.', 'Maximum volume.',
   '20 clips par jour, 5 comptes, livraison sous 24 h.', '20 clips a day, 5 accounts, delivery within 24 h.',
   $d$## Pour qui ?

Pour les gros streamers et podcasts qui produisent beaucoup.

## Ce que vous recevez

- 600 clips par mois (20 par jour).
- Des clips de 15 à 90 secondes, sous-titrés.
- 5 comptes dédiés sur TikTok, Reels et Shorts.
- Livraison sous 24 h et un interlocuteur dédié.

## Le prix

600 clips × 0,99 € = 594 € par mois.$d$,
   $d$## Who is it for?

For big streamers and podcasts that produce a lot.

## What you get

- 600 clips a month (20 a day).
- 15 to 90 second clips, with captions.
- 5 dedicated accounts on TikTok, Reels and Shorts.
- Delivery within 24 h and a dedicated contact.

## The price

600 clips × €0.99 = €594 a month.$d$)
) as v (slug, price_cents, clips, tagline_fr, tagline_en, description_fr, description_en, details_fr, details_en)
where p.slug = v.slug;

update public.faq_items
set answer_fr = $q$Cela dépend de votre offre : de 100 clips par mois (environ 3 par jour) à 600 (20 par jour). Chaque clip coûte 0,99 €. Le détail est sur la page [Tarifs](/pricing).$q$,
    answer_en = $q$It depends on your plan: from 100 clips a month (about 3 a day) to 600 (20 a day). Each clip costs €0.99. Details are on the [Pricing](/pricing) page.$q$
where question_fr = $q$Combien de clips vais-je recevoir ?$q$;

update public.site_content
set value_fr = $c$Vos lives cachent des pépites. Peak en fait des clips.$c$,
    value_en = $c$Your streams hide gems. Peak turns them into clips.$c$
where key = 'home.hero.title' and value_fr = $c$On transforme les longues vidéos en clips qui font grandir les créateurs.$c$;
update public.site_content
set value_fr = $c$On découpe vos lives et vos vidéos en clips courts, publiés chaque jour sur TikTok, Reels et Shorts.$c$,
    value_en = $c$We cut your streams and videos into short clips, posted every day on TikTok, Reels and Shorts.$c$
where key = 'home.hero.lead' and value_fr like 'Peak Clipping Agency découpe%';

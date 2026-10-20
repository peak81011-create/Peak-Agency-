# Décisions et hypothèses

Ce fichier liste les choix faits pendant la construction, quand le cahier des charges laissait une marge. Chaque entrée dit **quoi** et **pourquoi**.

## Validé avec le propriétaire (avant la phase 1)

- **Factures** : numéro attribué par un compteur verrouillé dans la même transaction que la validation du paiement (pas de séquence Postgres, qui peut laisser des trous).
- **« Voir en tant que »** : rendu côté serveur avec les droits de la personne ciblée, en lecture seule. L'admin ne prend jamais la session de quelqu'un d'autre.
- **Liens externes** (YouTube, Drive, WeTransfer…) : enregistrés tels quels, le serveur ne télécharge rien.
- **Phases** : celles de la section 14 du cahier des charges.
- **Branche** : travail sur `claude/peak-clipping-agency-0cw2ey`, un commit par phase, pas de fusion dans `main` sans accord.
- **Monnaie** : euro par défaut. Les champs légaux (SIRET, TVA, adresse) sont vides tant que l'admin ne les a pas saisis.
- **Offres de démonstration** : marquées `is_demo` en base et signalées « démo » dans l'admin, pour penser à les remplacer.

## Technique

- **Next.js 16** (App Router). L'option `cacheComponents` est désactivée : l'application est surtout privée et dépend de la session ; le rendu dynamique classique est plus simple et plus sûr (aucun risque de mettre en cache une page d'un utilisateur). On pourra l'activer plus tard pour les pages publiques.
- **`proxy.ts`** (nouveau nom du middleware dans Next 16) : gère la langue (next-intl), rafraîchit la session Supabase et renvoie les visiteurs non connectés vers la connexion. Les vérifications de rôle et de permission sont faites côté serveur dans les pages et les actions, jamais seulement dans le proxy.
- **Adresses (URL)** : identiques en français et en anglais, avec des noms anglais (`/fr/pricing`, `/en/pricing`, `/fr/app`, `/fr/admin`). Des URL traduites (`/fr/tarifs`) obligeraient à déclarer chaque route deux fois ; on pourra les ajouter plus tard.
- **Espaces privés** : `/app` pour les clients, `/admin` pour toute l'équipe (owner, assistante, prospecteur, monteur). Chaque page de `/admin` vérifie la permission nécessaire ; le menu n'affiche que ce que la personne a le droit de voir.
- **Clés Supabase** : nouveaux noms « publishable key » (publique) et « secret key » (serveur). Les anciennes clés `anon` / `service_role` fonctionnent aussi dans les mêmes variables.
- **Composants shadcn/ui** : écrits directement dans `src/components/ui` (même principe que shadcn : code copié dans le projet, Radix + `class-variance-authority`), branchés sur les tokens de la maquette.
- **Design** : la maquette Claude Design (`/design`) est arrivée avant la phase 1. Ses tokens sont appliqués tels quels dans `src/styles/tokens.css`, le seul fichier à modifier pour changer couleurs, polices, rayons et ombres. Les écrans sont reproduits au fil des phases.
- **Logo** : le monogramme « P » de la maquette est dans `public/brand/logo.svg`. Il est affiché en une couleur (masque CSS) : remplacer le fichier suffit.
- **Types de la base** : `npm run db:types` génère les types TypeScript depuis Supabase local. En attendant, les lectures sont typées à la main là où c'est nécessaire.

## Sécurité et permissions

- **Une seule règle de permission**, écrite deux fois et testée des deux côtés : `public.has_permission()` en SQL (pour la RLS) et `resolvePermission()` en TypeScript. Le serveur ne recalcule pas les droits : il lit `my_permissions()` en base à chaque requête, donc un retrait de permission s'applique immédiatement.
- **Catalogue des permissions** : `src/lib/auth/permission-catalog.ts`, recopié dans la migration `..._reference_data.sql`. Un test vérifie que les deux sont identiques.
- **Owner** : il a toutes les permissions, mais **seulement après la double authentification** (session `aal2`). Cette condition est aussi dans la base : sans 2FA validée, un owner ne voit aucune donnée, même en appelant directement l'API Supabase.
- **2FA** : obligatoire pour les owners (le cahier des charges ; la maquette suggérait « obligatoire pour toute l'équipe »). Facultative pour les autres, mais exigée à chaque connexion dès qu'elle est activée. Supabase ne propose pas de codes de secours : en cas de perte du téléphone, un autre owner ou le support Supabase réinitialise la 2FA. L'option « faire confiance à cet appareil 30 jours » de la maquette n'est pas proposée (non prise en charge par Supabase).
- **Mot de passe** : 12 caractères minimum, au moins un chiffre et un symbole (règle de la maquette), vérifié côté navigateur, côté serveur et par Supabase (longueur).
- **Rôle d'un utilisateur** : lu dans `app_metadata` (modifiable seulement par le serveur), jamais dans les données saisies à l'inscription. Un utilisateur ne peut pas changer son propre rôle ; seul un owner peut nommer ou modifier un owner.
- **Colonnes protégées** : un client peut modifier son profil créateur, mais pas son statut, son offre ni ses dates d'abonnement (garde SQL `clients_guard`).
- **Notes internes** : dans une table séparée (`client_private_notes`), inaccessible au rôle client par construction.
- **Paramètres** (IBAN, infos légales) : table lisible uniquement avec `settings.update`. Le serveur expose à chaque client les seules valeurs utiles (ex. IBAN sur la page de paiement).
- **Permission `clients.read_all`** (ajoutée) : voir tous les clients sans attribution. Sans elle, un employé ne voit que les clients qui lui sont attribués.
- **Limitation des requêtes** : compteur en base (`rate_limit_hit`), qui fonctionne même avec plusieurs serveurs Vercel. En cas de panne de la base, l'action est refusée plutôt qu'autorisée.
- **Redirections** : après connexion ou lien e-mail, seules les adresses internes connues sont acceptées (pas de redirection ouverte).
- **Profils** : `profiles.id` est l'identifiant du compte Supabase (`auth.users.id`). Le cahier des charges prévoyait un champ `user_id` séparé, ce qui faisait doublon.
- **Permissions par défaut** : celles du cahier des charges, plus prudentes que la maquette (qui donnait par exemple la validation des paiements à l'assistante). L'admin peut tout ajuster dans la matrice.

## Tests

- **Tests de la base (RLS)** : exécutés sur un vrai Postgres avec une reproduction minimale de l'environnement Supabase (`tests/db/supabase-shim.sql`), et en CI sur le Postgres de Supabase local.
- **Parcours Playwright** : exécutés en CI (GitHub Actions) avec Supabase local. L'environnement de développement utilisé pour construire la phase 1 ne pouvait pas télécharger les images Docker de Supabase (réseau bloqué). La CI GitHub fait donc foi pour ces tests.

# Peak Clipping Agency — plateforme

Plateforme web de l'agence : site vitrine bilingue (FR/EN), espace client (paiement par virement, envoi de vidéos, suivi des clips), espace admin avec contrôle total, et espaces pour l'équipe (assistante, prospecteurs, monteurs).

> **État : phases 1 et 2 terminées (fondations, site public et paiement par virement).** Voir [Avancement](#avancement-et-reste-à-faire).

---

## Sommaire

1. [À retenir avant tout](#à-retenir-avant-tout)
2. [Architecture en bref](#architecture-en-bref)
3. [Lancer le projet sur votre ordinateur](#lancer-le-projet-sur-votre-ordinateur)
4. [Comptes de démonstration](#comptes-de-démonstration)
5. [Créer les vrais comptes (pas à pas)](#créer-les-vrais-comptes-pas-à-pas)
6. [Variables d'environnement](#variables-denvironnement)
7. [Commandes utiles](#commandes-utiles)
8. [Mettre en ligne et mettre à jour](#mettre-en-ligne-et-mettre-à-jour)
9. [Personnaliser](#personnaliser)
10. [Sauvegardes](#sauvegardes)
11. [Tests](#tests)
12. [Avancement et reste à faire](#avancement-et-reste-à-faire)

---

## À retenir avant tout

- **GitHub sert au code, pas aux données.** Les comptes, clients, clips et paiements sont dans **Supabase**. Les fichiers vidéo seront dans **Cloudflare R2**. Ne mettez jamais de données de clients ni de fichiers dans le dépôt Git.
- **Aucune clé secrète dans Git.** Les clés vont dans `.env.local` (sur votre ordinateur) et dans les réglages de Vercel (en ligne). Le fichier `.env.example` montre la liste, sans vraies valeurs.
- **Vercel gratuit (Hobby) = usage non commercial.** Pour le site d'une agence, il faudra très probablement l'offre **Pro**. Vérifiez les conditions actuelles : <https://vercel.com/docs/limits/fair-use-guidelines> et <https://vercel.com/pricing>.
- **Vidéos = R2, pas Supabase.** Sur l'offre gratuite de Supabase, la taille maximale d'un fichier est trop basse pour des vidéos. Supabase Storage ne sert qu'aux petits fichiers : preuves de virement, avatars, factures, miniatures.
- **Mots de passe des comptes TikTok / Instagram / YouTube : jamais sur le site.** Le site enregistre seulement une *référence* vers votre gestionnaire de mots de passe (par exemple « Bitwarden › Coffre Peak › TikTok Léa »). Une fuite du site ne peut donc pas exposer ces mots de passe. Un gestionnaire de mots de passe partagé (Bitwarden, 1Password) est fait pour ça : chiffrement, partage par personne, historique.

## Architecture en bref

| Brique | Rôle |
|---|---|
| **Next.js 16** (TypeScript) | Le site et l'application (pages, formulaires, actions serveur) |
| **Supabase** (région UE) | Base de données Postgres, comptes utilisateurs, double authentification, petits fichiers |
| **Row Level Security (RLS)** | Règles dans la base : chaque utilisateur ne peut lire et modifier que ce qui le concerne, même en appelant l'API Supabase directement |
| **Cloudflare R2** | Stockage des vidéos (sources et clips), envoyées directement depuis le navigateur *(phase 3)* |
| **Resend** | E-mails automatiques bilingues |
| **Vercel** | Hébergement, mise en ligne automatique à chaque modification sur GitHub |

Dossiers principaux :

```
design/                    Maquette Claude Design (référence visuelle)
messages/fr.json, en.json  Tous les textes de l'interface
public/brand/logo.svg      Le logo
src/styles/tokens.css      Couleurs, polices, rayons, ombres (design tokens)
src/app/[locale]/          Les pages (fr/en)
src/features/              Le code par fonctionnalité (auth, espace privé…)
src/lib/auth/              Permissions et fonction can()
supabase/migrations/       Structure de la base et règles d'accès (versionnées)
scripts/seed.ts            Données de démonstration
tests/                     Tests base de données et parcours Playwright
```

**Permissions.** Chaque permission s'écrit `ressource.action` (ex. `payments.validate`). Chaque rôle a des permissions par défaut. L'admin peut en ajouter ou en retirer à une personne précise. La même règle est appliquée par le serveur (`can()`) et par la base (RLS). Un retrait s'applique immédiatement. L'owner a tout, mais seulement après sa double authentification.

## Lancer le projet sur votre ordinateur

Prérequis (une seule fois) :

1. **Node.js 22** : <https://nodejs.org> (version « LTS »).
2. **Docker Desktop** : <https://www.docker.com/products/docker-desktop/>. Lancez-le avant de démarrer Supabase local.
3. **Git**, puis récupérez le code : `git clone <adresse du dépôt>` et ouvrez le dossier dans un terminal.

Ensuite :

```bash
npm install              # installe les dépendances (quelques minutes la 1re fois)
npm run supabase:start   # démarre Supabase local, applique les migrations, écrit .env.local
npm run storage:start    # (facultatif) stockage vidéo local MinIO, à la place de R2
npm run seed             # crée les comptes et données de démonstration
npm run dev              # lance le site sur http://localhost:3000
```

- Le site : <http://localhost:3000> (redirige vers `/fr`).
- La console Supabase locale (tables, utilisateurs) : <http://127.0.0.1:54323>.
- Les e-mails envoyés en local (confirmation, mot de passe oublié) arrivent dans une fausse boîte mail : <http://127.0.0.1:54324>.

Pour tout remettre à zéro : `npm run db:reset` (efface la base locale, réapplique les migrations et le seed).

## Comptes de démonstration

Créés par `npm run seed`. Mot de passe commun : **`Peak-Demo-2026!`**

| Rôle | E-mail | État |
|---|---|---|
| Owner (admin) | `owner@demo.peak.local` | Doit activer la double authentification à la 1re connexion |
| Assistante | `assistante@demo.peak.local` | Attribuée aux clients Léa et Hugo |
| Prospecteur | `prospecteur@demo.peak.local` | — |
| Monteur | `monteur@demo.peak.local` | Attribué à la cliente Léa |
| Client actif | `client.actif@demo.peak.local` | Léa Live : paiement validé, espace débloqué |
| Client à vérifier | `client.verif@demo.peak.local` | Hugo Gaming : preuve de virement à vérifier |
| Nouveau client | `client.nouveau@demo.peak.local` | Inès Talks : vient de s'inscrire, espace verrouillé |

Pour l'owner, installez une application d'authentification sur votre téléphone (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…), scannez le QR code affiché puis saisissez le code à 6 chiffres.

Le seed refuse de s'exécuter sur une base en ligne, sauf avec `npm run seed -- --force` (à réserver à un projet de test, jamais à la production).

## Créer les vrais comptes (pas à pas)

Faites-le dans cet ordre. Gardez les clés dans un endroit sûr (votre gestionnaire de mots de passe).

### 1. Supabase (base de données et comptes) — région UE obligatoire

1. Créez un compte sur <https://supabase.com> puis **New project**.
2. **Region** : choisissez une région en Europe, par exemple **Paris (eu-west-3)** ou **Frankfurt (eu-central-1)**. C'est obligatoire pour le RGPD et ne peut pas être changé ensuite.
3. Choisissez un mot de passe de base de données solide et gardez-le dans votre gestionnaire de mots de passe.
4. Une fois le projet créé, récupérez :
   - **Project Settings → Data API → Project URL** → variable `NEXT_PUBLIC_SUPABASE_URL` ;
   - **Project Settings → API Keys → Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ;
   - **Project Settings → API Keys → Secret key** → `SUPABASE_SECRET_KEY` (**secrète**, uniquement dans Vercel).
5. **Authentication → Sign In / Providers → Email** : laissez **Confirm email** activé. Mettez la longueur minimale du mot de passe à **12**.
6. **Authentication → Multi-Factor** : activez **TOTP (App Authenticator)**.
7. **Authentication → URL Configuration** :
   - **Site URL** : l'adresse de votre site (ex. `https://www.votre-domaine.fr`) ;
   - **Redirect URLs** : ajoutez `https://www.votre-domaine.fr/**`.
8. **Authentication → Emails → Templates** : pour **Confirm signup**, **Reset password** et **Invite user**, copiez le contenu des fichiers `supabase/templates/confirmation.html`, `recovery.html` et `invite.html`. Ces modèles envoient vers `/auth/confirm`, qui vérifie le lien côté serveur.
9. **Appliquer la structure de la base** (tables et règles) depuis votre ordinateur :
   ```bash
   npx supabase login
   npx supabase link --project-ref <identifiant du projet>   # visible dans l'URL du tableau de bord
   npx supabase db push                                       # applique supabase/migrations
   ```
10. **Créer votre compte owner** : inscrivez-vous sur le site, puis dans **Authentication → Users**, ouvrez votre utilisateur et modifiez son **App Metadata** en `{"role": "owner"}`. Enfin, dans **Table Editor → profiles**, passez votre ligne en `role = owner` et supprimez votre ligne dans **clients**. *(Un écran d'administration remplacera cette manipulation en phase 4.)*

### 2. Resend (e-mails automatiques)

1. Créez un compte sur <https://resend.com>.
2. **Domains → Add domain** : ajoutez votre domaine et choisissez la région **EU (Ireland)**. Copiez les enregistrements DNS indiqués chez votre fournisseur de domaine, puis attendez « Verified ».
3. **API Keys → Create API key** (permission « Sending access ») → variable `RESEND_API_KEY` (secrète).
   Renseignez aussi `EMAIL_FROM`, par exemple `Peak Clipping Agency <no-reply@votre-domaine.fr>` (adresse de votre domaine vérifié).
4. Pour que les e-mails de Supabase (confirmation, mot de passe) partent aussi de votre domaine : Supabase → **Authentication → Emails → SMTP Settings** → activez *Custom SMTP* avec hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = votre clé API Resend.

### 3. Cloudflare R2 (vidéos)

Les vidéos des clients (plusieurs Go) ne passent jamais par le site : le navigateur les envoie directement dans R2, en morceaux, avec une autorisation signée par le serveur pour un seul fichier. Si la connexion coupe, l'envoi reprend où il s'était arrêté.

1. Créez un compte sur <https://dash.cloudflare.com>, puis ouvrez **R2 Object Storage** (un moyen de paiement est demandé ; l'offre gratuite inclut 10 Go, et R2 ne facture pas les téléchargements).
2. **Create bucket** : nom `peak-videos`, **Location → Specify jurisdiction → European Union (EU)**. Laissez le bucket **privé** (ne pas activer « Public access »).
3. Ouvrez le bucket → **Settings → CORS policy → Add CORS policy**, et collez (en remplaçant l'adresse par celle de votre site ; ajoutez aussi `http://localhost:3000` si vous testez en local avec R2) :

   ```json
   [
     {
       "AllowedOrigins": ["https://votre-domaine.fr"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   `ETag` doit absolument être exposé : sans lui, les gros envois en plusieurs parties échouent.
4. Revenez à **R2 Object Storage → Manage R2 API Tokens → Create API token** : permission **Object Read & Write**, **Apply to specific buckets only → `peak-videos`**. Validez, puis notez :
   - **Access Key ID** → variable `S3_ACCESS_KEY_ID` ;
   - **Secret Access Key** → variable `S3_SECRET_ACCESS_KEY` (affichée une seule fois) ;
   - l'**endpoint « EU »** (de la forme `https://<identifiant>.eu.r2.cloudflarestorage.com`) → variable `S3_ENDPOINT`.
5. Dans Vercel, ajoutez aussi `S3_BUCKET=peak-videos` et `S3_REGION=auto`. Laissez `S3_FORCE_PATH_STYLE` vide.
6. (Facultatif) **Settings → Object lifecycle rules** : « Abort incomplete multipart uploads » après 7 jours, pour effacer les envois abandonnés.

Sans ces variables, le site fonctionne : les clients envoient alors leurs vidéos par lien (Google Drive, Dropbox, WeTransfer…), et l'envoi de fichiers est grisé avec une explication.

### 4. Vercel (mise en ligne)

1. Créez un compte sur <https://vercel.com> avec votre compte GitHub. Pour un usage commercial, passez à l'offre **Pro**.
2. **Add New → Project** → importez ce dépôt GitHub. Framework : Next.js (détecté automatiquement).
3. **Settings → Environment Variables** : saisissez chaque variable de `.env.example` avec ses vraies valeurs (`NEXT_PUBLIC_SITE_URL` = l'adresse finale du site). Pour `CRON_SECRET`, générez un long texte aléatoire avec votre gestionnaire de mots de passe : Vercel s'en sert pour lancer chaque jour la tâche des abonnements (rappels, délai de grâce, lecture seule), déclarée dans `vercel.json`.
4. **Settings → Functions → Function Region** : choisissez **Paris (cdg1)** ou **Frankfurt (fra1)**, près de la base Supabase.
5. **Settings → Domains** : ajoutez votre nom de domaine et suivez les instructions DNS.
6. Chaque modification poussée sur GitHub est mise en ligne automatiquement. Chaque branche a sa propre adresse de prévisualisation.

## Variables d'environnement

La liste complète, commentée, est dans [`.env.example`](.env.example).

| Variable | Où la trouver | Secrète ? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | L'adresse de votre site | Non |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Data API | Non |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys | Non (la sécurité vient de la RLS) |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys | **Oui** |
| `RESEND_API_KEY` | Resend → API Keys | **Oui** |
| `EMAIL_FROM` | Une adresse de votre domaine vérifié dans Resend | Non |
| `CRON_SECRET` | Texte aléatoire que vous générez | **Oui** |
| `S3_ENDPOINT` | Cloudflare R2 → endpoint EU du compte | Non |
| `S3_ACCESS_KEY_ID` | Cloudflare R2 → API token | **Oui** |
| `S3_SECRET_ACCESS_KEY` | Cloudflare R2 → API token | **Oui** |
| `S3_BUCKET` | Nom du bucket (`peak-videos`) | Non |
| `S3_REGION` | `auto` pour R2 | Non |

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Lance le site en local |
| `npm run supabase:start` / `npm run supabase:stop` | Démarre / arrête Supabase local |
| `npm run seed` | Crée les données de démonstration |
| `npm run storage:start` / `npm run storage:stop` | Démarre / arrête le stockage vidéo local (MinIO, compatible R2) |
| `npm run db:reset` | Remet la base locale à zéro (migrations + seed) |
| `npm run db:types` | Génère les types TypeScript de la base |
| `npm run lint` / `npm run typecheck` | Vérifie le code |
| `npm test` | Tests de logique (et tests RLS si `TEST_DATABASE_URL` est défini) |
| `npm run test:db` | Tests des règles d'accès sur Supabase local |
| `npm run test:e2e` | Parcours complets dans un navigateur (Playwright) |
| `npm run build` | Construit la version de production |

## Mettre en ligne et mettre à jour

- **Code** : poussez sur GitHub → Vercel met en ligne.
- **Base de données** : une modification de structure se fait **toujours** par un nouveau fichier dans `supabase/migrations`, jamais à la main dans le tableau de bord. Pour l'appliquer en production : `npx supabase db push`.
- La CI GitHub (`.github/workflows/ci.yml`) vérifie chaque modification : lint, types, tests, build, puis parcours Playwright sur Supabase local.

## Personnaliser

- **Logo** : remplacez `public/brand/logo.svg`. Il est affiché en une seule couleur, adaptée au fond.
- **Couleurs, polices, rayons, ombres** : tout est dans `src/styles/tokens.css`. Les polices se chargent dans `src/app/fonts.ts`.
- **Textes de l'interface** : `messages/fr.json` et `messages/en.json`. Les tarifs, coordonnées bancaires, infos légales et textes de l'accueil seront modifiables depuis l'admin.
- **Ajouter une langue** (ex. espagnol) :
  1. ajoutez `"es"` dans `src/i18n/routing.ts` ;
  2. copiez `messages/en.json` en `messages/es.json` et traduisez chaque texte ;
  3. ajoutez `"es"` dans la contrainte `locale` de la table `profiles` (nouvelle migration) ;
  4. ajoutez les colonnes `_es` aux contenus bilingues (offres, contenu du site) ;
  5. un test vérifie que tous les fichiers de langue ont les mêmes clés.

## Sauvegardes

- **Supabase** : l'offre Pro fait une sauvegarde quotidienne automatique (7 jours conservés). L'offre gratuite n'en fait pas : exportez régulièrement la base avec `npx supabase db dump -f sauvegarde.sql` (structure) et `npx supabase db dump --data-only -f donnees.sql` (données), à conserver hors de GitHub, dans un stockage chiffré.
- **R2** : activez le *versioning* ou une copie vers un second bucket si les clips doivent être conservés longtemps.
- **Factures** : à conserver 10 ans (obligation légale). Elles ne sont jamais supprimées, même quand un client supprime son compte.

## Tests

- **Logique** (Vitest) : `npm test`.
- **Règles d'accès** (RLS) : `npm run test:db` avec Supabase local démarré. Ces tests vérifient par exemple qu'un client ne peut lire aucune donnée d'un autre client, même en appelant la base directement.
- **Parcours** (Playwright) : `npm run build`, puis `npm run test:e2e` avec Supabase local démarré et le seed exécuté.

## Premiers réglages dans l'admin (avant le premier client)

Connecté en owner, dans le menu de gauche :

1. **Paramètres → Entreprise** : raison sociale, forme juridique, SIRET, adresse, mention de TVA (à choisir avec votre comptable), hébergeur. Ces informations apparaissent sur les factures et dans les mentions légales. Rien n'est rempli à votre place.
2. **Paramètres → Coordonnées bancaires** : titulaire, IBAN, BIC (l'IBAN est vérifié). Ils s'affichent aux clients sur la page de paiement.
3. **Paramètres → Facturation** : préfixes des références et des factures, délai de grâce, jours de rappel avant échéance.
4. **Offres & tarifs** : remplacez ou masquez les 3 offres marquées « Démo ».
5. **Contenu du site** : relisez les textes de l'accueil, ajoutez vos questions fréquentes, et **complétez puis faites relire les pages légales** (ce sont des modèles).

## Avancement et reste à faire

| Phase | Contenu | État |
|---|---|---|
| 1. Fondations | Next.js, design tokens, FR/EN, Supabase + RLS, authentification + 2FA, rôles et `can()`, seed, CI | ✅ |
| 2. Site public + paiement | Vitrine, tarifs, contact, pages légales, parcours virement → validation → déblocage, factures PDF, e-mails, rappels de renouvellement | ✅ |
| 3. Cœur de l'agence | Clients, vidéos (R2), clips (Kanban), comptes de diffusion, demandes, tableau de bord client | ✅ |
| 4. Équipe | Tâches, espaces assistante et monteur, rémunération, matrice des permissions, « voir en tant que », journal | À faire |
| 5. Prospection | Prospects, pipeline, modèles de messages, import CSV, conversion, API pour agent IA | À faire |
| 6. Statistiques et finitions | Stats, graphiques, notifications, tâches planifiées, exports, accessibilité, mobile | À faire |

Plus tard (hors périmètre actuel) : agent IA de prospection, synchronisation automatique des statistiques via les API officielles de TikTok, YouTube et Instagram (soumises à validation par les plateformes), paiement par carte si besoin.

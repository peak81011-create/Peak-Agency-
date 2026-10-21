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

## Phase 2 — site public et paiement par virement

- **Référence de paiement** : `PEAK-AAAA-NNNN` (format du cahier des charges, compteur par année). Le préfixe se règle dans Paramètres. La maquette proposait `PEAK-{INITIALES}-{AAMM}` : moins sûr (deux clients aux mêmes initiales) et non unique en cas de renouvellement.
- **Un seul paiement « ouvert » par client** (en attente, à vérifier ou refusé). Changer d'offre avant le dépôt garde la même référence. Après un refus, le client redépose une preuve sur le même paiement.
- **Renouvellement** : au rappel (7 jours avant la fin, réglable), un nouveau paiement est ouvert avec une **nouvelle référence**. Validé pendant le délai de grâce, la nouvelle période suit l'ancienne sans trou ; validé plus tard, elle démarre le jour de la validation.
- **Durée d'une période** : du jour de départ au même jour du mois suivant moins un jour (ex. 21/10 → 20/11). Une offre « unique » n'expire pas.
- **Factures** : numéro `F-AAAA-NNNN` (préfixe réglable), continu par année, attribué dans la même transaction que la validation (aucun trou possible). Les informations du vendeur et de l'acheteur sont figées dans la facture au moment de l'émission. Une facture ne peut être ni modifiée ni supprimée (garde en base). La facture est rédigée en français (langue légale), avec des libellés anglais en complément.
- **Informations légales incomplètes** : l'admin est alerté (paiements, paramètres), mais la validation n'est pas bloquée, pour ne pas empêcher l'encaissement. Il faut les compléter avant le premier vrai client.
- **Preuve de virement** : envoyée directement du navigateur vers le stockage privé de Supabase, via une URL signée à usage unique (les fonctions Vercel limitent la taille des envois à 4,5 Mo). Formats PNG, JPG, WEBP, PDF, 10 Mo maximum, contrôlés par le navigateur, le serveur et le stockage. La base vérifie que le fichier existe et appartient bien au paiement.
- **Validation par l'admin** : trois cases à cocher (montant, référence, réception sur le compte) avant de pouvoir valider, et le rappel « une capture ne prouve rien » toujours affiché.
- **Qui voit quoi** : une personne ayant `payments.validate` voit l'identité de tous les clients (nécessaire pour vérifier un virement), mais pas leurs vidéos ni leurs clips, qui restent liés à l'attribution.
- **Espace verrouillé** : avant validation, le client n'accède qu'à son profil créateur, au choix de l'offre, au paiement et à « Mon compte ». La page « Abonnement & factures » s'ouvre après validation. Le blocage des envois en lecture seule s'appliquera aux pages de la phase 3.
- **E-mails** : un gabarit unique, textes dans les fichiers de traduction (`emails`), envoyés dans la langue de chaque destinataire. Sans clé Resend, ils sont écrits dans le journal du serveur. Les préférences (couper un type d'e-mail) sont prévues en base ; l'écran de réglage arrive en phase 6.
- **Contact** : champ piège invisible + 5 messages par heure et par adresse IP. Le message est enregistré, les personnes ayant `requests.manage` sont notifiées, ainsi que l'e-mail de notification de l'agence s'il est renseigné.
- **Bandeau cookies** : aucun, car le site n'utilise que des cookies indispensables (session, langue). À ajouter si un outil de mesure d'audience est installé.
- **Contenu du site** : textes de l'accueil, FAQ, chiffres, témoignages et pages légales modifiables par l'admin, en FR et EN. Les chiffres et témoignages sont vides par défaut, donc masqués (jamais de faux chiffres ni de faux avis). La FAQ ne contient que des réponses vraies quel que soit votre fonctionnement. Les pages légales sont des **modèles à compléter et à faire relire** ; les informations de l'entreprise s'affichent depuis les paramètres, et les champs vides apparaissent « À compléter ».
- **Offres** : enregistrer une offre de démonstration la transforme en offre réelle (le badge « Démo » disparaît). Une offre ne se supprime pas (l'historique des paiements y fait référence) : on la masque.
- **Tâche quotidienne** : `/api/cron/subscriptions`, chaque jour à 6 h UTC (Vercel Cron), protégée par `CRON_SECRET`. Elle envoie les rappels, puis passe les clients en délai de grâce et en lecture seule.
- **Hébergement Vercel** : région `cdg1` (Paris) fixée dans `vercel.json`, près de la base Supabase en UE.

## Phase 3 — cœur de l'agence

- **Envoi des vidéos** : directement du navigateur vers R2 (Uppy), en plusieurs parties au-delà de 100 Mo, reprise automatique après coupure ou rechargement. Le serveur ne signe une requête que pour une clé qu'il a lui-même préparée pour cet utilisateur (table `pending_uploads`, accessible au seul serveur) ; à la fin, il vérifie la taille réelle du fichier avant de marquer la vidéo « reçue ». Taille maximale réglable (10 Go par défaut). Formats : MP4, MOV, WEBM, MKV, AVI.
- **Téléchargements** : liens signés valables 15 minutes, délivrés seulement si la personne peut lire la fiche (même règle que la base).
- **En local et en CI**, un petit serveur compatible S3 (s3rver, sans Docker) remplace R2. Sans stockage configuré, seul l'envoi par lien est proposé.
- **Liens externes** : seulement enregistrés (https uniquement), jamais téléchargés par le serveur. L'hébergeur est reconnu pour l'affichage.
- **Clips et validation client** : un clip « à valider » attend le client si son abonnement l'exige (réglage par client dans sa fiche, désactivé par défaut) ; sinon il passe directement à « validé ». Une demande de modification exige un commentaire et renvoie le clip « en montage ». Les clips rejetés ne sont pas montrés au client.
- **Monteurs** : ils voient tous les clips des clients qui leur sont attribués, mais ne modifient que ceux dont ils sont le monteur (owner et assistante : tous).
- **Commentaires** : un seul système (clips, demandes, vidéos, fiche client). Les notes internes de la fiche client sont des commentaires internes ; un commentaire interne n'est jamais lisible par le client (règle en base).
- **Comptes sociaux** : aucun mot de passe enregistré. Seule la référence de l'entrée dans le gestionnaire de mots de passe est conservée, dans une table séparée invisible pour le client.
- **Statistiques** : saisies à la main pour l'instant (relevés datés par clip et par compte) ; la synchronisation automatique via les API officielles est prévue plus tard.
- **Abonnement géré par l'agence** : changer d'offre, prix personnalisé, prolonger (réactive un client en lecture seule), suspendre, archiver. Chaque action est journalisée.
- **Invitation d'un client par l'agence** : e-mail Supabase d'invitation ; le client choisit son mot de passe puis complète son profil et suit le parcours de paiement habituel.
- **Demandes** : numérotées `#R-N`. Le client ne peut ni les attribuer ni changer leur statut, seulement les clore. L'agence peut transformer une demande en clip.

## Deux parcours : créateurs et clippers (mise à jour du cahier des charges)

- **Rôle `editor` renommé `clipper`** partout (base, code, interface), ainsi que `clips.editor_id` → `clipper_id`. Le compte de démonstration devient `clipper@demo.peak.local`.
- **Textes & engagements** : les délais, montants et conditions (`{delai_reponse}`, `{minimum_par_clip}`…) sont dans `settings.commitments`, modifiables dans Admin → Paramètres. Montants stockés en centimes. Aucune valeur par défaut inventée (seul l'âge minimum vaut 18).
- **Règle d'honnêteté appliquée par le code** : un texte qui utilise une variable vide n'est pas affiché (`fillVars` renvoie null) ; une question de FAQ dont la réponse dépend d'une variable vide est masquée. La vue d'ensemble de l'admin liste ces variables dans « À compléter avant la mise en ligne », avec les offres « démo » et les informations légales manquantes.
- **Calcul des gains** : une seule fonction `calculerGainClip()` (src/lib/earnings/calculate.ts), testée, utilisée par le simulateur public et (phase 4) par l'espace clipper et les relevés. Ordre : minimum + prime aux 1 000 vues, puis plafond, puis coefficient de niveau. Sans relevé de vues, seul le minimum compte. Le simulateur n'apparaît que si minimum, prime et jours de comptage sont renseignés.
- **Adresses traduites** : les pages existent sous leur nom anglais (/en/creators, /en/help…) ; les adresses françaises (/fr/createurs, /fr/tarifs, /fr/clippers/postuler, /fr/aide) sont des réécritures déclarées dans next.config.ts (src/lib/public-paths.ts). /fr/pricing et /fr/join restent valides (la seconde redirige).
- **FAQ** : table `faq_items` (public créateur / clipper / tous, FR et EN, ordre, visible, « question fréquente »), éditable dans Admin → FAQ, avec le décompte des votes « utile ». Les votes sont anonymes, limités par adresse IP. Les liens internes s'écrivent [libellé](/page). L'ancienne FAQ de l'accueil (contenu du site) est supprimée.
- **Bouton « Besoin d'aide ? »** sur toutes les pages : recherche par mots-clés (accents ignorés), 3 questions fréquentes du public concerné (clippers sur les pages clippers et pour le rôle clipper), et « Contacter l'équipe » qui mène à la page Aide. Les tickets du service client (complément de la phase 3) remplaceront le formulaire de contact pour les personnes connectées.
- **Candidature clipper** : nouveau formulaire (pseudo, prénom, âge minimum, pays, langues, 1 à 5 exemples, logiciels, expérience, disponibilité, motivation, confidentialité), accusé de réception par e-mail. Statuts : reçue → clip test envoyé → clip test reçu → acceptée / refusée. Le recrutement complet (envoi du clip test, création du compte) est en phase 4.
- **Niveaux** : table `clipper_levels` (Nouveau, Confirmé, Expert) avec conditions et coefficient de rémunération vides par défaut (coefficient 1) ; l'écran d'édition arrive en phase 4.
- **Ton** : vouvoiement pour les créateurs, tutoiement pour les clippers (FR) ; « you » en anglais.
- **Nouvelle page légale** « Conditions clippers » (modèle à compléter, éditable dans Contenu du site).

## Service client (complément de la phase 3)

- **Tickets** pour toute personne connectée (créateur, clipper, équipe), depuis « Aide » dans le menu, le bouton « Besoin d'aide ? » ou la page Aide. Les visiteurs non connectés utilisent le formulaire de contact, visible dans la même boîte de réception (onglet « Formulaire de contact »).
- **Statuts** : ouvert → en cours → en attente de votre réponse → résolu. Ils changent automatiquement : une réponse de l'équipe met le ticket « en attente de votre réponse » (et enregistre la première réponse), une réponse de l'utilisateur le repasse « en cours ». Un ticket résolu se rouvre pendant 7 jours ; ensuite, il faut en ouvrir un nouveau.
- **Suggestions de la FAQ** pendant la saisie du titre (3 réponses, recherche par mots-clés, accents ignorés).
- **Retard** : le délai de réponse saisi en texte (« 24 h », « 2 jours ») est converti en heures ; un ticket en attente de l'équipe depuis plus longtemps passe en rouge en haut de la liste. Sans délai renseigné, rien n'est signalé.
- **Notes internes** jamais lisibles par l'auteur (règle en base). **Réponses enregistrées** FR/EN : la version de la langue de l'utilisateur est insérée.
- **Permission** `support.manage` (nouvelle), accordée par défaut à l'assistante. La note de satisfaction (1 à 5) est enregistrée ; les statistiques (délai moyen, note moyenne) arrivent en phase 6.

## Offres, pages longues, transition et fréquentation (demande du propriétaire)

- **4 offres proposées** (modifiables dans Admin → Offres & tarifs), ajoutées par la migration seulement si aucune offre réelle n'existe :
  Lancement 149 €/mois (90 clips, 1 compte TikTok, 15–45 s, livraison 3 j) ;
  Croissance 279 €/mois (200 clips, 2 comptes TikTok + Shorts, 15–60 s, 2 j, « le plus choisi ») ;
  Pro 399 €/mois (360 clips, 3 comptes TikTok + Reels + Shorts, 15–60 s, 2 j) ;
  Élite 480 €/mois (600 clips = 0,80 € le clip, 5 comptes, 15–90 s, 24 h, interlocuteur dédié).
  Prix par clip dégressif (1,66 € → 0,80 €) : accessible aux petits créateurs, sans brader le travail.
- **Page détaillée par offre** (/fr/tarifs/croissance…) : chiffres clés, description, « ce qui vous engage » (abonnement mensuel, pas de prélèvement automatique : renouvellement par virement, ce qui correspond au fonctionnement réel de la plateforme), étapes pour démarrer, autres offres. Nouveaux champs d'offre : adresse (slug), accroche, durée des clips, description détaillée.
- **Transition** : rideau vert qui descend du haut de l'écran avec le logo Peak au centre, puis continue sa descente pour dévoiler la page (≈ 1 s au total). Utilisée sur les offres et les grandes portes de l'accueil ; désactivée si l'appareil demande moins d'animations.
- **Pages allongées** : « C'est quoi le clipping ? » (avec schéma), « Ce qu'un clip peut vous rapporter », « Avec ou sans nous », « Pour qui ? », « Ce qui se passe après votre live », métier de clipper et mission type, questions fréquentes déjà ouvertes. Aucun chiffre de résultat inventé.
- **FAQ** : 13 questions supplémentaires (durée et nombre de clips, droits d'auteur, changement d'offre, prélèvement, langues…).
- **Fréquentation** (Admin → Fréquentation, permission reports.view_all) : pages vues et visiteurs uniques par jour, sans cookie ni donnée personnelle. Un visiteur est une empreinte hachée (IP + navigateur + date + secret) qui change chaque jour : impossible de le reconnaître ou de le suivre ; aucun bandeau cookies n'est nécessaire. Les robots sont ignorés. Variable facultative `ANALYTICS_SALT`.
- **Tous les comptes** (Admin → Tous les comptes, permission users.manage) : liste de tous les comptes (créateurs, clippers, équipe), recherche, rôle, dernière visite. La modification des rôles et « voir en tant que » arrivent en phase 4.


## Prix unique de 0,99 € le clip et nouvel accueil

- Les 4 offres passent à 0,99 € le clip, avec des volumes ronds : Lancement 100 clips = 99 €, Croissance 200 = 198 €, Pro 400 = 396 €, Élite 600 = 594 €. Chaque bulle affiche le calcul (« 200 clips × 0,99 € = 198,00 € »). Migration `20261027000100_price_per_clip.sql` : ne modifie que les 4 offres repérées par leur adresse (slug).
- Accueil refait sur le modèle demandé (en-tête flottant blanc, gros titre centré, bouton « pilule » en dégradé vert, trois garanties, tuiles flottantes) en gardant la palette Peak. Le titre « Phrase 1. Phrase 2. » met la seconde phrase en couleur.
- Textes raccourcis (accueil, blocs, offres, créateurs, clippers) : une phrase courte par idée.

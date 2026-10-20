# Peak Clipping Agency — dossier `/design`

Maquette complète de la plateforme (site public, espace client, admin, espaces employés), desktop + mobile.
À placer à la racine du projet dans `/design`. Cible : **Next.js (App Router) + Tailwind + shadcn/ui**.

## Contenu

| Fichier | Rôle |
|---|---|
| `project/peak.css` | **Source de vérité** : tokens (couleurs, typo, espacements, rayons, ombres), classes de composants, icônes, règles responsive. |
| `project/Main.dc.html` | Planche des tokens + mapping des statuts. |
| `project/Components.dc.html` | Bibliothèque de composants (boutons, champs, badges, stats, tableau, Kanban, calendrier, upload, modale, toasts, notifications, états, bandeaux, test EN +20 %). |
| `project/States.dc.html` | États vide / chargement / erreur des écrans principaux. |
| `project/AppNav`, `AppTopbar`, `SiteHeader`, `SiteFooter` | Composants partagés (layout). |
| `project/*.dc.html` | Un fichier par écran. HTML lisible : la structure, les classes et les données d'exemple sont dans le fichier. |
| `project/M_*.dc.html` | Planches mobiles (les mêmes écrans rendus à 390 px). |

Ouvrir un `.dc.html` : le balisage visible est entre `<x-dc>` et `</x-dc>`. Les `{{…}}` et les `<sc-for>`/`<sc-if>` sont des boucles/conditions ; les données d'exemple sont dans `renderVals()` en bas du fichier.

## Règles d'implémentation

1. **Tokens** → `tailwind.config` (`theme.extend.colors.forest/sage`, `fontFamily.display/ui/mono`, `borderRadius`, `boxShadow`) + variables CSS shadcn (`--primary: forest-900`, `--accent: sage-400`, `--ring: forest-600`, `--radius: 10px`).
2. **Polices** : `next/font/google` → Archivo (axe `wdth`, titres en `font-stretch: 108–120%`), Inter (UI, `tabular-nums` pour les chiffres), JetBrains Mono (IBAN, références).
3. **Responsive** : la maquette utilise des *container queries* (`@container page`). Points de rupture : mobile < 760 px, tablette 760–1080 px. En Tailwind : `@container` sur le layout + `@max-[760px]:` / `@max-[1080px]:`, ou les breakpoints `md`/`lg` équivalents.
   - Mobile : la sidebar devient une barre (logo, titre, FR/EN, cloche) + onglets défilants ; tableaux `.tbl-cards` → cartes empilées ; cibles ≥ 44 px ; champs en 16 px.
4. **Statuts** : un composant `<StatusBadge type="clip|payment|task|prospect" value="…" />` qui mappe vers les classes `.st-*` (voir `Main.dc.html`, section 03). Ne jamais afficher un statut par la couleur seule.
5. **Icônes** : les classes `.ic-*` sont des masques temporaires → remplacer par `lucide-react` (home, film/clapperboard, upload, users, at-sign, inbox, message-square, credit-card, landmark, bell, search, check, x, copy, chevron-*, plus, calendar, list, layout-grid, kanban, sliders, shield, tag, line-chart, clock, lock, alert-triangle, info, link, eye, send, external-link, play, menu, globe, target, euro, trending-up, file, image, refresh-cw, mail, filter, more-horizontal, log-out, key, smartphone, scissors, list-checks, flag, trash, pencil).
6. **Logo** : le monogramme P est vectorisé (`viewBox 0 0 268 594`, `fill-rule: evenodd`) — le copier tel quel dans `components/logo.tsx`. Remplacer par le SVG officiel si vous l'avez.
7. **i18n FR/EN** : sélecteur dans tous les en-têtes (`next-intl` recommandé). Aucun libellé à largeur fixe ; prévoir +20 % en anglais (voir la section « Test de longueur » de `Components.dc.html`). Les offres ont des champs FR/EN séparés (`AdminOffers`).
8. **Rôles** : `owner`, `assistant`, `prospector`, `editor`, `client`. Navigation par rôle dans `AppNav.dc.html` (`cfg` dans `renderVals`). Matrice de permissions par défaut dans `AdminRoles.dc.html`.

## Routes proposées

```
/(public)        /, /tarifs, /contact, /legal/[slug], /connexion, /inscription, /mot-de-passe, /2fa
/app/onboarding  profil → offre → paiement (virement)
/app             tableau de bord client · /clips · /clips/[id] · /envoyer · /comptes · /demandes · /abonnement
/admin           vue d'ensemble · /clients · /clients/[id] · /paiements · /clips · /comptes · /demandes · /equipe · /taches · /prospection · /roles · /offres · /parametres
/equipe          /taches (assistante) · /prospection · /prospects/[id] · /montage · /montage/[id] · /gains
```

## Points de vigilance

- **Paiement par virement** : référence unique `PEAK-{INITIALES}-{AAMM}` (format réglable dans Paramètres). Espace client verrouillé tant que le paiement n'est pas validé ; refus = motif + redépôt.
- **Vérification admin** : toujours afficher le rappel « Vérifiez votre compte bancaire avant de valider ».
- **Upload de gros fichiers** (jusqu'à 20 Go) : upload multipart / reprise (ex. S3 multipart, tus), progression + reprise affichées.
- **Mode « voir en tant que »** : bandeau sauge en haut, toutes les actions désactivées.
- **Abonnement expiré** : bandeau ambre « lecture seule », envoi et demandes désactivés.
- Valeurs entre crochets `[XXX]` = à renseigner (prix, délais, quotas, mentions légales, chiffres de l'accueil). Les chiffres des espaces privés sont des données d'exemple.

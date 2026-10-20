-- =============================================================================
-- Contenu par défaut du site (modifiable par l'admin : Admin → Contenu du site).
-- Aucun chiffre, avis ou information légale inventés : chiffres et témoignages
-- sont vides (sections masquées), les pages légales sont des modèles à compléter.
-- =============================================================================

insert into public.site_content (key, value_fr, value_en) values
  ('home.hero.eyebrow', $c$Agence de clipping pour créateurs$c$, $c$Clipping agency for creators$c$),
  ('home.hero.title', $c$Vos lives, découpés en clips qui font des vues.$c$, $c$Your streams, cut into clips that get views.$c$),
  ('home.hero.lead', $c$On regarde vos lives et vos vidéos longues, on en tire les meilleurs moments au format vertical, puis on les publie chaque jour sur des comptes TikTok, Reels et Shorts créés pour vous.$c$, $c$We watch your streams and long videos, pull out the best moments in vertical format, then publish them every day on TikTok, Reels and Shorts accounts created for you.$c$),
  ('home.how.title', $c$Vous créez. On s'occupe du reste.$c$, $c$You create. We handle the rest.$c$),
  ('home.how.lead', $c$Quatre étapes, un seul espace pour tout suivre.$c$, $c$Four steps, one space to follow everything.$c$),
  ('home.steps', $c$[{"title": "Envoi des vidéos", "body": "Déposez vos lives et vidéos longues dans votre espace, ou collez simplement un lien. Ajoutez vos notes et vos priorités."}, {"title": "Découpage", "body": "Nos monteurs repèrent les meilleurs moments, les recadrent en vertical, ajoutent sous-titres et accroche. Vous validez ou demandez une modification."}, {"title": "Publication", "body": "Les clips sont programmés et publiés sur des comptes dédiés créés pour vous, aux heures où votre audience est active."}, {"title": "Croissance", "body": "Suivez vues, abonnés gagnés et clips à venir depuis votre tableau de bord. On ajuste selon ce qui marche."}]$c$, $c$[{"title": "Send your videos", "body": "Upload your streams and long videos to your space, or simply paste a link. Add your notes and priorities."}, {"title": "Editing", "body": "Our editors spot the best moments, reframe them vertically, add captions and a hook. You approve or ask for changes."}, {"title": "Publishing", "body": "Clips are scheduled and published on dedicated accounts created for you, when your audience is active."}, {"title": "Growth", "body": "Track views, followers gained and upcoming clips from your dashboard. We adjust based on what works."}]$c$),
  ('home.stats', $c$[]$c$, $c$[]$c$),
  ('home.testimonials', $c$[]$c$, $c$[]$c$),
  ('home.faq', $c$[{"q": "Quelles vidéos puis-je envoyer ?", "a": "Lives, podcasts, vlogs, vidéos YouTube : tout format long. Déposez le fichier directement dans votre espace, même très lourd, ou envoyez un lien."}, {"q": "Est-ce que je valide les clips avant publication ?", "a": "Si vous le souhaitez, oui. Chaque clip passe alors par « à valider » dans votre espace : vous le validez ou demandez une modification avec un commentaire."}, {"q": "Comment se passe le paiement ?", "a": "Par virement bancaire. Vous recevez un IBAN et une référence unique, puis vous déposez la capture du virement. Votre espace est débloqué dès que nous avons vérifié la réception."}]$c$, $c$[{"q": "Which videos can I send?", "a": "Streams, podcasts, vlogs, YouTube videos: any long format. Upload the file directly to your space, even very large ones, or send a link."}, {"q": "Do I approve clips before they are published?", "a": "If you wish, yes. Each clip then goes through “to approve” in your space: you approve it or ask for changes with a comment."}, {"q": "How does payment work?", "a": "By bank transfer. You receive an IBAN and a unique reference, then upload a screenshot of the transfer. Your space unlocks as soon as we have confirmed receipt."}]$c$),
  ('home.cta.title', $c$Votre prochain live mérite mieux qu'un replay.$c$, $c$Your next stream deserves more than a replay.$c$),
  ('pricing.title', $c$Un abonnement, des clips tous les jours$c$, $c$One subscription, clips every day$c$),
  ('pricing.lead', $c$Montage, création des comptes, publication et suivi des résultats inclus. Paiement par virement.$c$, $c$Editing, account creation, publishing and results tracking included. Payment by bank transfer.$c$),
  ('pricing.note', $c$Après votre choix, vous recevez l'IBAN et une référence unique. Votre espace est débloqué dès la vérification du virement.$c$, $c$After choosing, you receive the IBAN and a unique reference. Your space unlocks as soon as the transfer is confirmed.$c$),
  ('contact.lead', $c$Une question sur les offres ou sur le fonctionnement ? Écrivez-nous, nous répondons par e-mail.$c$, $c$A question about our plans or how it works? Write to us and we will reply by email.$c$),
  ('legal.notice', $c$Ce site est édité par l'entreprise dont les informations figurent ci-dessus. Elles sont tenues à jour par l'agence dans ses paramètres.

## Hébergement

Le site est hébergé par le prestataire indiqué ci-dessus. Les données de la plateforme (comptes, clients, paiements) sont hébergées dans l'Union européenne.

## Propriété intellectuelle

Les textes, la marque, le logo et l'interface de ce site appartiennent à l'agence. Toute reproduction sans autorisation écrite est interdite. Les vidéos et clips des créateurs restent la propriété de leurs auteurs.

## Contact

Pour toute question, utilisez le formulaire de contact du site ou écrivez à l'adresse indiquée ci-dessus.$c$, $c$This website is published by the company whose details appear above. They are kept up to date by the agency in its settings.

## Hosting

The website is hosted by the provider listed above. Platform data (accounts, clients, payments) is hosted in the European Union.

## Intellectual property

The texts, brand, logo and interface of this website belong to the agency. Any reproduction without written permission is prohibited. Creators' videos and clips remain the property of their authors.

## Contact

For any question, use the contact form or write to the address listed above.$c$),
  ('legal.terms', $c$Modèle de conditions générales de vente à compléter et à faire relire par un professionnel du droit. Les passages entre crochets sont à renseigner.

## 1. Objet

Les présentes conditions encadrent la prestation de clipping fournie par l'agence : récupération des vidéos longues et des lives du créateur, montage de clips verticaux, création et animation de comptes de diffusion, publication et suivi des résultats.

## 2. Offres et prix

Les offres, leur contenu et leurs prix sont présentés sur la page Tarifs. Les prix sont indiqués en euros. [Préciser : prix HT ou TTC, et mention de TVA applicable.]

## 3. Commande

La commande est passée en créant un compte, en complétant le profil créateur et en choisissant une offre. Elle est confirmée par la validation du paiement par l'agence.

## 4. Paiement

Le paiement s'effectue par virement bancaire, avec la référence unique affichée dans l'espace client. L'agence vérifie la réception des fonds sur son compte avant de débloquer l'espace. Une capture d'écran du virement ne vaut pas preuve de paiement.

## 5. Durée et renouvellement

L'abonnement court pour la période de l'offre choisie, à compter de la validation du paiement. Un rappel est envoyé avant la fin de chaque période avec une nouvelle référence de paiement. Sans paiement à l'échéance, un délai de grâce de [X] jours s'applique, puis l'espace passe en lecture seule : les données restent consultables, mais l'envoi de vidéos et les demandes sont suspendus.

## 6. Droit de rétractation

[À compléter selon que le client est un consommateur ou un professionnel. Pour un consommateur : délai de 14 jours, et conditions dans lesquelles la prestation peut commencer avant la fin de ce délai à sa demande expresse.]

## 7. Contenus et autorisations

Le créateur garantit détenir les droits sur les vidéos qu'il transmet et autorise l'agence à les découper, les modifier et les publier dans le cadre de la prestation.

## 8. Comptes de diffusion

[À compléter : propriété des comptes créés pour le créateur, conditions de transfert à la fin de la prestation.]

## 9. Responsabilité

L'agence s'engage à mettre en œuvre les moyens nécessaires à la bonne exécution de la prestation. Elle ne garantit pas un nombre de vues ou d'abonnés, qui dépend notamment des plateformes et de leurs algorithmes.

## 10. Résiliation

[À compléter : modalités et préavis de résiliation par le client et par l'agence.]

## 11. Données personnelles

Le traitement des données personnelles est décrit dans la politique de confidentialité.

## 12. Litiges

Les présentes conditions sont soumises au droit français. [À compléter : médiateur de la consommation si le client est un consommateur, tribunal compétent.]$c$, $c$Template terms of sale, to be completed and reviewed by a legal professional. Text in square brackets must be filled in.

## 1. Purpose

These terms govern the clipping service provided by the agency: collecting the creator's long videos and live streams, editing vertical clips, creating and running distribution accounts, publishing and tracking results.

## 2. Plans and prices

Plans, their content and prices are shown on the Pricing page. Prices are in euros. [Specify: prices excluding or including VAT, and the applicable VAT statement.]

## 3. Order

An order is placed by creating an account, completing the creator profile and choosing a plan. It is confirmed when the agency validates the payment.

## 4. Payment

Payment is made by bank transfer, using the unique reference shown in the client space. The agency checks that the funds have reached its account before unlocking the space. A screenshot of the transfer is not proof of payment.

## 5. Term and renewal

The subscription runs for the period of the chosen plan, from the validation of the payment. A reminder with a new payment reference is sent before the end of each period. Without payment on the due date, a grace period of [X] days applies, after which the space becomes read-only: data remains viewable, but uploads and requests are suspended.

## 6. Right of withdrawal

[To be completed depending on whether the client is a consumer or a business. For consumers: 14-day period, and conditions under which the service may start earlier at their express request.]

## 7. Content and permissions

The creator warrants that they hold the rights to the videos they send and authorises the agency to cut, edit and publish them as part of the service.

## 8. Distribution accounts

[To be completed: ownership of the accounts created for the creator and transfer conditions when the service ends.]

## 9. Liability

The agency undertakes to use the means needed to perform the service properly. It does not guarantee any number of views or followers, which depend in particular on the platforms and their algorithms.

## 10. Termination

[To be completed: termination terms and notice for the client and the agency.]

## 11. Personal data

Personal data processing is described in the privacy policy.

## 12. Disputes

These terms are governed by French law. [To be completed: consumer mediator if the client is a consumer, competent court.]$c$),
  ('legal.privacy', $c$Modèle de politique de confidentialité à compléter et à faire relire. Les passages entre crochets sont à renseigner.

## Responsable du traitement

L'entreprise dont les informations figurent dans les mentions légales.

## Données collectées

- Clients : identité, e-mail, nom de créateur, liens de chaînes, informations de profil, vidéos transmises, historique des paiements et factures.
- Équipe : identité, e-mail, activité sur la plateforme.
- Formulaire de contact : nom, e-mail, lien de chaîne, message.
- Prospection : uniquement des informations publiques et professionnelles sur les créateurs (nom public, comptes, nombre d'abonnés, e-mail professionnel s'il est public).

## Finalités et bases légales

- Exécution du contrat : création du compte, réalisation de la prestation, facturation.
- Obligation légale : conservation des factures.
- Intérêt légitime : prospection de créateurs à partir d'informations publiques, sécurité de la plateforme.

## Durées de conservation

- Compte et données de prestation : pendant la relation contractuelle, puis [durée à préciser].
- Factures et pièces comptables : 10 ans.
- Messages de contact et prospects : [durée à préciser, par exemple 3 ans après le dernier contact].

## Destinataires et sous-traitants

Les données sont accessibles à l'équipe de l'agence selon ses attributions. Prestataires techniques : Supabase (base de données, région UE), Vercel (hébergement du site), Cloudflare R2 (stockage des vidéos, juridiction UE), Resend (envoi des e-mails). [Vérifier et préciser les éventuels transferts hors de l'Union européenne et leurs garanties.]

## Vos droits

Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Vous pouvez exporter vos données ou demander la suppression de votre compte depuis votre espace ou en nous écrivant. Les factures sont conservées malgré une demande de suppression, conformément à la loi. Vous pouvez introduire une réclamation auprès de la CNIL.

## Cookies

Ce site n'utilise que des cookies indispensables à son fonctionnement (session de connexion, langue). Aucun cookie de mesure d'audience ou publicitaire n'est déposé.$c$, $c$Template privacy policy, to be completed and reviewed. Text in square brackets must be filled in.

## Data controller

The company whose details appear in the legal notice.

## Data collected

- Clients: identity, email, creator name, channel links, profile information, videos sent, payment history and invoices.
- Team: identity, email, activity on the platform.
- Contact form: name, email, channel link, message.
- Prospecting: only public, professional information about creators (public name, accounts, follower count, business email if public).

## Purposes and legal bases

- Performance of the contract: account creation, delivery of the service, invoicing.
- Legal obligation: keeping invoices.
- Legitimate interest: prospecting creators using public information, platform security.

## Retention periods

- Account and service data: for the duration of the contract, then [period to specify].
- Invoices and accounting records: 10 years.
- Contact messages and prospects: [period to specify, for example 3 years after the last contact].

## Recipients and processors

Data is available to the agency's team according to their assignments. Technical providers: Supabase (database, EU region), Vercel (website hosting), Cloudflare R2 (video storage, EU jurisdiction), Resend (email delivery). [Check and specify any transfers outside the European Union and their safeguards.]

## Your rights

You have the right to access, rectify, erase, restrict, object and to data portability. You can export your data or request the deletion of your account from your space or by writing to us. Invoices are kept despite a deletion request, as required by law. You can lodge a complaint with the CNIL (French data protection authority).

## Cookies

This website only uses cookies that are essential to its operation (login session, language). No analytics or advertising cookies are set.$c$)
on conflict (key) do nothing;

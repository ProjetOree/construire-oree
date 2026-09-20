---
layout: ../../layouts/DocumentLayout.astro
title: "🛠️ Le Blueprint Technique & Fiscal d'Orée"
seoTitle: "Blueprint technique et fiscal historique d'Orée"
description: "Document de conception complet sur les hypothèses techniques, fiscales et opérationnelles d'Orée, avec qualification actuelle."
contextPath: "/fondations/"
contextLabel: "Fondations actuelles"
sourceUpdated: "14 juillet 2026"
kind: blueprint
---

_Document de référence — Architecture technique, montage fiscal et cadre de conformité de la marketplace Orée. Version officielle, prête à être partagée avec les parties prenantes, partenaires et auditeurs externes._

> **📖**
> **Double lecture — une page, deux niveaux.**
> Chaque section est un **titre déroulant** : à l'ouverture, la page tient sur un écran. Dépliez une section pour sa **synthèse claire** (le _pourquoi_, l'impact, le risque maîtrisé), puis le bloc **▶ Rigueur technique & fondements légaux** pour l'intégralité des paramètres — montages Stripe, articles de loi, règles de calcul.
> 👉 _Dépliez pour décider. Re-dépliez pour auditer._

---

> **Note actuelle.** Ce blueprint conserve des choix de conception. Il ne décrit pas une infrastructure de vente en service ; ses montages techniques restent à vérifier avant toute réalisation.

<span id="volet-technique"></span>

## 🖥️ Volet technique

<span id="section-1"></span>

## 1. Architecture à double flux — le cœur du système

**Deux ventes, deux régimes, jamais de mélange.** Orée distingue **vendre une création originale** et **vendre un produit édité** : deux opérations juridiquement distinctes, séparées de bout en bout par l'architecture de paiement.

- 🎨 **La création originale** est vendue par l'artiste ou l'artisan lui-même, qui conserve son **statut** (artiste-auteur ou artisan d'art).
- 👕 **Le produit édité** est vendu par la plateforme Orée, comme tout commerçant.

> **💡**
> **La métaphore des deux caisses.** La recette d'une création originale arrive **directement chez le créateur** (Orée ne prélève que sa commission). La recette d'un produit édité transite par **la caisse d'Orée**, qui reverse une royalty à l'artiste. Les deux flux ne se croisent **jamais**.

🎨 **Flux 1 — Création originale**

- **Qui vend ?** L'artiste-auteur ou l'artisan (voir §5).
- **Statut artiste-auteur :** préservé ✅.
- **Qui encaisse ?** L'artiste — Orée prélève sa commission.
- **Revenu du créateur :** prix de vente − commission plateforme.
- **TVA :** franchise sous seuil, ou **5,5 %** (œuvre d'art originale) **ou 20 %** (objet artisanal) — voir §5.

<!-- Fin de liste. -->

👕 **Flux 2 — Produit édité**

- **Qui vend ?** La plateforme Orée.
- **Statut artiste-auteur :** sans objet.
- **Qui encaisse ?** Orée — reverse une royalty à l'artiste.
- **Revenu du créateur :** royalty sur chaque vente (sur la marge nette).
- **TVA :** vente Orée → client **20 %** ; royalty artiste (droit de reproduction) **10 %** ou franchise (voir §5).

<!-- Fin de liste. -->

**▶ **Rigueur technique & fondements légaux****

> **🛠️**
> **Montage Stripe Connect — Flux 1.** Orée opère en **destination charges** avec `on_behalf_of` pointant vers le compte de l'artiste (comptes **Express**). L'artiste demeure _merchant of record_ ; la commission est prélevée via `application_fee_amount` ; la plateforme absorbe le risque de _chargeback_.
> **Montage proscrit :** le schéma _separate charges & transfers_ qualifierait Orée de **commissionnaire opaque** (**art. 256 V du CGI**) — réputé acheter puis revendre l'œuvre, détruisant le statut et déclenchant une TVA à 20 % sur le prix total.
> **Faisceau d'indices maintenu :** prix fixé librement par l'artiste, contrat qualifiant Orée de simple **mandataire** encaissant _au nom et pour le compte_ de l'artiste, facture émise au nom de l'artiste.

> **⚖️**
> **TVA — seuils de franchise artiste-auteur.** Activité principale : **50 000 €** (tolérance 55 000 €). Revenus accessoires : **35 000 €** (tolérance 38 500 €). Œuvre originale par son auteur → **taux réduit 5,5 %**.
> Seuils **centralisés en configuration** (absorbe toute loi de finances sans toucher au code). **Sortie de franchise en cours d'année** gérée nativement : alerte à l'approche du seuil, bascule du `vat_regime` (taux, mentions, ventilation) **sans rupture de numérotation**.

> **🔒**
> **Verrou anti double-vente (****`stock = 1`****).** Une création originale est unique. La réservation ne repose **pas** sur un verrouillage pessimiste (ni `SELECT … FOR UPDATE`, ni index unique partiel), inadapté à un environnement serverless sans transaction longue. Orée applique un **contrôle de concurrence optimiste** : l'autorisation Stripe est d'abord posée en **capture manuelle** (`capture_method: manual`) — une simple empreinte bancaire, sans débit. Une **mise à jour logique ultra-rapide et conditionnelle** (`UPDATE … SET status = 'RESERVED' WHERE status = 'AVAILABLE'`) tente ensuite de réserver l'œuvre. **L'issue de cette mise à jour décide de tout :** si elle réussit (une ligne modifiée), Orée **capture les fonds** ; si elle échoue (zéro ligne — l'œuvre est déjà réservée), Orée **annule l'empreinte bancaire**, sans jamais débiter l'acheteur.
> **Contrainte serverless (Vercel) :** pas de worker long-running, et la SCA peut durer plusieurs minutes. La libération s'effectue sur les **webhooks signés** `payment_intent.payment_failed` / `payment_intent.canceled`, complétés par un **balayage Vercel Cron** réconciliant les réservations expirées contre l'API Stripe (TTL ≈ 15–30 min). La confirmation Stripe bascule l'œuvre en « vendue ».

> **🛒**
> **Un flux par charge.** Un `PaymentIntent` ne route les fonds que vers **un seul compte** : une même charge ne peut encaisser à la fois une création originale (Flux 1 → artiste) et un produit édité (Flux 2 → plateforme). L'unicité protectrice porte sur le _flux par charge_, non sur le panier : un **panier visuel unifié** est éclaté en **deux ****`PaymentIntents`** au paiement (« Création — vendue par le créateur » / « Produit édité — vendu par Orée »). **Cadrage roadmap :** au MVP (Phase 1), le panier mixte est exclu — un seul flux par `PaymentIntent`, donc un seul type d'article par commande. Le panier unifié et son orchestration « commit en deux phases » (callout suivant) relèvent de la **Phase 2**, conformément à la Feuille de Route.

> **🔁**
> **Orchestration « commit en deux phases » (panier unifié).** Deux _merchants of record_ → deux `PaymentIntents` indépendants → risque d'**échec partiel**. Règle : **aucun encaissement tant que les deux paiements ne sont pas garantis**, via **capture manuelle** (`capture_method: manual`).
> **① Autoriser :** créer les 2 PI en capture manuelle, réserver le `stock = 1` atomiquement, confirmer (SCA) → `requires_capture`.
> **② Décider :** les 2 autorisés → **capturer les 2** (`succeeded` → « vendu »). L'un échoue → **annuler** l'autorisation de l'autre (libère sans débit ni _refund_), puis libérer le stock.
> **Cas résiduel** (capture n°2 échoue après n°1) : **rembourser** le n°1 (Flux 1 via `reverse_transfer` + `refund_application_fee`), libérer le stock, alerter. _Mitigation :_ capturer le Flux 2 avant le Flux 1.
> **Garde-fous :** machine à états pilotée par webhooks, **clés d'idempotence** sur création et capture, **balayage Vercel Cron** des autorisations orphelines.

> **🛡️**
> **Défense chargeback — le blocage des fonds.** En _destination charges_, un litige débite le **solde plateforme Orée**. Le payout restant **bloqué** jusqu'à `livraison + 14 j`, un litige survenant dans cette fenêtre (la majorité des cas) est entièrement couvert : à réception de `charge.dispute.created`, Orée déclenche un `transfer.reversal` et récupère les fonds sur le solde connecté retenu. **Aucune provision de trésorerie lourde requise.**
> **Résidu maîtrisé :** chargeback possible jusqu'à ≈ 120 jours ; ce _tail_ (fraude carte) est traité par **Stripe Radar** + **preuve de livraison** (suivi + signature), puis absorbé par une **réserve glissante légère**. _Remboursement Flux 1 :_ `reverse_transfer` + `refund_application_fee`.

<span id="section-2"></span>

## 2. La stack technique

**Faire simple, valider vite, rester réversible.** L'infrastructure s'appuie sur des services tiers **éprouvés** ; chaque brique est **réversible** (internalisation ultérieure sans réécriture).

- **Framework — Next.js (App Router) :** SSR natif pour le SEO des fiches créations + navigation fluide.
- **Paiement — Stripe Connect (Flux 1) + Stripe standard (Flux 2) :** deux flux distincts, _battle-tested_, conformité PCI DSS intégrée.
- **Base de données — PostgreSQL + pooler :** robuste et universel ; le pooling évite la saturation en serverless.
- **Recherche — Full-text PostgreSQL (****`tsvector`****) :** suffisant pour le catalogue, **aucune infrastructure supplémentaire**.
- **Stockage images — Cloudinary :** optimisation + CDN automatiques, migration sans réécriture du front.
- **Hébergement — Vercel :** Next.js natif, déploiement continu, CDN intégré.
- **Email transactionnel — Resend :** confirmations et alertes de vente (chemin critique).
- **Analytics — Plausible :** _privacy-first_, RGPD-friendly, zéro cookie tiers.

> **🎯**
> **Le périmètre est délibérément resserré.** Pas de WebSockets temps réel, pas de moteur de recherche externe, pas de blockchain, pas de print-on-demand automatisé au démarrage — chaque exclusion assortie d'un _seuil de bascule_ clair. La notification de vente passe par un **email** : le déclic émotionnel de la première vente n'exige rien de plus.

**▶ **Rigueur technique & fondements légaux****

> **🔒**
> **Sécurité paiement — socle non négociable.**
> **• Webhooks signés :** vérification systématique ; un webhook non signé n'est jamais traité.
> **• Clés d'idempotence :** sur la création des `PaymentIntent` et des remboursements, contre les **doubles débits**.
> **• Secrets chiffrés :** clés Stripe / API en variables d'environnement chiffrées, jamais dans le dépôt, rotation possible.
> **• Rate-limiting :** sur les endpoints sensibles (auth, paiement, upload) + protection anti-bot.
> **• Source de vérité = Stripe :** l'état d'une vente est toujours confirmé par webhook côté serveur, jamais déduit du front.

> **🛠️**
> **Recherche full-text PostgreSQL.** `tsvector` pour l'indexation, avec **`unaccent`** (insensibilité aux accents) et **`pg_trgm`** (tolérance aux fautes). Aucune infrastructure _stateful_. _Seuil de bascule :_ un moteur dédié (Meilisearch / Algolia) seulement si des facettes avancées deviennent nécessaires.

> **⚙️**
> **Connexions DB en serverless.** Vercel ouvre une connexion par fonction → **pooling obligatoire** (PgBouncer ou driver serverless type Neon / Supabase). Resend : **SPF / DKIM / DMARC** + monitoring de délivrabilité — la confirmation de vente ne doit jamais échouer.

> **🛰️**
> **Exploitation & durabilité.**
> **• Observabilité :** **Sentry** + alertes (email / SMS) sur toute exception de webhook ou échec du Vercel Cron.
> **• Sauvegardes :** PostgreSQL = source de vérité fiscale → **PITR** + sauvegardes chiffrées testées ; factures conservées **10 ans** en lecture seule (aucun `DELETE` / `UPDATE`, uniquement des avoirs).
> **• Webhooks :** gestion de l'**ordre non garanti** et des **doublons** (état versionné) + `payout.failed`.
> **• Tests :** Stripe _test mode_, rejeu (`stripe trigger`), fixtures double-flux, chemins d'échec partiel et de remboursement.

> **📐**
> **Périmètre fonctionnel — automatisé vs exclu.**
> **Automatisé :** **certificat d'authenticité PDF** à la vente, **reçus / factures** (socle « invoice-ready »), **alertes de vente par email** (webhook Stripe → Resend).
> **Hors périmètre (avec seuil de bascule) :** chat artiste-client (formulaire de contact) ; print-on-demand auto (bascule au-delà de 5–10 commandes / semaine via Printful / Printify / Gelato) ; dashboards temps réel ; calcul auto des commissions ; blockchain ; comptabilité intégrée.
> **France uniquement au lancement :** l'UE déclencherait la **TVA OSS / IOSS**, l'export hors UE des **formalités douanières**, et chaque pays son **droit de la consommation**.

---

> **⚖️**
> **Bascule de volet.** Les sections **1–2** couvrent l'**architecture technique**. Les sections **3–7** couvrent le **montage fiscal, le cadre légal et l'opérationnel**.

---

> **Note actuelle.** Les passages juridiques, fiscaux et comptables documentent des hypothèses de travail. Ils ne constituent pas des conditions applicables ni un conseil à suivre ; une validation professionnelle et une vérification à jour seraient nécessaires avant usage.

<span id="volet-fiscal-legal-operationnel"></span>

## ⚖️ Volet fiscal, légal & opérationnel

<span id="section-3"></span>

## 3. Les intermédiaires (Échos & Éclaireurs) & la clôture

**Deux rôles humains, une règle d'or.**

- 📣 **Les Échos** — curateurs disposant d'une audience, qui **font connaître et vendent** les créations (côté demande).
- 🧭 **Les Éclaireurs** — passeurs de talents, qui **amènent de nouveaux artistes** sur la plateforme (côté offre).

> **💖**
> **Le créateur ne paie jamais rien.** La rémunération des Échos et Éclaireurs est prélevée sur la **marge de la plateforme**, jamais sur le revenu de l'artiste. L'artiste touche exactement ce qu'il aurait touché sans eux.

> **💸**
> **Commission basse et soutenable : 25–30 %.** Au plancher du marché (galeries 30–50 %, marketplaces d'art ≈ 30–40 %) tout en restant viable — calibrée pour financer durablement la protection des artistes.

**▶ **Rigueur technique & fondements légaux****

> **⚖️**
> **Loi Influenceurs (Échos).** La mise en avant rémunérée relève de la **loi du 9 juin 2023** (décret n° 2025-1137) **et** du **DSA** : contrat d'influence écrit, mentions **« Publicité » / « Collaboration commerciale »**, responsabilité partagée. L'Écho a un **statut (auto-entrepreneur a minima)** et **facture la plateforme** → écarte le travail dissimulé.

> **🛡️**
> **Cadre contractuel des Éclaireurs.** L'apport d'affaires exclut tout **pouvoir de négociation** au nom d'Orée — prévenant la **requalification en agent commercial** (art. **L. 134-12 C. com.**) ou en **contrat de travail**. Mission d'apport **non exclusive et indépendante**. Rémunération = **commission plafonnée** sur les ventes de l'artiste apporté (**limitée dans le temps et/ou en montant**), **jamais un pourcentage perpétuel** — ce qui écarte la requalification.<br>**Barrières renforcées (jurisprudence 2026 / Directive UE sur le travail via plateformes).** La mission se limite à une **simple mise en relation, exclusive de toute autre intervention** : l'Éclaireur **ne doit fournir aucune assistance à l'onboarding du créateur ni négocier pour lui**. Est par ailleurs **formellement interdite** toute **désactivation algorithmique de compte pour cause d'inactivité** — un tel mécanisme, assimilable à un contrôle et une direction de la prestation, ferait basculer la relation vers la présomption de salariat posée par la Directive.
> _Cumul Écho + Éclaireur :_ **contrat-cadre unique à deux volets**, lignes de rémunération distinctes, plancher de marge, mentions DSA / loi Influenceurs sur la part « mise en avant ».

> **🧮**
> **Règle de soutenabilité (Flux 1).** La commission couvre, dans l'ordre : frais Stripe → **contribution diffuseur 1,1 %** → commissions Échos / Éclaireurs → coûts de fonctionnement. Raisonnement **net de TVA** (intermédiation à **20 %**, non récupérable en franchise → Orée garde `commission ÷ 1,20`). **Plancher plateforme 50 % :** le cumul Écho + Éclaireur ne dépasse jamais **50 % de la commission nette de TVA**. Rémunérations exprimées en **fraction de la commission**, jamais en % du prix de vente.

> **🧮**
> **Modèle de point-mort (référence).** Hypothèses : commission **28 %**, Stripe ≈ 1,5 % + 0,25 €, Urssaf diffuseur **1,1 % du brut**, plancher intermédiaires **50 % de la commission nette de TVA**.
> **• Vente 80 € :** marge ≈ **16,6 €** (≈ **7,3 €** avec les deux intermédiaires).
> **• Vente 300 € :** marge ≈ **62,9 €** (≈ **27,9 €** avec les deux).
> **• Vente 1 500 € :** marge ≈ **315 €**.
> **Lecture :** le risque se concentre sur les **petits paniers à double intermédiaire** → un **prix plancher** conditionne l'activation du cumul.

> **📑**
> **Déclaration DAS2.** Les commissions versées aux Échos et Éclaireurs sont déclarées (DAS2 / CERFA 2460) dès qu'elles dépassent **2 400 € TTC / an / bénéficiaire** — intégré à la clôture et à l'archivage des factures reçues.

> **🧾**
> **Rituel de clôture mensuelle (tableur maître unique).** Une clôture par mois, à date fixe : 1. Exporter _balance transactions_ et _payouts_ Stripe (Flux 1 Connect + Flux 2 standard). 2. Rapprocher chaque vente : flux, TVA, commission plateforme (`application_fee_amount`), commission Écho / Éclaireur. 3. Vérifier que **chaque commission versée correspond à une facture reçue**. 4. Ventiler la TVA : collectée (Flux 2) vs hors-champ côté artiste (Flux 1). 5. Archiver les factures émises et la pièce de clôture. 6. **Corrections / avoirs :** rattacher tout remboursement à un **avoir** (`related_invoice`), régulariser Urssaf 1,1 % et TVA.
> _Seuil de bascule vers un outil comptable (Pennylane / Tiime) : clôture \> une demi-journée ou \> 50 ventes / mois._

> **🧭**
> **Onboarding des intermédiaires — parcours miroir.** Comme la Voie Tremplin des artistes : inscription libre, mais **aucun versement de commission sans statut + facture conforme**. Orée outille la création (Guichet unique INPI) et ne bloque que le _payout_ tant que la facture n'est pas émise.

<span id="section-4"></span>

## 4. L'accompagnement comptable des artistes

**Outiller, sans jamais tenir les comptes.** La **tenue de la comptabilité d'autrui** est réservée aux experts-comptables inscrits. Ligne directrice : **Orée outille l'artiste, mais ne tient jamais ses comptes à sa place.**

> **🧰**
> **« Vous saisissez, on vous outille. »** Orée fournit l'outil, automatise les données des ventes, pré-remplit et alerte — mais **l'artiste valide et reste responsable** de sa comptabilité. Tout acte réservé est **routé vers un partenaire expert-comptable**.

✅ **Orée peut (outil)**

- Générer le livre de recettes depuis les ventes Orée, **validé par l'artiste**.
- Pré-remplir les chiffres + guider la déclaration (l'artiste dépose).
- Alerter sur les seuils (franchise TVA, plafond micro).
- Émettre factures + auto-facturation par mandat ; déclaration diffuseur Urssaf.

<!-- Fin de liste. -->

🔴 **Orée ne peut pas (réservé à l'expert-comptable)**

- Tenir, centraliser ou corriger les comptes à la place de l'artiste.
- Remplir et déposer les déclarations fiscales **au nom** de l'artiste.
- Établir un bilan, une déclaration contrôlée, la compta d'une société.
- Garantir / attester la « sincérité » des comptes.

<!-- Fin de liste. -->

**▶ **Rigueur technique & fondements légaux****

> **⚖️**
> **Critère : acte matériel vs mission intellectuelle.** L'**art. 2 de l'ordonnance n° 45-2138 du 19 sept. 1945** réserve le fait de _tenir, centraliser, arrêter, surveiller, redresser, réviser, apprécier_ les comptabilités d'autrui. La **Cass. com. 17 sept. 2025 (n° 24-14.689)** distingue l'**acte technique** de saisie (libre) de la **mission intellectuelle** (réservée). Une plateforme étant habituelle par nature, **le bouclier d'Orée est « c'est l'artiste qui agit, Orée n'est que l'outil »**.

> **🚫**
> **Montage interdit.** La **Cass. crim. 21 janv. 2026 (n° 24-81.008)** condamne les montages de « mise à disposition » (un salarié faisant la compta de tiers), engageant la **responsabilité pénale du dirigeant**. ⇒ **Orée n'internalise jamais un comptable « maison ».** Le **choix de statut** relève du monopole de l'**art. 54 de la loi n° 71-1130 du 31 déc. 1971** → avocat / expert-comptable.

> **🧪**
> **Grille de qualification — 5 questions par fonctionnalité :** 1. **Qui agit ?** L'artiste valide → outil. Un humain d'Orée fait à sa place → tenue. 2. **Acte matériel ou intellectuel ?** Saisie / automatisation → libre. Contrôle / appréciation → réservé. 3. **Qui assume la responsabilité ?** Si Orée garantit la sincérité → faux expert-comptable. 4. **Habitude + rémunération pour autrui ?** Toujours vrai sur une plateforme. 5. **Comment est-ce présenté ?** « Outil que vous utilisez » → conforme. « On fait votre compta » → réservé.

> **✅**
> **Garde-fous codés dans le produit :** - **L'artiste valide :** clic **horodaté** (« je certifie l'exactitude de mes recettes ») archivé comme preuve. - **Le logiciel propose, ne tranche jamais :** toute qualification à enjeu est une suggestion validable. - **Orée n'assume jamais la sincérité :** CGU explicites (« vous restez seul responsable de vos déclarations »). - **Tout acte réservé est routé** vers un partenaire expert-comptable inscrit ou un avocat. - **Aucune saisie / tenue humaine récurrente** par Orée. - **Vocabulaire contrôlé :** « on vous outille », jamais « on gère votre compta ».

#### 🤝 Le partenaire expert-comptable

Tout acte réservé est confié à un **partenaire expert-comptable**. Grâce à la **loi Macron (2015)**, un même partenaire couvre la comptabilité _et_ la mission juridique / fiscale / sociale accessoire ; l'avocat reste requis pour le contentieux.

> **🤝**
> **La lettre de mission lie directement l'artiste et l'expert-comptable. Orée n'est jamais partie à l'acte comptable.** Orée demeure éditeur d'outil + diffuseur + guichet ; le partenaire (cabinet, expert-comptable en ligne, ou **AGC**) réalise les actes réservés sous sa propre inscription à l'Ordre.
> **Trajectoire :** **modèle prescripteur** (tarif préférentiel négocié), puis **marque blanche / convention de partenariat** (données via API), la lettre de mission demeurant expert-comptable ↔ artiste.

> **🧭**
> **Périmètre élargi (loi Macron, art. 22 de l'ordonnance de 1945).** Les travaux juridiques, fiscaux et sociaux sont l'accessoire des missions de l'art. 2, sous trois réserves : ce n'est pas l'activité principale, **lettre de mission signée**, indépendance préservée.

> **🗂️**
> **Partage des rôles.**
> **Orée (outil + diffuseur + guichet) :** livre de recettes pré-rempli, factures + auto-facturation par mandat, déclaration diffuseur Urssaf, alertes, transmission des données.
> **Expert-comptable (réservé) :** création de structure, choix de régime, déclaration contrôlée, bilan, conseil, attestation.
> **Artiste :** mandate, valide, signe la lettre de mission, reste responsable.

> **🚦**
> **Garde-fous du partenariat.** - **Inscription à l'Ordre + RC Pro** vérifiées. - **Lettre de mission expert-comptable ↔ artiste.** - **Pas de partage d'honoraires** → tarif préférentiel sans rétrocession. - **RGPD :** flux sous consentement de l'artiste + DPA. - **Modèle interdit :** Orée revendant de la compta (Cass. crim. 21 janv. 2026).

<span id="section-5"></span>

## 5. L'onboarding des créateurs — un triage à deux statuts

**Le statut découle de ce que l'on fabrique, pas du flux de vente.**

> **🧭**
> **On identifie d'abord QUI tu es ; le reste se configure.** **Artiste-auteur** (œuvres de l'esprit) et **artisan d'art** (objets artisanaux) relèvent de régimes différents. Orée pose la question une fois et active les bons flux et taux — **sans jamais choisir le statut à la place du créateur**.

🖋️ **Artiste-auteur**

- **Ce qu'il crée :** œuvres de l'esprit (peinture, illustration, photo, sculpture d'art…).
- **Régime :** social spécifique (Urssaf artistes-auteurs / IRCEC) — **interdit en micro** pour la création.
- **Flux 1 :** œuvre originale → TVA **5,5 %** ou franchise.
- **Flux 2 :** cession de droit de reproduction → royalty = droit d'auteur (TVA **10 %** ou franchise).
- **Diffuseur 1,1 % :** oui (Orée diffuseur) + précompte / dispense.

<!-- Fin de liste. -->

⚒️ **Artisan d'art**

- **Ce qu'il crée :** objets artisanaux (céramique, bijou, maroquinerie, bois…).
- **Régime :** micro-entreprise / EI (BIC) + qualité d'artisan, inscription CMA.
- **Flux 1 :** objet → TVA **20 %** ou franchise micro.
- **Flux 2 :** cession de droits sur dessin / modèle (cas par cas).
- **Diffuseur 1,1 % :** non (pas un artiste-auteur).

> **💡**
> **Un artiste-auteur reste artiste-auteur sur les DEUX flux.** La royalty d'un produit édité est un **droit de reproduction** (donc un droit d'auteur), pas un revenu commercial : pas besoin de micro. La micro ne concerne que l'**artisan**, ou l'artiste exerçant _en plus_ une activité commerciale distincte (cumul possible, jamais mélangé).

**L'entonnoir d'inscription en 5 temps :**

1. 🧭 **Triage de profil** — « Que crées-tu et vends-tu ? » → artiste-auteur / artisan / les deux.
2. 📋 **État des lieux** — structure existante ? (SIRET, régime, statut TVA, dispense de précompte, IBAN).
3. 🏗️ **Création si besoin** — Guichet unique INPI → SIRET → dispense de précompte ; **choix de régime routé vers l'expert-comptable**.
4. 🪪 **Collecte unique** — KYC/KYB Stripe (DSP2) + titularité PI + dispense + mandat d'auto-facturation + IBAN. _(La traçabilité DSA art. 30 ne s'applique pas : exemption petite entreprise au titre de l'art. 29 — voir §6.)_
5. ⚙️ **Configuration automatique** — flux, taux de TVA et obligations activés selon le statut.

   **▶ **Rigueur technique & fondements légaux****

> **⚖️**
> **Qualification fiscale des revenus.** Le **droit de reproduction** est un **droit d'auteur**, déclaré en BNC à l'Urssaf Limousin — pas un revenu commercial. TVA selon l'opération : **œuvre originale 5,5 %**, **cession de droits d'auteur 10 %**, **autre opération 20 %**. ⇒ royalty à l'artiste = **10 %** (ou franchise) ; vente du produit édité par Orée = **20 %**. Deux opérations distinctes.

> **🚧**
> **Frontière outil / conseil.** Orée peut **outiller et déposer** : déclaration de début d'activité (Guichet unique INPI → SIRET → dispense de précompte) ; checklist des pièces ; action en **tiers de confiance / mandataire** pour le seul dépôt, sur mandat explicite. Orée ne peut **pas conseiller ni choisir** le statut / régime / option TVA → routage en modèle prescripteur.

> **🚦**
> **Garde-fous codés.** - **« Note d'auteur » = facture :** SIRET obligatoire → pas de vente Flux 1 tant qu'il n'est pas collecté ou créé. - **Seuils surveillés :** micro-BNC 77 700 € (2025) → 83 600 € (2026) ; franchise TVA 50 k / 35 k → alerte + routage. - **Dispense de précompte** = conséquence du SIRET + BNC → versement du brut. - **Cumul artiste-auteur + micro :** deux compteurs de CA séparés, aucun mélange des revenus de création dans la micro.

<span id="section-6"></span>

## 6. Conformité de lancement & critères de succès

**Le socle de conformité opérationnel.** En ESS, la conformité est une **preuve de cohérence avec les valeurs** autant qu'une obligation légale.
**📋 **Obligations en vigueur au lancement**** - 🔐 **RGPD :** consentement, registre des traitements, DPA avec chaque sous-traitant (Stripe, Cloudinary, Vercel, Resend, Plausible), hébergement UE privilégié, droit à l'effacement. Validation externe avant lancement. - 🧾 **Facturation électronique :** réception obligatoire **1ᵉʳ sept. 2026**, émission **1ᵉʳ sept. 2027**. Passage par une **Plateforme Agréée** capable d'**auto-facturation multi-émetteurs**. - 🏛️ **Urssaf Limousin (diffuseur) :** déclaration sous **8 jours**, **contribution 1,1 %** due par Orée sur le brut versé à l'artiste, **dispense de précompte** exigée à l'onboarding. - 🛡️ **Droit de la consommation (B2C) :** **rétractation 14 jours** + remboursement sous 14 j, médiateur agréé **CECMC**. Exemption œuvres sur commande / personnalisées. - ⏱️ **Délai de versement :** artiste réglé à **livraison + 14 j** (payouts manuels). - 📜 **CGV :** **deux jeux distincts** (créations originales vs produits édités), validés par avocat. - 🏷️ **Mentions légales (LCEN, art. 6-III) :** éditeur, directeur de publication, identité + coordonnées de l'hébergeur (Vercel). - 📝 **Contrat artiste-plateforme :** accord écrit (droits, prix libre, mandat de facturation), modèle inspiré du **CPGA**. - 🎨 **PI & authenticité :** **licence de reproduction non exclusive** (Flux 2) ; l'artiste garde propriété + droit moral ; déclaration de titularité, signalement PI (DSA art. 16). - 🛰️ **DSA :** en tant que petite entreprise, Orée est **exonérée de la traçabilité des vendeurs (art. 30)** au titre de l'**art. 29** — la vérification d'identité relève alors de la **DSP2 (Stripe Connect)**. Orée maintient en revanche une **conformité stricte à la modération et à l'exposé des motifs (art. 16/17)**, un point de contact et des CGU. - 🔧 **Garanties légales :** **conformité 2 ans** (art. L. 217-3) + **vices cachés** (art. 1641 C. civ.). Flux 2 : Orée vendeur ; Flux 1 : l'artiste (co-responsabilité possible, _Amazon_ C-649/17). - ♻️ **Droit de suite :** **hors périmètre** (vise les reventes via professionnel, art. L. 122-8) → Orée ne fait que des ventes primaires. - ♿ **Accessibilité :** **WCAG 2.1 AA** visé dès le design system.

> **⚖️**
> **Le mécanisme qui protège la trésorerie.** Pour tenir « livraison + 14 j », le compte Connect est en **payouts manuels** + **réserve glissante** anti-_chargeback_. Présenté à l'artiste comme une **protection anti-impayé**, jamais comme une rétention arbitraire.

> **📦**
> **La date de livraison déclenche le versement.** Source de vérité : (1) **statut « livré » via API transporteur** (Colissimo / Chronopost / Sendcloud), horodaté — retenu ; (2) confirmation de l'artiste — jamais seule ; (3) confirmation de l'acheteur — souvent silencieuse. **Fallback** « expédition + délai transporteur » pour ne jamais geler le versement.

**▶ **Rigueur technique & fondements légaux****

> **🛡️**
> **Droit de la consommation B2C — détail.** **Frais de retour à la charge de l'acheteur** (art. L. 221-23, sous information préalable). **Exemption de rétractation** (art. L. 221-28) pour les œuvres sur commande / personnalisées — pas les créations originales déjà réalisées ni les produits édités en stock. Sans information précontractuelle, le délai passe à **12 mois + 14 j** (art. L. 221-20). **Remboursement Flux 1 :** _refund_ sur la _destination charge_ avec `reverse_transfer` + `refund_application_fee` ; remboursement du **prix + livraison aller standard** (art. L. 221-24), hors frais de retour. Partiel → calculé au prorata.

> **📑**
> **Choix de la Plateforme Agréée (PA).** Enjeu : **auto-facturation pour compte de tiers** (cas « marketplace » de la norme **AFNOR 17a / 17b**) : mandat de facturation + multi-émetteurs (un émetteur par artiste), en immatriculation définitive. Le mandat décharge de l'émission **technique**, pas de la **responsabilité fiscale**. Candidats : Pennylane / Tiime, Pagero / SERES — capacité multi-émetteurs validée explicitement.

> **🧾**
> **Mandat d'auto-facturation.** Légal **sous mandat** : l'artiste est **informé de chaque facture émise en son nom** et dispose d'une **fenêtre de contestation** tracée. **Flux distinct :** Orée émet aussi sa **propre facture de commission** à l'artiste (intermédiation, **TVA 20 %**, `doc_type = 'commission'`).

> **🪪**
> **Onboarding KYC / KYB — cadré par la DSP2, pas par l'art. 30 du DSA.** L'obligation de traçabilité des vendeurs (**DSA, art. 30**) **ne s'applique pas** à Orée : l'**article 29 du DSA exonère totalement** les **micro et petites entreprises** des obligations propres aux marketplaces. La vérification d'identité à l'onboarding (identité, IBAN, et justificatifs d'entreprise le cas échéant) est donc **exclusivement dictée par la DSP2**, mise en œuvre via **Stripe Connect** — et non par une traçabilité DSA rigide. **Côté acheteur : aucun KYC** — **checkout invité par défaut**, compte optionnel post-achat.<br>En revanche, Orée maintient une **conformité stricte aux articles 16 et 17 du DSA** : un **mécanisme de signalement de contenu illicite** (notamment la contrefaçon) et un **exposé clair des motifs** communiqué à l'utilisateur concerné en cas de modération ou de restriction de compte.

> **🗄️**
> **Rétention vs effacement.**
> **• RGPD vs conservation 10 ans :** **anonymisation** — purge des données personnelles non fiscales, conservation de la pièce comptable.
> **• Acceptation versionnée des CGV / CGU :** horodatage + n° de version acceptés par l'acheteur _et_ l'artiste.
> **• Offboarding artiste :** solde des payouts, dépublication des œuvres, conservation de l'historique fiscal.

#### 🌟 Critères de succès

> **🌟**
> **North Star Metric — le % d'artistes et d'artisans qui vivent de leur création sans emploi alimentaire. Cible : 15 %.**
> Mesure : croisement du **revenu mensuel par artiste** (payouts Stripe) et d'une **micro-enquête trimestrielle** ; suivi de la **tendance**.

**🟢 Signaux verts — passage à la Phase 2** - **Artistes et artisans avec ≥ 1 création en ligne — cible 50 :** masse critique pour une offre diversifiée. - **Ventes réalisées — cible 100 :** la demande existe. - **Taux de première vente — 30 % des inscrits :** le modèle fonctionne. - **Artistes et artisans \> 500 €/mois — cible 5 :** la plateforme change des vies. - **Clients récurrents — 10 % de réachat :** fidélisation et viabilité prouvées. - **Équilibre financier — commissions ≥ frais :** le projet se tient seul.

> **⛔**
> **🔴 Signaux d'alarme — déclencheurs de pivot** - Zéro vente après 3 mois malgré des artistes actifs. - Zéro traction communautaire : pas de discussions, pas de recommandations organiques. - Coûts doubles des revenus sans tendance d'amélioration.

<span id="section-7"></span>

## 7. Cadre opérationnel de lancement

**Logistique, pilotage et gouvernance des validations.**

> **📦**
> **Logistique & livraison.** **Flux 1 (créations originales) :** l'artiste expédie (vendeur et détenteur). Orée fournit un **protocole** : emballage, **transporteur avec suivi**, **assurance au-delà d'un seuil**. **Transfert de risque (art. L. 216-4) :** en B2C, le risque pèse sur le vendeur jusqu'à la livraison → l'artiste sur le Flux 1. **Frais de port fixés par l'artiste**, affichés avant paiement. **Flux 2 (produits édités) :** expédition manuelle, **dropship POD** en Phase 2. **Retours :** frais à la charge de l'acheteur.

> **🧪**
> **Pilote onboarding KYC.** Le **formulaire unique KYC / KYB (DSP2)** est éprouvé sur **3 à 5 artistes réels**. Indicateurs : taux d'abandon, temps de complétion, points bloquants. **Critère de réussite :** complétion en quelques minutes sans assistance, aucun blocage Stripe, activation **Express** acceptable.

> **✅**
> **Gouvernance des validations externes.**
>
> - **Avocat :** les **deux jeux de CGV**, le **contrat artiste-plateforme**, les **contrats Écho & Éclaireur**, les **mentions légales**, la politique de rétractation, la clause médiateur.
> - **Expert-comptable :** le **montage TVA double flux**, le **mandat de facturation**, la **DAS2**, le **process de clôture**, le **choix de la PA**.
> - **Assurance :** la **RC pro** et la **couverture transport**.

> **🆘**
> **Continuité opérationnelle — le facteur « solo ».** Trois gestes critiques : (1) **traiter un litige** (`charge.dispute.created` → `transfer.reversal`) ; (2) **libérer les payouts dus** ; (3) **la clôture mensuelle**. Parades : **alertes push** (email / SMS via Sentry) sur litige et `payout.failed` ; un **runbook écrit** ; une **délégation de secours** à accès limité. Priorité d'automatisation : le litige.

> **🌲**
> **Transition vers la coopérative (La Canopée).** La bascule en **SCIC (Société Coopérative d'Intérêt Collectif)** implique une revue des deux flux. Le **statut artiste-auteur** et le statut **salarié-associé** coexistent sous conditions — documenté dès la Phase 2 pour préparer la transition sans rupture de droits. La SCIC permet le **multisociétariat** : tous les contributeurs actifs — artistes, artisans, **Éclaireurs, Échos et Bâtisseurs** — deviennent associés, réunis en **collèges** (salariés, producteurs, bénéficiaires…), à voix égale (1 personne = 1 voix), aucun collège ne dépassant 50 % des droits de vote. _Pourquoi SCIC plutôt que SCOP : dans une SCOP, seuls les salariés sont associés à part entière ; la SCIC est le seul véhicule qui rend la promesse « tous co-propriétaires » juridiquement tenable._

> **🛠️**
> **Les Bâtisseurs — statut & trajectoire.** Celles et ceux qui rendent Orée possible : 💻 Tech & Données, ⚖️ Légal & Fiscal, 📦 Opérations & Logistique. Contrairement aux Échos et Éclaireurs (réellement indépendants), leur travail est **par nature subordonné** : le risque de **requalification de la prestation en contrat de travail** (lien de subordination) est intrinsèque et ne se neutralise pas — il se **borne dans le temps**.
> **Au MVP**, faute de trésorerie pour salarier tout le monde, certains interviennent en **freelances / prestataires** sur missions **cadrées par livrables** (autonomie d'organisation, factures, pluralité de clients quand c'est possible, pas d'exclusivité de fait, durée limitée) ; l'objectif est d'**embaucher** ou de nouer des **partenariats** dès que possible.
> **En Canopée**, les Bâtisseurs ont vocation à devenir **salariés-associés** de la SCIC — vraisemblablement les premiers : c'est à la fois leur statut « juste » et la résolution propre du risque de requalification.

---

## 📎 Documents de référence

- 🗺️ Séquencement et features planifiées : [Roadmap Orée](/documents/roadmap/).
- 🔗 Dépôt, décisions d'architecture et salon technique : [Rejoindre Orée](/documents/rejoindre/).

---

↩️ _Retour au hub :_ [L'Orée : La marketplace éthique pour artistes et artisans](/documents/)
_Dernière mise à jour : 14 juillet 2026, par Jérémy, fondateur de L'Orée._

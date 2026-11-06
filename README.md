# Construire Orée

**Construire Orée** est le journal public de la construction d’**Orée**, un projet de future plateforme pour la création originale, l’art et l’artisanat d’art.

**[Visiter Construire Orée](https://construire-oree.pages.dev/)** · [Lire le Journal](https://construire-oree.pages.dev/journal/) · [Suivre les publications par RSS](https://construire-oree.pages.dev/rss.xml)

> **État du projet : point zéro.** Construire Orée est un site éditorial, pas une marketplace. Orée ne dispose encore d’aucun catalogue, compte utilisateur de marketplace, commande ou vente. Aucune date d’ouverture n’est annoncée. Le modèle coopératif, notamment une éventuelle SCIC, reste un horizon à étudier, et non une structure déjà constituée.

## Pourquoi ce site existe

L’ambition d’Orée est d’imaginer un cadre dans lequel les artistes et artisans puissent se concentrer davantage sur leur création, tandis qu’une organisation commune pourrait prendre en charge une partie de la visibilité, de la vente, de l’administration et de la logistique. **Il s’agit d’une intention de conception, pas d’un service opérationnel.**

Construire Orée rend ce travail visible et discutable : intentions, documents de fondation, questions ouvertes, décisions, limites et étapes réellement franchies. Le site distingue systématiquement **ce qui est publié**, **ce qui est envisagé** et **ce qui reste à vérifier**. Les scénarios décrits dans les articles ne doivent pas être interprétés comme des transactions ou des témoignages réels.

## Explorer Construire Orée

- [Projet](https://construire-oree.pages.dev/projet/) : intention, problème de départ et fonctionnement envisagé.
- [Avancement](https://construire-oree.pages.dev/avancement/) : état actuel, capacités absentes et sujets en examen.
- [Journal](https://construire-oree.pages.dev/journal/) : billets datés, publiés au fil des étapes, sans fréquence imposée.
- [Fondations](https://construire-oree.pages.dev/fondations/) : hypothèses et contraintes techniques, juridiques, fiscales et opérationnelles.
- [Écosystème](https://construire-oree.pages.dev/ecosysteme/) : rôles et relations envisagés.
- [Feuille de route](https://construire-oree.pages.dev/roadmap/) : étapes conditionnelles, sans calendrier de lancement promis.
- [Participer](https://construire-oree.pages.dev/rejoindre/) : partager une expérience ou proposer une contribution.

Les documents de conception sont intégrés aux pages thématiques. Les anciennes URL sous `/documents/` sont redirigées vers leurs destinations actuelles via `public/_redirects`.

## Fonctionnement technique

Le site repose sur **[Astro](https://astro.build/)** et est généré **statiquement**. Il ne s’agit pas d’une application transactionnelle ni d’un prototype de marketplace.

- **Pages et contenus** : pages Astro sous `src/pages/`, billets Markdown sous `src/content/journal/` et documents de référence sous `src/data/sources/`.
- **Présentation** : CSS et composants Astro, identité visuelle du Sceau, typographies Fraunces, Hanken Grotesk et JetBrains Mono.
- **JavaScript côté navigateur limité** : le script `src/scripts/seuil-motion.ts` améliore l’animation et certains comportements de navigation. Le site n’est donc **pas** « zéro JavaScript client » ; le contenu principal est produit en HTML statique, et le script prend en compte la préférence `prefers-reduced-motion`.
- **Diffusion** : configuration de site pour **Cloudflare Pages** sur `https://construire-oree.pages.dev`. La sortie de compilation Astro est `dist/`.
- **Découvrabilité** : métadonnées canoniques et sociales, sitemap Astro, `robots.txt`, [flux RSS](https://construire-oree.pages.dev/rss.xml) et intégration **IndexNow**. La publication ou la soumission d’URL ne garantit pas leur indexation.

Le workflow `.github/workflows/indexnow.yml` prévoit une soumission incrémentale des URL modifiées à IndexNow après un contrôle **Cloudflare Pages** réussi sur `main`, ainsi qu’un déclenchement manuel. Le script `scripts/submit-indexnow.mjs` vérifie la clé publique, lit les sitemaps publiés et détermine les URL à signaler.

## Lancer le projet en local

Prérequis : **Node.js 24.18.0 ou version ultérieure**, et npm.

```bash
npm ci
npm run dev
```

Pour produire le site statique et effectuer la recette courante :

```bash
npm run build
npm run verify:current
node scripts/verify-presentation.mjs
```

Pour consulter la compilation localement :

```bash
npm run preview
```

La recette courante vérifie notamment les routes, les métadonnées, les liens internes, les ancres, les redirections documentaires et la cohérence des billets avec le RSS. Elle **ne remplace pas** une vérification en navigateur (accessibilité effective, comportement responsive, animations, en-têtes et services externes).

Voir [la documentation des vérifications](./scripts/README-verifications.md). Les commandes globales de formatage et de lint du dépôt ont une portée à requalifier avant exécution ; se référer aux précautions indiquées dans ce document.

## Publier un billet

Les billets sont des fichiers Markdown placés dans `src/content/journal/`. Ils utilisent les champs `title`, `description`, `draft` et, pour un billet publié, `publishedAt`. Le Journal et le RSS excluent les brouillons. Une nouvelle publication doit décrire un fait, une réflexion ou une question en les qualifiant correctement, sans présenter une hypothèse comme un service disponible.

## Participer et suivre

- [Proposer une contribution ou une expertise](https://tally.so/r/685NbB)
- [Suivre l’aventure par courriel](https://tally.so/r/Bz57ON)
- [Écrire à Orée](https://tally.so/r/q4eVx7)
- [Discussions publiques](https://construire-oree.discourse.group/) et [sujet de bienvenue](https://construire-oree.discourse.group/t/bienvenue-sur-construire-oree/12)
- [LinkedIn](https://www.linkedin.com/in/jeremy-litique/) · [Instagram](https://www.instagram.com/projet.oree/)

Les formulaires Tally et le forum Discourse sont des services externes. Participer à une discussion ou répondre à un formulaire ne crée pas de compte sur la future plateforme Orée et ne constitue pas un engagement contractuel.

## Licences et droits

- **Code source** — sauf indication contraire, le code source de Construire Orée est mis à disposition sous la GNU Affero General Public License **version 3 seulement** (`AGPL-3.0-only`). Le texte intégral figure dans [`LICENSE`](./LICENSE). Mention : `Copyright (c) 2026 Jérémy LITIQUE`.
- **Contenus éditoriaux** — sauf indication contraire, la prose éditoriale originale destinée à être lue sur le site, y compris dans les fichiers mixtes de `src/pages/` et `src/content/`, est mise à disposition sous [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Cette licence ne couvre pas le code Astro, TypeScript ou CSS qui entoure cette prose. Attribution : **Jérémy LITIQUE**.
- **Éléments de marque réservés** — la dénomination et la marque « Orée », **Le Sceau** et ses déclinaisons, le logotype, `public/favicon.svg` et `public/social/construire-oree.png` ne sont placés ni sous l’AGPL ni sous CC BY-SA 4.0. Leur présence dans le dépôt n’accorde pas de licence de réutilisation ; droits de marque et copyright réservés. Toute utilisation exige une autorisation distincte du titulaire concerné.
- **Fontes tierces** — Fraunces (`Copyright 2020 The Fraunces Project Authors`), Hanken Grotesk (`Copyright 2021 The Hanken Grotesk Project Authors`) et JetBrains Mono (`Copyright 2020 The JetBrains Mono Project Authors`) sont distribuées sous [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/). Les paquets `@fontsource-variable/*` contiennent leurs avis et textes de licence.

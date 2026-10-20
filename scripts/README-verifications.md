# Vérifications de Construire Orée

## Recette courante, autonome du Vault

Depuis le checkout, avec les dépendances déjà installées :

```powershell
$env:ASTRO_TELEMETRY_DISABLED='1'
npm run build
npm run verify:current
node scripts/verify-presentation.mjs
```

`verify:current` lit seulement `dist/sitemap-0.xml`, les pages indiquées et les routes attendues, `dist/rss.xml`, `src/data/anchor-aliases.json` et `public/_redirects`. Aucun Git, SHA figé, chemin du Vault, réseau ou inventaire récursif. La dépendance `html-escaper` est déjà utilisée par la recette de présentation et présente dans l’arbre verrouillé ; aucun paquet n’est ajouté.

Attentes : routes principales et billets publiés, titres/descriptions et métadonnées sociales, canonical hors 404, liens internes et fragments, références ARIA, alias et redirections documentaires, contenu principal et menu natif, détails éditoriaux ouverts dans le HTML sans JavaScript. Quelques contrats éditoriaux sont explicites : date du dernier billet concordante entre accueil/article/liste/RSS, accès à l’état actuel, nuances de la conclusion d’À propos, conservation des trois portes.

```powershell
npm run verify:current -- --dist C:\chemin\vers\dist --output C:\chemin\vers\resultat.json
node scripts/verify-presentation.mjs --dist C:\chemin\vers\dist
```

Le répertoire de sortie doit exister. Code de sortie 0 : attentes satisfaites ; 1 : échec ou entrée manquante. Les chemins demandés sont bornés et le nom réservé `design-qa.md`, y compris encodé, est refusé avant accès. Ne pas utiliser une commande globale de formatage, lint ou recherche qui pourrait traiter ce fichier. Utiliser des listes autorisées avec exclusions en amont.

Portée : analyse statique du HTML produit par Astro, dont les attributs sont cités, et du sitemap unique actuel. Ce n’est pas un parseur de HTML arbitraire. Une évolution vers plusieurs sitemaps ou des redirections plus complexes exigera d’adapter le contrat. Le script ne reconstruit pas le site : exécuter le build après les modifications.

Cette recette ne prouve ni le rendu responsive, ni l’ordre de focus, ni le zoom réel, ni les interactions ou le mouvement réduit en exécution, ni les en-têtes HTTP/les vraies redirections Cloudflare, ni l’état de Tally/Discourse. Elle ne certifie ni conformité WCAG, ni sécurité, ni pratiques de traitement des données. Compléter par une recette navigateur sur les pages modifiées quand la surface est disponible.

## Présentation et preuves historiques

`verify-presentation.mjs` reste la recette des jonctions textuelles, titres et identifiants du build. Son option `--dist` s’applique aussi au sitemap. L’option `--baseline` exige une identité de toutes les destinations : elle n’est pas adaptée telle quelle à un changement intentionnel de liens ; utiliser alors une comparaison dont les écarts autorisés sont explicites.

`verify-editorial.mjs` est un contrôle historique de conservation de Mission 031. Il dépend de son SHA source, de `archives-conception-v1.json` et `ancres-historiques.json` dans le Vault031. Il écrit ses preuves par défaut dans ce dossier historique. Il ne faut donc pas l’utiliser comme recette courante ni le lancer sans requalifier sa portée et sa destination de sortie. Il est conservé sans modification, avec son rôle de preuve de migration. Les composants documentaires dormants et les sources de provenance restent conservés.

Pour une vérification de formatage ou lint, passer explicitement les fichiers autorisés. Ne pas lancer `npm run format`, `npm run format:check` ou `npm run lint` à la racine tant que leur portée générale n’a pas été adaptée à l’exclusion.

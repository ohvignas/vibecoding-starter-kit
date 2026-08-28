# La boucle de publication : purger une page, pas reconstruire le site — Plan

> **Pour les agents :** exécuter avec `superpowers:subagent-driven-development`.

**But :** aligner la stack `vitrine` du kit sur ce que le template **AstroTan** (`~/Desktop/AstroTan`) fait déjà tourner. Le kit prescrit aujourd'hui de **reconstruire tout le site** à chaque publication ; le template **purge la page concernée** et ne reconstruit rien.

**Contexte :** chaque élève développe encore son site à la main — le kit doit donc **enseigner** ces patrons, pas seulement les livrer plus tard sous forme de template.

---

## Ce que le kit dit aujourd'hui, et pourquoi c'est insuffisant

`templates/run/vitrine.md:81-91` et `templates/commands/deploy.md:36` :

```bash
docker compose build --build-arg CONTENU_REV=$(date +%s) site && docker compose up -d site
```

Reconstruire **tout** le site parce qu'une page a changé. Sur un site de trente pages, chaque correction de faute de frappe rejoue le build entier. Et le `--build-arg` n'existe que pour tromper le cache Docker — un contournement, pas une conception.

## Ce que le template fait, mesuré dans son code

| | Où | Ce que ça fait |
|---|---|---|
| `Astro.cache.set({ maxAge: 300, swr: 600, tags: ["pages", \`page:${slug}\`] })` | `apps/web/src/pages/[...slug].astro:47` | chaque page porte **son propre tag** |
| `routeRules: { "/[...slug]": { maxAge: 300, swr: 600, tags: ["pages"] } }` | `apps/web/astro.config.ts` | indice par motif de route, lu **quand la route n'appelle pas `set()` elle-même** |
| `cache: { provider: memoryCache() }` | idem | l'API Cache d'Astro 7 |
| `POST /api/revalidate` → `cache.invalidate(tags)` | `apps/web/src/pages/api/revalidate.ts` | purge **par tag** |
| outbox + `drain` qui POSTe | `packages/backend/convex/revalidate.ts` | livraison durable depuis Convex |

Publication → `drain` → `POST /api/revalidate` → purge du tag `page:slug` → **la prochaine requête re-rend cette page-là**. Aucun rebuild, aucun cron, aucun retard annoncé.

---

## Contraintes globales

- **Le kit ne livre pas de code.** Il livre des règles, un runbook et des gardes. Convention vérifiée sur les 4 stacks.
- **Astro 7** est déjà épinglé (`PINS.vitrine.astro = 7`) — l'API Cache y est stable. Ne pas remonter le plancher.
- Le garde `scripts/lib/vitrine-build-time.test.mjs` a pour corpus **tout fichier livré**, et **tout paragraphe qui parle du site public**. Il rougit sur une phrase pédagogique correcte citant `useQuery` ; la parade est **deux lignes** (interdiction d'abord, confinement rattaché ensuite). **INTERDIT de le modifier.**
- « formation » et « accompagnement » interdits dans un fichier livré (`H7bis`).
- Suite : `npm test` (jamais `node --run`, absent en Node 20.12). Base **626 · 626 pass · 0 fail**, verdict **nommé**.
- Toute modification de `templates/commands/` ou `templates/cursor/rules/` impose `node scripts/build-cursor-plugin.mjs`.

---

## Tâche 1 — La règle : deux modèles, et comment choisir

**Fichiers :** `templates/cursor/rules/vitrine/build-time.mdc`, `stacks/vitrine/AGENTS.md`

La règle actuelle finit sur « publier ne met le site à jour **qu'au rebuild** ». Elle doit désormais poser **deux modèles** et le critère qui départage :

1. **Tout prérendu + rebuild** — simple, aucune infrastructure de cache. Le site est un dossier de fichiers. Convient à un site qui change rarement.
2. **Prérendu + routes CMS en SSR avec cache par tag** — la page publiée est purgée seule, la suivante la re-rend. Aucun rebuild. C'est ce que fait le template.

**La règle de décision, qui manque dans les deux projets** (je l'ai signalée au template, elle n'y est écrite nulle part non plus) :

> Une page dont le contenu vient du CMS et peut changer sans redéploiement → **SSR + cache par tag**.
> Une page dont le contenu est dans le code → **prérendue**.
> L'opt-out est **`export const prerender = false` dans la route elle-même**, jamais une absence d'entrée dans `routeRules`.

Sans cette phrase, un contributeur qui ajoute `/blog/[slug]` ne sait pas de quel côté le mettre.

---

## Tâche 2 — La boucle de publication remplace le rebuild

**Fichiers :** `templates/run/vitrine.md`, `templates/commands/deploy.md`

Remplacer la prescription « reconstruire tout » par la boucle réelle :

```
publication (dashboard)
  → Convex écrit une ligne d'outbox
  → une action `drain` POSTe sur /api/revalidate du site
  → le site purge le tag `page:<slug>`
  → la requête suivante re-rend cette page
```

**Quatre points que le runbook doit dire, chacun pour une raison mesurée dans le template :**

1. **Chaque page porte son tag** (`page:<slug>`) en plus du tag de route (`pages`) — sinon publier une page purge **toutes** les pages en cache.
2. **Un 404 ne se cache jamais** : `Astro.cache.set(false)`. Sinon il faudrait qu'une future publication de ce slug exact pense à l'invalider.
3. ⚠️ **`memoryCache()` est par processus.** Une invalidation n'atteint que l'instance qui a reçu l'appel HTTP. **Une seule réplique**, ou un fournisseur partagé (Redis) avant d'en lancer deux. C'est la dette que le template assume explicitement — le kit doit la dire **avant** qu'un élève scale à deux conteneurs et voie ses publications ne marcher qu'une fois sur deux.
4. **L'outbox, pas un `fetch` direct** : si le site est en train de redémarrer au moment de la publication, un appel direct est perdu sans trace. Une ligne d'outbox rejouée par `drain` ne l'est pas.

Le rebuild complet reste documenté comme **modèle 1**, pour un site qui n'a pas de CMS.

---

## Tâche 3 — Le secret de l'endpoint, et la faille que le template a fermée

**Fichier :** `templates/cursor/rules/vitrine/build-time.mdc` (ou une règle `revalidate.mdc` dédiée)

`/api/revalidate` peut purger tout le cache du site. Le runbook doit prescrire :

- secret d'**au moins 32 caractères**, lu **dans le handler** — pas au chargement du module. Une variable manquante doit être un **500 visible**, pas un refus indiscernable d'un mauvais secret.
- comparaison en temps constant, **en hachant les deux côtés d'abord** (`createHash("sha256").digest()` puis `timingSafeEqual`).

⚠️ **La raison, mesurée par le template, mérite d'être écrite** : un contrôle de longueur avant `timingSafeEqual` **fuite la longueur du secret**. `String.length` compte des unités UTF-16, Node lit les en-têtes HTTP en **latin1**, donc un octet ≥ 0x80 devient **deux** octets une fois converti en UTF-8. Un secret de même longueur en caractères mais différente en octets passait le contrôle, puis faisait **jeter** `timingSafeEqual` — un 500 au lieu d'un 401, qui permet de trouver la longueur du vrai secret par dichotomie.

Hacher d'abord supprime la classe entière : un digest fait toujours 32 octets, il n'y a plus de longueur qui puisse différer.

- **Un corps mal formé est refusé, jamais coercé** en `[]` : sinon un 200 répond « purgé » sans avoir rien purgé.

---

## Tâche 4 — Le runbook de scaffold

**Fichier :** `templates/commands/new-project/07-scaffold.md`, puce `vitrine`

Ajouter à la séquence, après le câblage Convex : poser l'endpoint `/api/revalidate`, déclarer `cache: { provider: memoryCache() }` et les `routeRules`, et écrire côté Convex l'outbox + l'action `drain`.

⚠️ **Ne pas dicter le code** — le kit n'en livre pas. Le runbook dit **quoi construire et pourquoi**, l'IA écrit.

---

## Tâche 5 — Les gardes

- La règle nomme les **deux** modèles et le critère de décision.
- Le runbook dit la contrainte **une seule réplique** de `memoryCache()` — c'est la phrase dont l'absence coûte le plus cher.
- Le tag par page (`page:<slug>`) est nommé, pas seulement le tag de route.
- `Astro.cache.set(false)` sur le 404 est nommé.
- Le secret : longueur minimale **et** hachage avant comparaison, avec la raison.

**Chaque garde doit mordre** : mutation qui retire la phrase → rouge, et le message doit nommer ce qui manque. Ce lot en a produit **18 qui mentaient** : pour chacun, *qu'est-ce qui le ferait échouer ?*

---

## Ce qui n'est pas dans ce lot

- Aucun code livré (endpoint, schéma outbox, action `drain`).
- Le passage du kit à pnpm/turbo, ou le renommage `site/`→`apps/web` : le template et le kit divergent encore, c'est une décision à part.
- Le téléchargement direct du template : prévu par l'utilisateur pour plus tard.

# Stack vitrine → Astro + Convex + Better Auth — Plan

> **Pour les agents :** exécuter avec `superpowers:subagent-driven-development`.

**But :** remplacer la stack `vitrine` du kit — aujourd'hui Astro + Keystatic + hébergement gratuit — par **Astro (site public) + TanStack Start (dashboard) + Convex + Better Auth**, déployés en **Docker sur un VPS**.

**Décision de l'utilisateur (2026-08-27) :** *remplacer*, pas ajouter une 5ᵉ stack. Concernant le dashboard : « ce que le kit fait pour les autres stacks » — donc **runbook + règles + manifeste, aucun code d'application généré**, ce qui est la convention vérifiée du dépôt (`stacks/<nom>/` ne contient que trois `.md`, et le scaffold est une commande dans `07-scaffold.md`).

---

## Ce que ce changement coûte, écrit une fois

Deux conséquences à assumer, qui ne sont pas des objections mais des faits :

1. **Aucune stack du kit ne sera plus gratuite ni sans serveur.** La vitrine était la seule à ne demander ni compte, ni base, ni VPS. Un débutant qui fait le site d'un commerce devra désormais ouvrir un compte Convex et louer un VPS.
2. **Le kit cessera de décrire le site ILLITH actuel**, qui tourne sous Keystatic. L'artifact de présentation déjà publié documente l'état d'aujourd'hui et restera valable comme « avant ».

---

## Contraintes globales

Chaque tâche hérite de ces règles.

- **Aucun code d'application n'est livré.** Le kit fournit la commande de scaffold, les règles, le manifeste. Convention vérifiée sur les 4 stacks existantes.
- **Deux applications, une racine.** Disposition retenue : `site/` (Astro) et `dashboard/` (TanStack Start) sous la racine du projet. Elle reproduit celle du dépôt réel `ohvignas/ecoleillith-website` (`site/`).
- **Le site public ne lit JAMAIS Convex depuis le navigateur.** Il le lit **au build**. C'est la règle non négociable de ce lot : un `useQuery` dans une page publique vide le HTML et détruit le SEO — or le SEO est la raison d'être de cette stack.
- **Better Auth ne vit que dans `dashboard/`.** Vérifié : `@convex-dev/better-auth` (0.12.5, maintenu par Convex) a des guides officiels pour TanStack Start, Next.js, SvelteKit, React SPA et Expo — **aucun pour Astro** (`/framework-guides/astro` → 404), et une discussion GitHub recense « 4 adoption blockers for Convex + Astro ».
- **Node ≥ 22.12** (Astro 7 refuse en dessous) — `PINS.vitrine` inchangé.
- **Toute modification de `templates/commands/` ou `templates/cursor/rules/` impose de régénérer le plugin** (`node scripts/build-cursor-plugin.mjs`) — un garde compare la copie committée au build.
- Suite : `node --run test`, base **580 pass / 0 fail**. Lancer la suite **après `git add -A`** (`degraissage.test.mjs` lit `git ls-files`).

---

## Tâche 1 — Le manifeste

**Fichier :** `scripts/lib/matrix.mjs` (`STACKS.vitrine`, `AI_CONTEXT.vitrine`)

| Champ | Aujourd'hui | Après |
|---|---|---|
| `mcp` | astro-docs, shadcn, playwright | **+ convex, better-auth** |
| `skills` | shadcn/ui, boraoztunc/skills, stitch | **+ better-auth/skills, get-convex/agent-skills** |
| `plugins` | tous vides | **+ convex** (claude-code et cursor), repris de `STACKS.saas` |
| `rules` | shadcn×Astro, **Keystatic×Astro**, Déployer Astro | shadcn×Astro, **Convex rules**, **Better Auth llms**, **TanStack Start llms**, **Déployer en Docker** |
| `AI_CONTEXT` | `["astro"]` | `["astro","convex","better-auth","tanstack-start"]` |
| `scripts` | `typecheck: astro check` | voir tâche 2 — la valeur change avec la disposition |
| `domains` | seo, geo, forms, analytics, images, i18n | inchangés (`forms` reste : un formulaire de contact n'a pas besoin de Convex) |

**Garde à écrire :** les 5 MCP déclarés existent dans le catalogue, et `AI_CONTEXT.vitrine` ne cite que des dossiers réellement présents sous `ai-context/` (sinon `--refresh` livre un dossier vide, défaut déjà rencontré au lot précédent).

---

## Tâche 2 — Deux applications, et les vérifications qui doivent continuer de mordre

**⚠️ C'est la tâche à risque du lot.**

`templates/hooks/framework/checks.mjs` lit le `package.json` **du dossier courant** (`scriptCommand(cwd, name)`, ligne 27-30). Si un check ne trouve pas son script, il se déclare `willRun: false` avec une raison — **il ne rougit pas**. Avec `site/` et `dashboard/` en sous-dossiers, la racine n'a plus de `package.json` : **tous les checks se sauteraient en silence**, et le pre-commit passerait au vert sans rien vérifier.

**Solution retenue :** un `package.json` à la racine, avec `workspaces: ["site", "dashboard"]` et des scripts qui ratissent les deux :

```json
{ "scripts": {
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "build": "npm run build --workspaces --if-present"
} }
```

`checks.mjs` reste **inchangé** : il trouve ses scripts à la racine comme aujourd'hui.

**Garde à écrire, et c'est le plus important du lot :** scaffolder un projet vitrine, supprimer le script `typecheck` du `package.json` racine, et vérifier que `selectChecks` rend bien `willRun: false` — puis vérifier qu'avec le script présent il rend `willRun: true` **et que la commande porte les deux workspaces**. Sans les deux sens, le garde ne prouve rien.

---

## Tâche 3 — Le runbook de scaffold

**Fichier :** `templates/commands/new-project/07-scaffold.md`, puce `vitrine`

Remplacer la ligne actuelle par une séquence en trois temps :

1. `npx shadcn@latest init --template astro --base base --no-monorepo --preset <code> --name site --yes` — **les 5 drapeaux restent obligatoires** (sans eux, `init` pose 4 questions dont 3 aux flèches, et une IA reste bloquée sans erreur : piège déjà documenté, à conserver mot pour mot).
2. `npm create convex@latest dashboard -- -t tanstack-start` — **le `-t` est obligatoire**, même piège que la stack saas (sélecteur aux flèches sinon). Le template **ne contient aucune auth**.
3. Better Auth dans `dashboard/` uniquement, via `@convex-dev/better-auth`, en suivant le guide officiel **TanStack Start**.

Puis : le `package.json` racine de la tâche 2, et **`"typecheck": "astro check"` dans `site/`** — le template Astro n'en pose aucun, et sans lui le hook retombe sur `tsc --noEmit`, qui **ne lit pas les `.astro`** et sort vert sans rien vérifier (piège déjà documenté, à conserver).

---

## Tâche 4 — La règle qui protège le SEO

**La raison d'être de ce lot, et la seule erreur qui coûterait vraiment cher.**

Nouvelle règle permanente dans `stacks/vitrine/AGENTS.md` et `templates/cursor/rules/vitrine/` :

> Les pages publiques lisent Convex **au build**, via le client serveur, dans le frontmatter Astro ou `getStaticPaths`. **Jamais** `useQuery` ni `ConvexProvider` dans une page publique : le contenu arriverait après le chargement, le HTML servi serait vide, et le JSON-LD n'aurait plus rien à décrire. `useQuery` est réservé au `dashboard/`.

**Garde à écrire :** un test qui échoue si `useQuery` ou `ConvexProvider` apparaît dans un exemple ou un template destiné à `site/`. Le garde doit citer la raison, pas seulement interdire la chaîne.

---

## Tâche 5 — Les trois documents de la stack

**Fichiers :** `stacks/vitrine/README.md`, `AGENTS.md`, `prompts-de-demarrage.md`

Réécriture complète. Le README garde sa forme actuelle (tableau « Les briques », section SEO/GEO, étapes numérotées) mais décrit les deux applications, le flux build-time, et le déploiement Docker. `AGENTS.md` reçoit la règle de la tâche 4.

⛔ **Interdiction déjà en vigueur** : aucun fichier livré ne doit contenir « formation » ni « accompagnement » (garde `H7bis`).

---

## Tâche 6 — Règles Cursor et skill de stack

**Fichiers :** `templates/cursor/rules/vitrine/` (aujourd'hui : `astro.mdc`, `seo-geo.mdc`, `shadcn-islands.mdc`, `typescript.mdc`), `.claude/skills/stack-vitrine/SKILL.md`

Ajouter `convex.mdc` et `better-auth.mdc` (repris de `saas/`), et une règle `build-time.mdc` portant la tâche 4. `shadcn-islands.mdc` doit dire explicitement que les îlots du site public **ne se connectent pas à Convex**.

**Régénérer le plugin Cursor.**

---

## Tâche 7 — CI, env, gitignore, doc de lancement

| Fichier | Changement |
|---|---|
| `templates/ci/vitrine.yml` | build des **deux** workspaces ; l'en-tête cite encore « Keystatic » |
| `templates/env/vitrine.env.example` | `CONVEX_DEPLOYMENT`, `PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` ; garder `SITE_URL` |
| `templates/gitignore/vitrine.gitignore` | artefacts Convex |
| `templates/run/vitrine.md` | lancer **deux** applications (`site` sur 4321, `dashboard` sur son port), plus `npx convex dev` |

---

## Tâche 8 — Déploiement Docker / VPS

**Fichiers :** `templates/commands/deploy.md` (item 2, aujourd'hui « Netlify, Vercel ou Cloudflare Pages »), `templates/run/vitrine.md`

Le kit ne livre pas de `Dockerfile` (il ne livre pas de code) mais le runbook doit décrire : deux images, un reverse-proxy TLS, les variables d'environnement, et **le déclenchement du rebuild du site à la publication** — sans quoi le contenu change dans Convex et le site public ne bouge pas. C'est la conséquence directe du choix build-time, et elle doit être écrite noir sur blanc.

**Décision à acter :** Convex en **cloud** par défaut. L'auto-hébergement existe et est documenté, mais Convex écrit lui-même « Self hosting is not for everyone » et la version auto-hébergée équivaut au palier gratuit. Le runbook le mentionne en note, sans en faire le chemin par défaut.

---

## Tâche 9 — `/doctor`

**Fichier :** `templates/commands/doctor.md` (+ copie plugin)

- Item 10, ligne MCP : `vitrine : astro-docs, shadcn, playwright` → **+ convex, better-auth**
- Item 17 (MCP de test) : `playwright` reste correct pour la vitrine
- **Nouvel item** : les deux applications sont présentes, et le `package.json` racine porte bien ses scripts — sinon les checks se sautent en silence (tâche 2)
- ⚠️ Le verdict final couvre « de 1 à 17 ». Ajouter un item **déplace la borne** : la ligne de verdict doit suivre, sinon le ✅ devient inatteignable. Défaut rencontré au lot précédent, garde `T11` en place.

---

## Tâche 10 — Toutes les autres surfaces

Relevé exhaustif (`grep -rl vitrine`, hors tests et plans archivés) :

`scripts/lib/wizard.mjs` (libellé du choix 4) · `README.md` · `guides/01-comment-parler-a-l-IA.md` · `guides/02-installer-les-outils.md` · `guides/glossaire.md` · `playbook/00-START.md` · `playbook/stack-vitrine.md` · `formateur/plan-de-cours.md` · `formateur/tournage-prd-techspec.md` · `scripts/download-ai-context.sh` · `templates/agents/subagents/{critique-donnees,critique-ux,test-runner}.md` · `templates/commands/init-vibecoding/{01-les-2-questions,02-scaffold}.md` · `templates/commands/new-project/{05-design-maquette,06-roadmap}.md` · `ai-context/README.md`

---

## Tâche 11 — Les tests

**~25 fichiers** citent `vitrine`. Les plus structurants :

`matrix-manifest.test.mjs` · `cablage-stacks.test.mjs` · `faits-stacks.test.mjs` · `new-project-runbook.test.mjs` · `parcours.test.mjs` · `docs.test.mjs` · `promesses-livrees.test.mjs` · `renvois-morts.test.mjs` · `commands.test.mjs` · `crew.test.mjs` · `wizard.test.mjs` · `smoke-e2e.mjs`

Ils ne sont pas une corvée : **ce sont eux qui diront ce que j'ai oublié**. Attendre qu'ils rougissent, et traiter chaque rouge comme une information.

---

## Ordre d'exécution

**1 → 2 → 3 → 4** d'abord : le manifeste, la disposition, le scaffold, la règle SEO. Ce sont les quatre qui décident de l'architecture ; tout le reste en découle.

**5 → 9** ensuite : documents, règles, CI, déploiement, `/doctor`.

**10 → 11** en dernier : les surfaces annexes, puis la suite entière.

---

## Ce qui n'est pas dans ce lot

- Aucun code d'application (dashboard, schéma Convex, écrans) — conforme à la convention du kit.
- Aucune migration de contenu Keystatic → Convex. Un projet existant sous l'ancienne stack n'est pas repris.
- L'auto-hébergement de Convex : mentionné, pas outillé.

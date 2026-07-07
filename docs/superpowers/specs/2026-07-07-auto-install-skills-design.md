# Auto-install des skills design + prompt de démarrage — Design

**Date :** 2026-07-07
**Statut :** approuvé (go utilisateur) — prêt pour writing-plans

## Problème

À la fin du wizard, la section « À lancer DANS ton assistant IA » demande à l'élève d'installer **superpowers** + **5 skills design** à la main. Vérifié en vrai : les `npx skills add …` **marchent en headless** (comme caveman). Donc les skills design peuvent être **installés automatiquement** par le wizard ; il ne reste que ce qui est vraiment « in-assistant » (plugins + MCP auth).

## Décision (recherche vérifiée)

- **Auto-installables headless** via le CLI `vercel-labs/skills` (`npx -y skills add <repo> [--skill …] -a <assistant> --yes`, `-a` ∈ {cursor, claude-code, codex}) :
  - `frontend-design` + `brand-guidelines` → `github.com/anthropics/skills` (une seule commande)
  - `web-design-guidelines` → `github.com/vercel-labs/agent-skills`
  - `ui-ux-pro-max` → `github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- **shadcnblocks** : s'installe headless MAIS nécessite une **clé API payante + `jq`** pour fonctionner → **note**, pas auto.
- **superpowers** : c'est un **plugin** (commandes + hooks) ; `npx skills add` ne prend que les SKILL.md → install cassé. **Reste 1 commande dans l'assistant** (`/add-plugin superpowers` · `/plugin install superpowers@claude-plugins-official` · Codex `/plugins`).
- **Skills stack** (better-auth, convex-agent-skills, expo) : aussi headless, mais **hors scope ici** — restent dans `docs/SETUP-AI.md`, joués par le prompt de démarrage (prouvé). (Auto possible en suivi.)

## Objectif

1. Le wizard **auto-installe les 4 skills design gratuits** (via `npx skills add -a <assistant>`), après caveman, en **échec gracieux** (comme le reste).
2. La liste « À lancer dans l'assistant » se réduit à **superpowers** ; `docs/SETUP-AI.md` devient la **source unique** (plugins + skills stack + MCP + superpowers), avec une **note shadcnblocks**.
3. Le wizard **imprime un prompt court prêt à coller** à la fin (l'IA finit : plugins + MCP `/mcp` + superpowers, puis `/new-project`).

## Principes

- Zéro dépendance côté kit (le CLI `skills` est lancé via `npx`, pas une dépendance du repo). Échec gracieux : une install ratée (offline…) va dans `failed`, ne bloque pas.
- Testable : la **construction de commande** (`buildSkillAddArgs`) est pure et testée ; le `run` (spawn) est injecté (comme `installCaveman`) → les tests ne touchent pas le réseau.
- `-a` prend l'id assistant du kit (`cursor`/`claude-code`/`codex`), pas `--all` (qui viserait tous les agents).

## Architecture & fichiers

**Modifiés :**
- `scripts/lib/external.mjs` — `buildSkillAddArgs(spec, assistant) → string[]` (pur) ; `installSkills(specs, assistant, run) → {done, failed}` (boucle gracieuse, `run` injecté).
- `scripts/lib/matrix.mjs` — `export const DESIGN_SKILL_SPECS` (les 3 commandes / 4 skills) ; `export const SHADCN_NOTE` ; **retirer** la ligne design de `inAssistant` dans `resolveAssets` (garde superpowers).
- `scripts/lib/setup-ai.mjs` — `renderSetupAi` : nouvelle section **superpowers** (commande par assistant) ; la section design devient « déjà installés par le wizard + note shadcnblocks ». Signature : ajoute `superpowersCmd`.
- `scripts/setup.mjs` — après le bloc caveman, appeler `installSkills(DESIGN_SKILL_SPECS, args.assistant)` (done/failed → rapport) ; passer `superpowersCmd` à `renderSetupAi` ; imprimer le **prompt de démarrage** à la fin (surtout en mode wizard).
- Tests : `external.test.mjs` (buildSkillAddArgs + installSkills gracieux) ; `matrix.test.mjs` (design **absent** de inAssistant) ; `setup-ai.test.mjs` (section superpowers + note shadcnblocks).
- Docs (léger) : `playbook/00-START.md` / `README` — mention « les skills design sont installés par le wizard ».

## Forme des données

```js
DESIGN_SKILL_SPECS = [
  { label: 'frontend-design + brand-guidelines', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines'] },
  { label: 'web-design-guidelines',              repo: 'github.com/vercel-labs/agent-skills', skills: ['web-design-guidelines'] },
  { label: 'ui-ux-pro-max',                      repo: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill', skills: ['ui-ux-pro-max'] },
];
// buildSkillAddArgs(spec, 'cursor') → ['-y','skills','add', spec.repo, '--skill', ...spec.skills, '-a','cursor','--yes']  (lancé via npx)
```

## Prompt de démarrage (imprimé par le wizard)

```
Finalise l'install et démarre :
1. Ouvre docs/SETUP-AI.md → installe les plugins (Convex/Expo/Electron selon la stack), les skills stack, et autorise les MCP (/mcp).
2. Boucle superpowers : <commande selon l'assistant>.
3. /doctor pour vérifier.
4. /new-project (PRD + tech spec + design), puis /build.
(Les skills design sont déjà installés par le wizard.)
```

## Non-goals

- Pas d'auto-install de superpowers (plugin → impossible headless).
- Pas d'auto-install des skills stack ici (restent dans SETUP-AI + prompt ; auto en suivi si voulu).
- Pas de shadcnblocks auto (clé payante).
- Pas de silence du bruit `gemini` de l'installeur caveman (externe, cosmétique).

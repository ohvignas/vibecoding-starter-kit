# Stack Vitrine (Astro + shadcn + Keystatic, SEO/GEO) + presets shadcn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une 4e stack `vitrine` (Astro + shadcn/ui en îlots React + Keystatic CMS, optimisée **SEO + GEO**) + le flux **presets shadcn** (`ui.shadcn.com/create` → `npx shadcn@latest init --preset <code>`) pour toutes les stacks web + le MCP shadcn ajouté au Desktop.

**Architecture:** La stack vitrine suit **exactement** le moule des 3 existantes : entrée dans `STACKS` (args/wizard/matrix), dossier `stacks/vitrine/`, templates par stack (env/ci/gitignore/run/examples/environment), règles Cursor `.mdc`, skill `stack-vitrine`. Particularités : pas de `llms.txt` Astro (retiré en mai 2026 → **MCP Docs Astro** à la place), GEO par `public/llms.txt` du **site généré** + JSON-LD, robots.txt qui **autorise les crawlers IA**. Le preset shadcn est demandé par `/new-project` (Phase 5) et appliqué au scaffold (Phase 7) — jamais par le wizard (qui ne scaffolde pas l'app).

**Tech Stack:** Node ESM zéro dépendance, `node --test`. Côté stack générée : Astro 5 + Tailwind v4 + React (îlots) + shadcn/ui (CLI v4) + Keystatic (mode `local`).

## Global Constraints

- Node ESM, **zéro dépendance runtime**, tests `node --test`. Suite **verte** avant publish.
- Copie utilisateur en **français** ; jamais les mots « formation »/« accompagnement » dans les fichiers générés.
- **Windows-safe** : `fileURLToPath` (jamais `new URL(...).pathname`) ; pas de symlink dans les tests.
- La stack s'appelle **`vitrine`** partout (clé exacte). Menu wizard : « Site vitrine / blog ».
- **SEO** : `@astrojs/sitemap` (officiel, exige `site` dans la config), `robots.txt` dans `public/` pointant le sitemap et **autorisant** `GPTBot`, `PerplexityBot`, `ClaudeBot`, meta + Open Graph par page, canonical, JSON-LD.
- **GEO** : `public/llms.txt` du site **maintenu par l'IA** (zéro dépendance) + JSON-LD schema.org (Organization/LocalBusiness/FAQPage/Article) — lus par ChatGPT/Perplexity/Claude.
- **Îlots** : le contexte React n'est **pas partagé** entre îlots Astro → composants shadcn interactifs liés = **un seul fichier `.tsx`** importé avec `client:*`.
- Preset shadcn : format `--preset <code>` (code copié depuis `https://ui.shadcn.com/create`). Mapping template : **vitrine → `--template astro`** (crée l'app), **saas/desktop → `init --preset <code>` dans le projet existant** (pas de `--template`), **mobile → jamais** (NativeWind).
- Bump **0.4.0**. `npm view create-vibecoding-kit version` doit rendre `0.4.0` après publish.

---

### Task 1: `vitrine` dans args + wizard

**Files:**
- Modify: `scripts/lib/args.mjs:3` (const STACKS)
- Modify: `scripts/lib/wizard.mjs` (menu STACKS + aide non-TTY ligne 56)
- Test: `scripts/lib/args.test.mjs`, `scripts/lib/wizard.test.mjs`

**Interfaces:**
- Produces : `parseArgs`/`validateArgs` acceptent `--stack vitrine` ; `runWizard` propose 4 stacks (vitrine = choix 4, PAS de question backend Convex pour vitrine).

- [ ] **Step 1: Write the failing tests**

Dans `scripts/lib/args.test.mjs`, ajouter :

```js
test('validateArgs : vitrine est une stack valide', () => {
  assert.deepEqual(validateArgs(parseArgs(['--stack','vitrine','--assistant','cursor','--project','x'])), []);
});
```

Dans `scripts/lib/wizard.test.mjs`, ajouter :

```js
test('runWizard : vitrine (choix 4) → pas de question backend', async () => {
  const ask = scripted(['4', '1', 'site', 'n', 'n', '']); // vitrine, cursor, nom, caveman non, apprentissage non, code vide
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'vitrine', assistant: 'cursor', project: 'site', backend: 'cloud', caveman: false, learning: false, license: '' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/args.test.mjs scripts/lib/wizard.test.mjs`
Expected: FAIL — `--stack doit valoir saas|mobile|desktop` et choix `4` invalide au wizard.

- [ ] **Step 3: Implement**

`scripts/lib/args.mjs` ligne 3 :

```js
const STACKS = ['saas', 'mobile', 'desktop', 'vitrine'];
```

`scripts/lib/wizard.mjs`, tableau `STACKS` :

```js
const STACKS = [
  { key: 'saas', label: 'SaaS web', hint: 'Convex + TanStack Start + Better Auth' },
  { key: 'mobile', label: 'Mobile', hint: 'React Native (Expo) + Convex' },
  { key: 'desktop', label: 'Desktop', hint: 'Electron' },
  { key: 'vitrine', label: 'Site vitrine / blog', hint: 'Astro + shadcn/ui + Keystatic (CMS) — SEO/GEO' },
];
```

Ligne 56 (aide non-TTY) : remplacer `--stack saas|mobile|desktop` par `--stack saas|mobile|desktop|vitrine`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/args.test.mjs scripts/lib/wizard.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/args.mjs scripts/lib/wizard.mjs scripts/lib/args.test.mjs scripts/lib/wizard.test.mjs
git commit -m "feat(vitrine): stack vitrine dans args + wizard (4e choix, sans backend Convex)"
```

---

### Task 2: Manifeste `vitrine` dans matrix.mjs + shadcn MCP sur Desktop

**Files:**
- Modify: `scripts/lib/matrix.mjs` (objet `STACKS` : ajouter `vitrine` ; `desktop.mcp` : ajouter shadcn)
- Test: `scripts/lib/matrix-manifest.test.mjs`

**Interfaces:**
- Consumes : `STITCH_SKILL` (const existante du fichier).
- Produces : `resolveStackManifest('vitrine', a)` → `{ plugins, mcp, skills, checks, scripts, rules, domains }` ; `resolveStackManifest('desktop', a).mcp.shadcn` existe.

- [ ] **Step 1: Write the failing tests**

Dans `scripts/lib/matrix-manifest.test.mjs` :
- Étendre la boucle ligne 6 : `for (const s of ['saas', 'mobile', 'desktop', 'vitrine'])`.
- Ajouter :

```js
test('vitrine : MCP astro-docs + shadcn ; skills seo + shadcn ; domaines SEO/GEO', () => {
  const m = resolveStackManifest('vitrine', 'claude-code');
  assert.ok(m.mcp['astro-docs'], 'MCP astro-docs présent');
  assert.ok(m.mcp.shadcn, 'MCP shadcn présent');
  assert.ok(m.skills.some((s) => s.repo === 'shadcn/ui'), 'skill officiel shadcn/ui');
  assert.ok(m.skills.some((s) => (s.skills || []).includes('seo-audit')), 'skills SEO');
  assert.ok(m.domains.seo && m.domains.geo, 'domaines seo + geo');
  assert.match(m.scripts.typecheck, /astro check/);
});

test('desktop : MCP shadcn ajouté (renderer React = shadcn possible)', () => {
  assert.ok(resolveStackManifest('desktop', 'cursor').mcp.shadcn, 'desktop a le MCP shadcn');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/matrix-manifest.test.mjs`
Expected: FAIL — `Stack inconnue : vitrine` puis `desktop … mcp.shadcn undefined`.

- [ ] **Step 3: Implement**

Dans `scripts/lib/matrix.mjs` :

1. Dans `STACKS.desktop.mcp`, ajouter :

```js
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
```

2. Après le bloc `desktop: { … },`, ajouter la stack :

```js
  vitrine: {
    plugins: { 'claude-code': [], cursor: [], codex: [] },
    mcp: {
      // Astro a RETIRÉ son llms.txt (05/2026) : le MCP Docs officiel est la source à jour.
      'astro-docs': { command: 'npx', args: ['-y', 'mcp-remote', 'https://mcp.docs.astro.build/mcp'] },
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
    },
    skills: [
      { label: 'shadcn/ui (officiel : CLI, thèmes, registry)', repo: 'shadcn/ui' },
      { label: 'seo+geo (audit · schema · programmatic · contenu)', repo: 'boraoztunc/skills', skills: ['seo-audit', 'schema-markup', 'programmatic-seo', 'content-strategy'] },
      STITCH_SKILL,
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: [] },
    scripts: { typecheck: 'astro check', lint: 'biome check .' },
    rules: [
      { label: 'shadcn × Astro (installation officielle)', url: 'https://ui.shadcn.com/docs/installation/astro' },
      { label: 'Keystatic × Astro', url: 'https://keystatic.com/docs/installation-astro' },
      { label: 'Déployer Astro', url: 'https://docs.astro.build/en/guides/deploy/' },
    ],
    domains: {
      seo: { label: 'SEO technique', options: ['@astrojs/sitemap (officiel — exige `site` dans astro.config)', 'astro-seo (meta + Open Graph par page)', 'robots.txt dans public/ (pointe le sitemap + autorise GPTBot/PerplexityBot/ClaudeBot)'], when: 'TOUJOURS pour un site vitrine — dès le premier jalon.' },
      geo: { label: 'GEO — être cité par les IA (ChatGPT, Perplexity…)', options: ['public/llms.txt maintenu par l\'IA (aperçu sémantique du site, zéro dépendance)', 'JSON-LD schema.org par type de page (Organization, LocalBusiness, FAQPage, Article, BreadcrumbList)'], when: 'TOUJOURS. Google lit le JSON-LD ; ChatGPT/Perplexity/Claude lisent JSON-LD + llms.txt.' },
      forms: { label: 'Formulaire de contact', options: ['Web3Forms (gratuit, clé publique)', 'Formspree', 'Netlify Forms (si déployé sur Netlify)'], when: 'Site statique → service externe, jamais de backend maison.', secrets: ['PUBLIC_WEB3FORMS_KEY'] },
      analytics: { label: 'Analytics', mcp: 'analytics', options: ['Plausible (léger, sans cookie banner)', 'posthog-js'], when: 'Vitrine → léger et RGPD-friendly par défaut.' },
      images: { label: 'Images optimisées', options: ['astro:assets `<Image />` (built-in, défaut)'], when: 'Built-in par défaut — jamais de <img> brut sur une photo lourde.' },
      i18n: { label: 'Multilingue', options: ['routing i18n Astro (built-in)'], when: 'Seulement si le PRD demande plusieurs langues.' },
    },
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/matrix-manifest.test.mjs scripts/lib/matrix.test.mjs scripts/lib/matrix-domains.test.mjs scripts/lib/matrix-design.test.mjs`
Expected: PASS (si un test compte les stacks en dur, étendre sa liste à 4).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix-manifest.test.mjs
git commit -m "feat(vitrine): manifeste matrix (MCP astro-docs+shadcn, skills seo/shadcn, domaines SEO+GEO) + shadcn MCP sur desktop"
```

---

### Task 3: `stacks/vitrine/` — AGENTS.md + README + prompts

**Files:**
- Create: `stacks/vitrine/AGENTS.md`
- Create: `stacks/vitrine/README.md`
- Create: `stacks/vitrine/prompts-de-demarrage.md`
- Test: `scripts/lib/agents-templates.test.mjs` (étendre si liste en dur)

**Interfaces:**
- Produces : `stacks/vitrine/AGENTS.md` consommé par `resolveAssets` (copié en `.cursor/rules/stack-vitrine.mdc` ou `AGENTS-stack.md`).

- [ ] **Step 1: Write the failing test**

Vérifier `scripts/lib/agents-templates.test.mjs` : s'il liste les stacks, étendre à `vitrine` (échec attendu : fichier manquant). Sinon ajouter :

```js
test('stacks/vitrine : AGENTS.md + README + prompts présents et complets', () => {
  const a = read('stacks/vitrine/AGENTS.md');
  assert.match(a, /îlot/i);           // règle îlots React
  assert.match(a, /client:/);          // directives client:*
  assert.match(a, /llms\.txt/);        // GEO
  assert.match(a, /JSON-LD/);
  assert.match(a, /robots\.txt/);
  assert.match(a, /@astrojs\/sitemap/);
  assert.match(a, /Keystatic/);
  assert.ok(read('stacks/vitrine/README.md').length > 800);
  assert.ok(read('stacks/vitrine/prompts-de-demarrage.md').includes('shadcn'));
});
```

(`read` = même helper que le test existant ; l'adapter à son style.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/agents-templates.test.mjs`
Expected: FAIL — ENOENT `stacks/vitrine/AGENTS.md`.

- [ ] **Step 3: Write the files**

`stacks/vitrine/AGENTS.md` :

```markdown
# Règles projet pour l'IA — Site vitrine (Astro + shadcn/ui + Keystatic)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Renomme-le en `CLAUDE.md` si tu utilises uniquement Claude Code (les deux noms fonctionnent).

## Contexte du projet
Je construis un **site vitrine / blog** rapide et trouvable. Stack imposée :
- **Astro 5** — framework orienté contenu : HTML statique par défaut, zéro JS sauf demandé.
- **shadcn/ui** (Tailwind v4 + React) — les composants UI, montés en **îlots** uniquement où il faut de l'interactivité.
- **Keystatic** — CMS **git** : le contenu vit dans le dépôt, admin visuel sur `/keystatic`.

Je débute. Explique tes choix simplement et avance **une étape à la fois**.

## Règles Astro (îlots)
- **Statique d'abord** : tout est `.astro` sans JS. N'ajoute `client:load` / `client:visible` QUE sur ce qui est vraiment interactif (menu mobile, carrousel, formulaire).
- ⚠️ **Le contexte React n'est PAS partagé entre îlots.** Des composants shadcn qui interagissent (ex. `Dialog` + son bouton) doivent vivre dans **UN seul fichier `.tsx`**, importé une fois dans le `.astro`. Jamais éparpillés dans le `.astro`.
- Contenu structuré = **content collections** (`src/content/`), jamais des données en dur dans les pages.
- Images : **toujours** `astro:assets` (`<Image />`), jamais `<img>` brut sur une photo.
- En cas de doute sur une API Astro : interroge le **MCP astro-docs** (la doc à jour — Astro n'a plus de llms.txt).

## Règles shadcn/ui
- Installe via le CLI : `npx shadcn@latest add <composant>` — ne recopie jamais un composant à la main.
- Le **thème** vient du preset (`npx shadcn@latest init --preset <code> --template astro`) ou de tweakcn — modifie les **variables CSS**, pas les fichiers de composants.
- Style : classes Tailwind + tokens (`bg-primary`, `text-muted-foreground`…), pas de couleurs en dur.

## Règles Keystatic (CMS)
- Config dans `keystatic.config.ts` : une **collection par type de contenu** (pages, articles, témoignages…), storage `{ kind: 'local' }` (le contenu est committé).
- Admin : `http://localhost:4321/keystatic`. Montre à l'utilisateur comment éditer SANS toucher au code.
- Le contenu Keystatic alimente les content collections Astro — ne duplique jamais le contenu.

## SEO (non négociable — dès le premier jalon)
- `@astrojs/sitemap` installé + champ **`site`** renseigné dans `astro.config` (sinon pas de sitemap).
- `public/robots.txt` : pointe le sitemap, autorise tout par défaut **y compris les crawlers IA** (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`).
- Chaque page a : `<title>` unique (50-60 car.), meta description (150-160 car.), canonical, Open Graph (titre, description, image) — via `astro-seo` ou un composant `<SEO />` maison.
- Une seule `<h1>` par page ; hiérarchie `h2`/`h3` propre ; texte alternatif sur chaque image.

## GEO — être cité par ChatGPT / Perplexity / Claude (non négociable)
- Maintiens **`public/llms.txt`** : aperçu du site en Markdown (qui on est, offres, pages clés avec URLs). **Mets-le à jour à chaque nouvelle page.**
- **JSON-LD schema.org** par type de page : `Organization` ou `LocalBusiness` (accueil), `FAQPage` (FAQ), `Article` (blog), `BreadcrumbList` (navigation). Google lit le JSON-LD ; les IA lisent JSON-LD **et** llms.txt.
- Écris **dense et factuel** : chiffres, listes, réponses directes — les moteurs génératifs citent ce qui est précis.

## Sécurité & bonnes pratiques
- Site statique : **aucun secret** dans le code. Formulaire de contact → service externe (Web3Forms/Formspree), la clé publique va dans `.env` (préfixe `PUBLIC_`).
- Performance : vise Lighthouse ≥ 95 (peu de JS, `astro:assets`, polices locales).
- Commit Git après chaque étape qui fonctionne.
```

`stacks/vitrine/README.md` :

```markdown
# Stack Site vitrine — Astro + shadcn/ui + Keystatic

**Pour quoi ?** Un site qui **présente** (entreprise, portfolio, resto, assos) ou un **blog** : contenu, pages, SEO. Pas de comptes utilisateurs, pas de données temps réel — pour ça, prends la stack SaaS.

## Les briques
| Brique | Rôle | Pourquoi celle-là |
|---|---|---|
| **Astro 5** | le framework | HTML statique par défaut → ultra rapide, imbattable en SEO |
| **shadcn/ui** | les composants (React en îlots) | beaux composants copiés dans TON code, thème par preset |
| **Tailwind v4** | le style | utilitaire, marche main dans la main avec shadcn |
| **Keystatic** | le CMS | admin visuel sur `/keystatic`, contenu **dans le git** (gratuit, zéro serveur) |

## Ce que cette stack optimise : SEO **et** GEO
- **SEO** (Google) : sitemap auto, robots.txt, meta/OG par page, JSON-LD, perfs au max.
- **GEO** (ChatGPT, Perplexity…) : `llms.txt` du site + données structurées → ton site peut être **cité par les IA**.

## Ordre de construction
1. **Setup** : `npx shadcn@latest init --preset <ton-code> --template astro` (crée l'app Astro + shadcn avec TON thème) — le preset se choisit sur [ui.shadcn.com/create](https://ui.shadcn.com/create).
2. **Keystatic** : `npx astro add react markdoc` + `@keystatic/core @keystatic/astro` → admin `/keystatic`.
3. **Pages** depuis la maquette (accueil, offres, contact…), contenu via collections.
4. **SEO/GEO** : sitemap + robots.txt + `<SEO />` + JSON-LD + `public/llms.txt`.
5. **Déploiement** : pousse sur GitHub → **Cloudflare Pages** (gratuit, bande passante illimitée) ou Netlify/Vercel.

## Lancer
```bash
npm run dev        # http://localhost:4321
# admin CMS : http://localhost:4321/keystatic
```

## FAQ débutant
- **C'est quoi un îlot ?** Ta page est du HTML pur ; un îlot = un composant React chargé UNIQUEMENT là où il faut de l'interactivité. C'est pour ça que c'est rapide.
- **Je veux changer les couleurs.** Refais un preset sur ui.shadcn.com/create ou règle les variables CSS sur tweakcn.com — jamais dans les fichiers de composants.
- **Le client peut éditer le contenu ?** Oui : `/keystatic` (en local) ; en ligne, passe le storage en mode `github`.
```

`stacks/vitrine/prompts-de-demarrage.md` :

```markdown
# Prompts de démarrage — Site vitrine (Astro + shadcn + Keystatic)

## 1. Setup (premier prompt)
> Crée le projet : `npx shadcn@latest init --preset <MON_CODE> --template astro` (mon preset vient de ui.shadcn.com/create). Ajoute ensuite Keystatic (`npx astro add react markdoc`, puis `@keystatic/core @keystatic/astro`) avec storage local. Vérifie que `npm run dev` marche et que `/keystatic` s'ouvre. Ne code rien d'autre.

## 2. Une page depuis la maquette
> Réalise la page « <nom> » de `maquette/<ecran>.html` en `.astro` : structure statique, composants shadcn pour l'UI, et UNIQUEMENT le <composant interactif> en îlot (`client:visible`, un seul .tsx). Ajoute le `<SEO />` (title, description, OG) et le JSON-LD adapté.

## 3. Contenu éditable (CMS)
> Transforme la section « <nom> » en collection Keystatic (`keystatic.config.ts`) branchée sur une content collection Astro. Montre-moi comment l'éditer sur /keystatic sans toucher au code.

## 4. Audit SEO/GEO
> Passe le site au crible SEO/GEO : sitemap OK, robots.txt (crawlers IA autorisés), meta/OG/canonical par page, JSON-LD par type, `public/llms.txt` à jour, images en astro:assets, Lighthouse ≥ 95. Liste ce qui manque puis corrige.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/agents-templates.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stacks/vitrine scripts/lib/agents-templates.test.mjs
git commit -m "feat(vitrine): stacks/vitrine — AGENTS.md (îlots+SEO+GEO), README débutant, prompts"
```

---

### Task 4: Templates par stack (env/ci/gitignore/run/examples/environment) + règles Cursor + skill stack-vitrine

**Files:**
- Create: `templates/env/vitrine.env.example`, `templates/ci/vitrine.yml`, `templates/gitignore/vitrine.gitignore`, `templates/run/vitrine.md`, `templates/examples/vitrine.md`, `templates/cursor/environment/vitrine.json`
- Create: `templates/cursor/rules/vitrine/astro.mdc`, `templates/cursor/rules/vitrine/shadcn-islands.mdc`, `templates/cursor/rules/vitrine/seo-geo.mdc`, `templates/cursor/rules/vitrine/typescript.mdc`
- Create: `.claude/skills/stack-vitrine/SKILL.md`
- Modify: `scripts/lib/validate.mjs:18` (boucle stacks), `scripts/lib/cursor-extras.test.mjs:13`, `scripts/lib/roadmap-run.test.mjs:13`, `scripts/lib/matrix-manifest.test.mjs` (déjà fait T2), `scripts/lib/validate-extras` liste dans `validate-commands.mjs` (ajouter les fichiers vitrine)
- Test: les tests étendus ci-dessus + `scripts/lib/cursor-rules.test.mjs` (si liste en dur, étendre)

**Interfaces:**
- Consumes : `resolveAssets('vitrine', …)` copie `stacks/vitrine/AGENTS.md` ; `writeStackEnvironment` lit `templates/cursor/environment/vitrine.json`, `templates/ci/vitrine.yml`… (mêmes chemins que les autres stacks — le code est générique par stack, vérifier `environment.mjs`).
- Produces : un scaffold `--stack vitrine` complet sans `failed`.

- [ ] **Step 1: Write the failing tests**

Étendre les boucles en dur :
- `scripts/lib/validate.mjs:18` → `['saas', 'mobile', 'desktop', 'vitrine']`
- `scripts/lib/cursor-extras.test.mjs:13` → idem
- `scripts/lib/roadmap-run.test.mjs:13` → ajouter `['vitrine', 'localhost']`
- `validateExtras` (dans `scripts/lib/validate-commands.mjs`) : ajouter `templates/env/vitrine.env.example`, `templates/ci/vitrine.yml`, `templates/gitignore/vitrine.gitignore`, `templates/examples/vitrine.md` aux listes existantes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — fichiers vitrine manquants.

- [ ] **Step 3: Write the template files**

`templates/env/vitrine.env.example` :

```
# Site (utilisé par le sitemap et les canonical)
SITE_URL=http://localhost:4321

# Formulaire de contact (Web3Forms — clé PUBLIQUE, ok côté client)
PUBLIC_WEB3FORMS_KEY=

# ⚠️ Copie ce fichier en .env et remplis les valeurs. Ne commit JAMAIS ton vrai .env.
```

`templates/ci/vitrine.yml` :

```yaml
# CI — Site vitrine (Astro + shadcn/ui + Keystatic)
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run typecheck --if-present
      - run: npm test --if-present
      - run: npm run build --if-present
```

`templates/gitignore/vitrine.gitignore` :

```
node_modules/
.env
.env.*
!.env.example
dist/
.astro/
docs/memory/.edit-queue.log
.DS_Store
```

`templates/run/vitrine.md` :

```markdown
# Lancer le site — Vitrine (Astro + shadcn + Keystatic)

Un seul terminal :
1. `npm run dev`

Ouvre **http://localhost:4321** — et l'admin CMS sur **http://localhost:4321/keystatic**.

**Ce que tu dois voir :** la page d'accueil se charge sur localhost, et `/keystatic` affiche l'admin du contenu.
```

`templates/examples/vitrine.md` :

````markdown
# Exemple de référence — section « Témoignages » (Astro + Keystatic + shadcn)

> Patron à imiter avec `/new-feature`. Montre : collection CMS → content collection → page statique + îlot unique.

## CMS — `keystatic.config.ts`
```ts
import { config, fields, collection } from '@keystatic/core';
export default config({
  storage: { kind: 'local' },
  collections: {
    temoignages: collection({
      label: 'Témoignages', slugField: 'auteur', path: 'src/content/temoignages/*',
      schema: { auteur: fields.slug({ name: { label: 'Auteur' } }), citation: fields.text({ label: 'Citation', multiline: true }) },
    }),
  },
});
```

## Page — `src/pages/index.astro` (statique, zéro JS)
```astro
---
import { getCollection } from 'astro:content';
import { Card, CardContent } from '@/components/ui/card';
const temoignages = await getCollection('temoignages');
---
{temoignages.map((t) => (
  <Card><CardContent><p>« {t.data.citation} »</p><p class="text-muted-foreground">— {t.data.auteur}</p></CardContent></Card>
))}
```

## Îlot interactif — `src/components/carousel-temoignages.tsx` (UN seul .tsx)
```tsx
// Tous les composants shadcn interactifs liés vivent ICI (le contexte React n'existe qu'à l'intérieur d'un îlot).
'use client';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
export default function CarouselTemoignages({ items }: { items: { auteur: string; citation: string }[] }) {
  return (<Carousel><CarouselContent>{items.map((t) => <CarouselItem key={t.auteur}>{t.citation}</CarouselItem>)}</CarouselContent></Carousel>);
}
```
Dans la page : `<CarouselTemoignages items={…} client:visible />`.

Points clés : contenu éditable sans code (Keystatic), page statique par défaut, interactivité isolée dans UN îlot, composants shadcn jamais modifiés à la main.
````

`templates/cursor/environment/vitrine.json` :

```json
{
  "install": "npm install",
  "terminals": [
    { "name": "Web", "command": "npm run dev" }
  ]
}
```

`templates/cursor/rules/vitrine/astro.mdc` :

```markdown
---
description: Astro 5 (îlots, content collections, assets)
globs: src/**/*.astro,src/content/**,astro.config.*
alwaysApply: false
---

- Statique d'abord : `client:load`/`client:visible` UNIQUEMENT sur l'interactif réel.
- Contenu structuré = content collections (`src/content/`), jamais en dur dans les pages.
- Images : `astro:assets` `<Image />`, jamais `<img>` brut sur une photo.
- API incertaine → interroge le MCP `astro-docs` (Astro n'a plus de llms.txt).
```

`templates/cursor/rules/vitrine/shadcn-islands.mdc` :

```markdown
---
description: shadcn/ui en îlots React (contexte non partagé)
globs: src/components/**/*.tsx
alwaysApply: false
---

- ⚠️ Le contexte React n'est PAS partagé entre îlots : composants shadcn interactifs liés = UN seul fichier .tsx, importé une fois avec `client:*`.
- Composants via `npx shadcn@latest add <c>` — jamais recopiés/modifiés à la main.
- Thème = variables CSS du preset (ui.shadcn.com/create ou tweakcn) ; classes tokens (`bg-primary`), pas de couleur en dur.
```

`templates/cursor/rules/vitrine/seo-geo.mdc` :

```markdown
---
description: SEO + GEO (sitemap, robots, JSON-LD, llms.txt)
globs: src/pages/**,public/**
alwaysApply: false
---

- Chaque page : title unique, meta description, canonical, Open Graph. Une seule h1.
- `@astrojs/sitemap` + champ `site` dans astro.config ; `public/robots.txt` pointe le sitemap et AUTORISE GPTBot/PerplexityBot/ClaudeBot.
- JSON-LD par type de page (Organization/LocalBusiness, FAQPage, Article, BreadcrumbList).
- `public/llms.txt` = aperçu du site pour les IA — à mettre à jour à CHAQUE nouvelle page.
```

`templates/cursor/rules/vitrine/typescript.mdc` : copier `templates/cursor/rules/saas/typescript.mdc` tel quel.

`.claude/skills/stack-vitrine/SKILL.md` :

```markdown
---
name: stack-vitrine
description: Use when building a showcase website / blog with the vibecoding stack Astro + shadcn/ui + Keystatic. Triggers on "site vitrine", "portfolio", "blog", "landing", "Astro site", "site pour mon entreprise/restaurant/assos", or any content-first website for beginners in this course. Loads the correct workflow, official rules, SEO/GEO requirements, and known pitfalls.
---

# Stack Vitrine — Astro + shadcn/ui + Keystatic (SEO/GEO first)

Aide un·e débutant·e à construire un site vitrine/blog. Réponds en français, simplement, **une étape à la toi**, et fais valider chaque plan avant de coder.

## Ordre de construction
1. **Setup** — `npx shadcn@latest init --preset <code> --template astro` (le preset vient de ui.shadcn.com/create), puis Keystatic (`npx astro add react markdoc` + `@keystatic/core @keystatic/astro`). `npm run dev` + `/keystatic` OK. Rien d'autre.
2. **Pages** depuis la maquette (content collections pour le contenu).
3. **CMS** — collections Keystatic par type de contenu.
4. **SEO/GEO** — sitemap + robots.txt (IA autorisées) + `<SEO />`/JSON-LD + `public/llms.txt`.
5. **Déploiement** — GitHub → Cloudflare Pages (ou Netlify/Vercel).

## Pièges connus
- **Îlots** : le contexte React n'est pas partagé — composants shadcn interactifs liés dans UN .tsx.
- Sitemap silencieusement absent si `site` manque dans `astro.config`.
- Astro n'a **plus** de llms.txt officiel → MCP `astro-docs` pour la doc.
- Keystatic exige `@astrojs/react` + `@astrojs/markdoc`.

## Références n°1
- shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
- Keystatic × Astro : https://keystatic.com/docs/installation-astro
```

Corriger la coquille « une étape à la toi » → « une étape à la fois » avant commit.

- [ ] **Step 4: Run full suite**

Run: `node --test`
Expected: PASS — si `cursor-rules.test.mjs`/`checks.test.mjs`/`environment.test.mjs` listent les stacks en dur, les étendre à `vitrine` (même pattern que les autres).

- [ ] **Step 5: Vérification réelle (scaffold vitrine)**

Run: `node scripts/setup.mjs --source . --stack vitrine --assistant cursor --project /tmp/vs-vitrine-check --yes --no-skills --no-learning && ls /tmp/vs-vitrine-check/.cursor/rules && rm -rf /tmp/vs-vitrine-check`
Expected: exit 0, `stack-vitrine.mdc` + `vitrine/` rules présents, rapport sans `failed`.

- [ ] **Step 6: Commit**

```bash
git add templates .claude/skills/stack-vitrine scripts/lib
git commit -m "feat(vitrine): templates env/ci/run/examples + règles Cursor (astro, îlots shadcn, seo-geo) + skill stack-vitrine"
```

---

### Task 5: Presets shadcn dans le flow design (`/new-project`) + NativeWind mobile

**Files:**
- Modify: `templates/commands/new-project.md` (Phase 5 §2 + Phase 7 §1)
- Modify: `templates/commands/edit-design.md` (mention preset)
- Test: `scripts/lib/validate-commands.test.mjs` (le validateur doit rester vert) + ajout d'un marqueur

**Interfaces:**
- Produces : le runbook demande le **preset** et l'applique au scaffold selon la stack.

- [ ] **Step 1: Write the failing test**

Dans `scripts/lib/validate-commands.mjs`, tableau `DEPTH`, ajouter `'ui.shadcn.com/create'` (le validateur exigera la mention du preset). Lancer `node --test scripts/lib/validate-commands.test.mjs` → FAIL (marqueur absent du runbook).

- [ ] **Step 2: Implement — new-project.md**

Dans **Phase 5**, après la ligne `> **Affiner la palette** … tweakcn …`, ajouter :

```markdown
> **Preset shadcn (stacks web : saas, desktop, vitrine)** : propose à l'utilisateur de composer son thème sur **[ui.shadcn.com/create](https://ui.shadcn.com/create)** (couleurs, rayons, typo, en visuel) et de te donner son **code de preset**. Note-le pour la Phase 7 : le scaffold l'appliquera (`npx shadcn@latest init --preset <code>`). S'il n'en a pas → défaut shadcn, réglable plus tard sur tweakcn. **Mobile : jamais shadcn** (c'est du DOM web) → NativeWind + les patterns RN.
> Si tu génères les wireframes toi-même (cas c) sur une stack web : fais-les **en composants shadcn avec ce preset** — la maquette EST déjà le design final.
```

Dans **Phase 6 § 1** (sélection des domaines), ajouter après la première phrase :

```markdown
   **Stack vitrine** : les domaines `seo`, `geo` et `images` sont **toujours sélectionnés** (raison d'être de la stack), quel que soit le PRD — les triggers ne servent que pour `forms`, `analytics`, `i18n`…
```

Dans **Phase 7 § 1**, remplacer la ligne `1. Scaffold la stack choisie (…)` par :

```markdown
1. Scaffold la stack choisie, **avec le preset shadcn** noté en Phase 5 :
   - **vitrine** : `npx shadcn@latest init --preset <code> --template astro` (crée l'app Astro complète avec le thème), puis Keystatic (`npx astro add react markdoc` + `@keystatic/core @keystatic/astro`).
   - **saas** : `npm create convex@latest` (TanStack Start + Convex), puis **dans le projet** : `npx shadcn@latest init --preset <code>`.
   - **desktop** : `create-electron-app` (vite+react), puis **dans le renderer** : `npx shadcn@latest init --preset <code>`.
   - **mobile** : `create-expo-app` + **NativeWind** (pas de shadcn en React Native).
   - Sans preset → `init` sans `--preset` (défaut).
```

Dans `templates/commands/edit-design.md`, après la mention tweakcn, ajouter :

```markdown
   - **Refaire le thème entier** (stack web) : nouveau preset sur [ui.shadcn.com/create](https://ui.shadcn.com/create) → ré-applique les variables CSS du preset dans `globals.css` (ne touche pas aux fichiers de composants).
```

- [ ] **Step 3: Run tests**

Run: `node --test scripts/lib/validate-commands.test.mjs scripts/lib/validate-new-feature.test.mjs scripts/lib/validate-edit-design.test.mjs`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add templates/commands/new-project.md templates/commands/edit-design.md scripts/lib/validate-commands.mjs
git commit -m "feat(design): preset shadcn (ui.shadcn.com/create) dans new-project/edit-design + NativeWind mobile"
```

---

### Task 6: Câblage périphérique (triggers, doctor, smoke, rot-check, glossaire, ai-context)

**Files:**
- Modify: `scripts/lib/domains.mjs` (DOMAIN_TRIGGERS : + `forms`, `i18n`)
- Modify: `templates/commands/doctor.md:14` (MCP vitrine)
- Modify: `scripts/smoke-e2e.mjs` (2e scaffold : vitrine)
- Modify: `.github/workflows/rot-check.yml` (URLs vitrine)
- Modify: `guides/glossaire.md` (entrées SEO + GEO)
- Create: `ai-context/astro/README.md`
- Test: `scripts/lib/select-domains.test.mjs`

**Interfaces:**
- Produces : `selectDomains(prd, DOMAIN_TRIGGERS)` détecte `forms`/`i18n` ; doctor vérifie les MCP vitrine ; smoke CI couvre vitrine sur 3 OS.

- [ ] **Step 1: Write the failing test**

Dans `scripts/lib/select-domains.test.mjs`, ajouter :

```js
test('triggers vitrine : formulaire de contact + multilingue détectés', () => {
  const picked = selectDomains('Un site vitrine avec un formulaire de contact, disponible en français et en anglais.', DOMAIN_TRIGGERS);
  assert.ok(picked.includes('forms'), 'forms détecté');
  assert.ok(picked.includes('i18n'), 'i18n détecté');
});
```

(Importer `DOMAIN_TRIGGERS` comme les tests existants du fichier.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/select-domains.test.mjs`
Expected: FAIL — clés `forms`/`i18n` absentes des triggers.

- [ ] **Step 3: Implement**

`scripts/lib/domains.mjs`, dans `DOMAIN_TRIGGERS`, ajouter :

```js
  forms:            /formulaire|nous contacter|prise de contact|demande de devis|devis en ligne/i,
  i18n:             /multilingue|plusieurs langues|en anglais|traduction|version anglaise|bilingue/i,
```

`templates/commands/doctor.md` ligne 14 : `… desktop : chrome-devtools ; vitrine : astro-docs, shadcn).`

`scripts/smoke-e2e.mjs` : après le scaffold saas (ligne 28), ajouter un second scaffold `--stack vitrine --assistant cursor` dans un dossier frère + vérifier `A-FAIRE.md` et `.cursor/rules/stack-vitrine.mdc` existent (mêmes helpers `check`).

`.github/workflows/rot-check.yml` : dans la boucle des URLs docs (lignes 29-33), ajouter `https://ui.shadcn.com/docs/installation/astro` et `https://keystatic.com/docs/installation-astro` ; dans la boucle MCP (lignes 42-44), ajouter `https://mcp.docs.astro.build/mcp`.

`guides/glossaire.md`, à l'endroit alphabétique pertinent :

```markdown
- <a id="seo"></a>**SEO (Search Engine Optimization)** — Faire en sorte que **Google** trouve et classe bien ton site : titres, descriptions, sitemap, vitesse. *La stack vitrine le fait par défaut.*
- <a id="geo"></a>**GEO (Generative Engine Optimization)** — Le SEO des **IA** : faire en sorte que ChatGPT, Perplexity ou Claude **citent ton site** dans leurs réponses. Outils : données structurées (JSON-LD) + un fichier `llms.txt` qui résume ton site pour les IA. *La stack vitrine le fait par défaut.*
```

`ai-context/astro/README.md` :

```markdown
# Astro — contexte IA

Astro a **retiré** son `llms.txt` officiel (mai 2026). La source à jour est le **MCP Docs Astro** (déjà configuré dans le projet) :

`npx -y mcp-remote https://mcp.docs.astro.build/mcp`

L'IA doit interroger ce MCP pour toute API Astro incertaine — ne jamais deviner. Références fixes :
- shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
- Keystatic × Astro : https://keystatic.com/docs/installation-astro
```

- [ ] **Step 4: Run full suite**

Run: `node --test` puis `node scripts/smoke-e2e.mjs`
Expected: PASS + smoke vert (saas + vitrine).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/domains.mjs scripts/lib/select-domains.test.mjs templates/commands/doctor.md scripts/smoke-e2e.mjs .github/workflows/rot-check.yml guides/glossaire.md ai-context/astro
git commit -m "feat(vitrine): câblage périphérique — triggers forms/i18n, doctor, smoke vitrine, rot-check, glossaire SEO/GEO, ai-context astro"
```

---

### Task 7: README (4 stacks) + bump 0.4.0 + publish

**Files:**
- Modify: `README.md` (tableau stacks, features, section « Les 3 stacks » → « Les 4 stacks », MCP par stack dans « Après l'install »)
- Modify: `package.json` (`0.4.0`)
- Modify: `scripts/lib/package-publish.test.mjs` (version ≥ 0.4.0)
- Test: suite complète

- [ ] **Step 1: Failing test**

`package-publish.test.mjs` : remplacer le test version par `min >= 4` (attendu ≥ 0.4.0). FAIL avec 0.3.3.

- [ ] **Step 2: Implement**

- `package.json` → `"version": "0.4.0"`.
- README — les « 3 stacks » sont en dur à 3 endroits précis : **l.25** (intro « 3 stacks expliquées » → « 4 stacks expliquées »), **l.38** (sommaire `[Les 3 stacks](#-les-3-stacks)` → `Les 4 stacks` + ancre), **l.214** (`## 🧱 Les 3 stacks` → `## 🧱 Les 4 stacks`) + ligne vitrine dans le tableau de cette section (`**Vitrine** | Astro + shadcn/ui + Keystatic | site vitrine, portfolio, blog — SEO + GEO (cité par les IA)`). Tableau MCP de « Après l'install » : ligne `**Vitrine** | Astro Docs · shadcn` ; geste 2 : vitrine = aucun plugin de stack. Feature table : ajouter « 🔎 **SEO + GEO** | la stack vitrine sort optimisée Google **et** IA (sitemap, JSON-LD, llms.txt du site, robots IA-friendly) ».
- `guides/glossaire.md` l.71 : « le kit propose 3 stacks » → « 4 stacks ».

- [ ] **Step 3: Run full suite + scaffold réel**

Run: `node --test` puis le smoke scaffold vitrine (Task 4 Step 5).
Expected: tout vert.

- [ ] **Step 4: Commit + publish**

```bash
git add README.md package.json scripts/lib/package-publish.test.mjs
git commit -m "feat(vitrine): README 4 stacks + bump 0.4.0"
git push origin main
npm publish   # token bypass-2FA ou terminal user (voir PUBLISH.md)
```

Post-publish : `npx -y create-vibecoding-kit@latest demo --stack vitrine --assistant cursor --yes --no-skills` dans un dossier vide → projet vitrine scaffoldé.

---

## Hors périmètre (plus tard si besoin)
- Mode Keystatic `github` (édition en ligne) — doc à ajouter quand un vrai site est déployé.
- Intégration `astro-llms-txt` auto-générée (le manuel `public/llms.txt` suffit et reste zéro-dep).
- **Landing page** (artifact, hors dépôt) : carte « Trois stacks » + cas d'usage → ajouter la Vitrine après le publish (fait à la main, pas dans ce plan).

## Self-Review
- **Couverture** : stack vitrine complète (T1-T4), SEO+GEO câblés en règles + domaines + skills + triggers + toujours-on Phase 6 (T2/T3/T4/T5/T6), presets shadcn toutes stacks web + NativeWind mobile (T5), desktop shadcn MCP (T2), périphérie oubliable couverte — doctor/smoke/rot-check/glossaire/ai-context (T6), doc + version (T7). ✅
- **Audit anti-trou fait** : `selectDomains` (triggers manquants) ✅ T6 ; doctor ligne 14 ✅ T6 ; smoke-e2e saas-only ✅ T6 ; rot-check URLs ✅ T6 ; glossaire sans SEO/GEO ✅ T6 ; « 3 stacks » en dur (README ×3 + glossaire l.71) ✅ T7 ; ai-context/astro ✅ T6 ; environment.mjs/checks.mjs = génériques (grep vide, rien à faire).
- **Placeholders** : aucun — chaque fichier a son contenu réel. `<code>`/`<MON_CODE>` sont des placeholders VOULUS côté utilisateur (son preset personnel).
- **Cohérence** : clé `vitrine` identique partout ; `astro check` cohérent entre matrix.scripts et checks ; chemins templates identiques au pattern des 3 stacks ; tests étendus là où les stacks sont énumérées (validate.mjs, cursor-extras, roadmap-run, matrix-manifest, validateExtras).
- **Piège Windows** : aucun nouveau spawn/symlink ; fichiers texte uniquement.

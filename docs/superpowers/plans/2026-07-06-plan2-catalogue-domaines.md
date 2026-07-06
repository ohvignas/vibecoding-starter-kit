# Plan 2 — Catalogue de domaines (capacités métier) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `setup.mjs` écrit `docs/DOMAINS.md` par stack — le catalogue de capacités métier (paiement, email, storage, analytics, erreurs, push, caméra, auto-update, licence…) que l'IA lit pour choisir les features selon le PRD, adossé à un champ `domains` dans `STACKS`, un catalogue partagé `SHARED_DOMAINS` (MCP cross-stack) et une table `DOMAIN_TRIGGERS` (mot-clé PRD → domaine).

**Architecture :** Données pures : `domains` par stack (matrix.mjs) + `SHARED_DOMAINS`/`DOMAIN_TRIGGERS` (nouveau domains.mjs). Un rendu pur `renderDomains(...)` → markdown. Écrit par `environment.mjs` (comme SETUP-AI.md). La **sélection** effective par le PRD est faite plus tard par `/new-project` (Plan 3) ; ici on ne produit que le catalogue de référence + les triggers prêts à l'emploi. Aucun chargement d'office.

**Tech Stack :** Node.js ESM, `node --test` (zéro dépendance externe).

## Global Constraints

- Node ≥ 20.12 ; ESM ; **zéro dépendance externe** (tests `node:test` + `node:assert/strict`).
- Le binaire `node` du shell peut être un wrapper nvm cassé (`_nvm_lazy_load`/`FUNCNEST`). En cas d'échec, utiliser `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` — y compris pour la suite complète.
- Style : fichiers courts, français dans messages/commentaires, identifiers anglais. Suivre `scripts/lib/*.mjs`.
- Toutes les valeurs (paquets, commandes MCP, secrets) sont **vérifiées** (recherche juillet 2026). Ne pas inventer de paquet.
- **MANDATORY avant chaque commit** : lancer la suite complète `node --test` et coller la fin (`# tests N / # pass N / # fail 0`) dans le rapport ; ne committer que si vert.
- Interfaces Plan 1 (déjà en place) : `resolveStackManifest(stack, assistant)` renvoie `{plugins, mcp, skills, checks, scripts, rules}` ; `writeStackEnvironment({projectDir, source, stack, assistant})` dans `environment.mjs` ; `renderProjectAgentsMd(...)` dans `templates.mjs`.

---

### Task 1 : `SHARED_DOMAINS` + `DOMAIN_TRIGGERS` (domains.mjs)

**Files:**
- Create: `scripts/lib/domains.mjs`
- Test: `scripts/lib/domains.test.mjs`

**Interfaces:**
- Produces: `export const SHARED_DOMAINS` (domaine → `{label, mcp:{name,install}, note}`) ; `export const DOMAIN_TRIGGERS` (domaine → RegExp).
- Consumes: rien.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/domains.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHARED_DOMAINS, DOMAIN_TRIGGERS } from './domains.mjs';

test('SHARED_DOMAINS couvre les 7 MCP partagés avec une commande d’install', () => {
  for (const k of ['payment', 'email', 'analytics', 'error-tracking', 'docs', 'repo', 'e2e']) {
    assert.ok(SHARED_DOMAINS[k], `domaine ${k}`);
    assert.ok(SHARED_DOMAINS[k].mcp.install.length > 0, `install ${k}`);
  }
  assert.match(SHARED_DOMAINS.payment.mcp.install, /mcp\.stripe\.com/);
  assert.match(SHARED_DOMAINS['error-tracking'].mcp.install, /mcp\.sentry\.dev/);
});

test('DOMAIN_TRIGGERS matche les mots-clés FR attendus', () => {
  assert.match('je veux un abonnement premium', DOMAIN_TRIGGERS.payment);
  assert.match('envoyer un email de confirmation', DOMAIN_TRIGGERS.email);
  assert.match('prendre une photo', DOMAIN_TRIGGERS.camera);
  assert.match('une carte avec la localisation', DOMAIN_TRIGGERS.maps);
  assert.match('mise à jour automatique', DOMAIN_TRIGGERS['auto-update']);
  assert.doesNotMatch('juste une page de contact', DOMAIN_TRIGGERS.payment);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/domains.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/domains.mjs` (partie données)**

```js
// Catalogue de capacités métier partagées entre stacks + déclencheurs PRD.
// Valeurs vérifiées (juillet 2026). Les paquets d'implémentation par stack sont dans matrix.mjs (STACKS[stack].domains).

export const SHARED_DOMAINS = {
  payment:          { label: 'Paiement', mcp: { name: 'stripe', install: 'claude mcp add --transport http stripe https://mcp.stripe.com' }, note: 'Stripe (OAuth). Compte requis.' },
  email:            { label: 'Email transactionnel', mcp: { name: 'resend', install: 'claude mcp add --transport http resend https://mcp.resend.com' }, note: 'Resend. Tier gratuit.' },
  analytics:        { label: 'Analytics produit', mcp: { name: 'posthog', install: 'claude mcp add --transport http posthog https://mcp.posthog.com/mcp' }, note: 'PostHog.' },
  'error-tracking': { label: 'Suivi d’erreurs', mcp: { name: 'sentry', install: 'claude mcp add --transport http sentry https://mcp.sentry.dev/mcp' }, note: 'Sentry (OAuth).' },
  docs:             { label: 'Docs à jour', mcp: { name: 'context7', install: 'claude mcp add context7 -- npx -y @upstash/context7-mcp' }, note: 'Context7.' },
  repo:             { label: 'Repo / PR', mcp: { name: 'github', install: 'voir github/github-mcp-server (PAT) ou endpoint Copilot' }, note: 'GitHub.' },
  e2e:              { label: 'Tests E2E', mcp: { name: 'playwright', install: 'npx @playwright/mcp@latest' }, note: 'Playwright (web). Electron : chrome-devtools-mcp.' },
};

export const DOMAIN_TRIGGERS = {
  payment:          /abonnement|premium|forfait|paywall|payer|paiement|checkout|réservation payante|acheter|panier|commande/i,
  email:            /e-?mail\b|\bmail\b|magic link|newsletter|mot de passe oublié|réinitialis/i,
  storage:          /upload|télévers|fichier|image|avatar|photo de profil|pièce jointe|pdf|document/i,
  analytics:        /statistiques|analytics|suivi d’usage|funnel|entonnoir|feature flag|a\/b/i,
  'error-tracking': /erreur|crash|monitoring|ça plante|exception|bug en prod/i,
  jobs:             /cron|tous les (jours|soirs)|chaque (jour|soir|nuit)|rappel automatique|relance|arrière-plan|planifi|file d’attente/i,
  search:           /recherche|rechercher|filtrer|autocompl|catalogue/i,
  push:             /notification|push|alerte/i,
  camera:           /photo|caméra|appareil photo|scanner/i,
  maps:             /carte|\bmap\b|localisation|gps|à proximité|adresse/i,
  'auto-update':    /mise à jour|auto-?update|nouvelle version/i,
  licensing:        /licence|activation|clé de licence|débloquer l’app|période d’essai|trial/i,
  persistence:      /base (de données )?locale|offline|hors-?ligne|persistance|réglages|sauvegarde locale/i,
};
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/domains.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Suite complète + commit**

Run: `node --test` (attendu : vert, coller la fin dans le rapport).
```bash
git add scripts/lib/domains.mjs scripts/lib/domains.test.mjs
git commit -m "feat(domains): catalogue MCP partagé + déclencheurs PRD"
```

---

### Task 2 : Champ `domains` dans `STACKS` + `resolveStackManifest` (matrix.mjs)

**Files:**
- Modify: `scripts/lib/matrix.mjs` (ajouter `domains:` à chacune des 3 entrées de `STACKS` ; ajouter `domains: s.domains` au retour de `resolveStackManifest`)
- Test: `scripts/lib/matrix-domains.test.mjs` (nouveau)

**Interfaces:**
- Consumes: `STACKS`, `resolveStackManifest` (Task 1 de Plan 1, déjà en place).
- Produces: `STACKS[stack].domains` (domaine → `{label, options:[string], mcp?:sharedKey, secrets?:[string], when?:string}`) ; `resolveStackManifest(...).domains`.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/matrix-domains.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest } from './matrix.mjs';

test('saas.domains : paiement 4 options + email + search built-in', () => {
  const d = STACKS.saas.domains;
  assert.ok(d.payment.options.some((o) => o.includes('@better-auth/stripe')));
  assert.equal(d.payment.mcp, 'payment');
  assert.ok(d.email.options.some((o) => o.includes('@convex-dev/resend')));
  assert.ok(d.search.options.some((o) => /searchIndex/i.test(o)));
});

test('mobile.domains : règle IAP vs Stripe + push + camera', () => {
  const d = STACKS.mobile.domains;
  assert.ok(d.payment.options.some((o) => /RevenueCat|react-native-purchases/.test(o)));
  assert.ok(d.push.options.some((o) => o.includes('expo-notifications')));
  assert.ok(d.camera);
});

test('desktop.domains : paiement backend + auto-update + persistence', () => {
  const d = STACKS.desktop.domains;
  assert.match(d.payment.when, /backend/i);
  assert.ok(d['auto-update'].options.some((o) => o.includes('update-electron-app')));
  assert.ok(d.persistence.options.some((o) => o.includes('better-sqlite3')));
});

test('resolveStackManifest expose domains', () => {
  const m = resolveStackManifest('saas', 'claude-code');
  assert.ok(m.domains.payment, 'domains dans le manifeste résolu');
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/matrix-domains.test.mjs`
Expected: FAIL (`domains` absent).

- [ ] **Step 3 : Ajouter `domains:` à `STACKS.saas`** — dans `scripts/lib/matrix.mjs`, à l'intérieur de l'objet `saas` (après la propriété `rules: [...]`, avant la `}` fermante de `saas`), insérer :

```js
    domains: {
      payment: { label: 'Paiement / abonnements', mcp: 'payment', secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], options: ['@better-auth/stripe (défaut, couplé auth)', '@convex-dev/stripe (Convex-natif)', 'Polar : @polar-sh/better-auth ou @convex-dev/polar (marchand de référence, gère la TVA)', 'Autumn : @useautumn/convex (facturation à l’usage)'], when: 'Secrets webhook → env Convex. TVA gérée pour toi → Polar. À l’usage/crédits → Autumn.' },
      email: { label: 'Email transactionnel', mcp: 'email', secrets: ['RESEND_API_KEY'], options: ['@convex-dev/resend + @react-email/components'], when: 'Composant officiel Convex×Resend. Brancher ici les mails Better Auth (reset, vérification, magic link).' },
      storage: { label: 'Upload / stockage de fichiers', options: ['Convex File Storage (built-in, défaut)', 'UploadThing (UI d’upload prête)', '@convex-dev/r2 (Cloudflare R2)'], when: 'Built-in par défaut ; externe seulement si UI drag-drop ou gros volume/coût.' },
      analytics: { label: 'Analytics produit', mcp: 'analytics', secrets: ['VITE_POSTHOG_KEY'], options: ['posthog-js'] },
      'error-tracking': { label: 'Suivi d’erreurs', mcp: 'error-tracking', secrets: ['VITE_SENTRY_DSN'], options: ['@sentry/react'] },
      jobs: { label: 'Tâches planifiées / cron', options: ['Convex Scheduler + convex/crons.ts (built-in)', '@convex-dev/workpool ou @convex-dev/workflow (traitement lourd/durable)'], when: 'Built-in par défaut.' },
      search: { label: 'Recherche', options: ['Convex searchIndex (built-in, défaut)', 'Algolia + algolia/mcp'], when: 'Built-in par défaut ; Algolia si gros catalogue / pertinence avancée.' },
    },
```

- [ ] **Step 4 : Ajouter `domains:` à `STACKS.mobile`** — dans l'objet `mobile` (après `rules: [...]`), insérer :

```js
    domains: {
      payment: { label: 'Paiement', options: ['@stripe/stripe-react-native (biens physiques / services réels)', 'RevenueCat : react-native-purchases (+ react-native-purchases-ui) pour les achats intégrés (IAP)'], when: 'Apple/Google IMPOSENT l’IAP (RevenueCat) pour le digital consommé dans l’app ; Stripe autorisé pour biens/services réels. Les deux → dev build requis (pas Expo Go).' },
      push: { label: 'Notifications push', options: ['expo-notifications'], when: 'Push distant → dev build (Android SDK 53+) + projectId EAS.' },
      camera: { label: 'Caméra / média', options: ['expo-camera', 'expo-image-picker'], when: 'Fonctionne dans Expo Go.' },
      maps: { label: 'Cartes / localisation', options: ['react-native-maps', 'expo-location'], when: 'Google Maps → clé API + dev build.' },
      analytics: { label: 'Analytics produit', mcp: 'analytics', options: ['posthog-react-native'] },
      'error-tracking': { label: 'Suivi d’erreurs', mcp: 'error-tracking', options: ['@sentry/react-native'] },
    },
```

- [ ] **Step 5 : Ajouter `domains:` à `STACKS.desktop`** — dans l'objet `desktop` (après `rules: [...]`), insérer :

```js
    domains: {
      payment: { label: 'Paiement / licence', options: ['Stripe Checkout via shell.openExternal + un backend (JAMAIS la clé secrète dans l’app)', 'Keygen (validation de licence)', 'secure-electron-license-keys (hors-ligne)'], when: 'Une app desktop ne peut PAS utiliser Stripe directement : la clé secrète serait extractible. Il faut un petit backend.' },
      'auto-update': { label: 'Mises à jour automatiques', options: ['update-electron-app (feed gratuit update.electronjs.org)', 'electron-updater (feed self-host)'], when: 'macOS exige la signature de code (payante).' },
      persistence: { label: 'Persistance locale', options: ['electron-store (réglages)', 'better-sqlite3 (SQL local ; module natif → @electron/rebuild, skill electron:native-node-modules)'] },
      'error-tracking': { label: 'Suivi d’erreurs', mcp: 'error-tracking', options: ['@sentry/electron'] },
    },
```

- [ ] **Step 6 : Exposer `domains` dans `resolveStackManifest`** — dans `scripts/lib/matrix.mjs`, dans l'objet retourné par `resolveStackManifest`, ajouter la ligne `domains` (après `rules: s.rules,`) :

```js
    rules: s.rules,
    domains: s.domains,
  };
```

- [ ] **Step 7 : Lancer les tests, vérifier le succès**

Run: `node --test scripts/lib/matrix-domains.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 8 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix-domains.test.mjs
git commit -m "feat(matrix): champ domains par stack (paiement/email/storage/…)"
```

---

### Task 3 : Rendu `docs/DOMAINS.md` (`renderDomains`)

**Files:**
- Modify: `scripts/lib/domains.mjs` (ajouter `renderDomains`)
- Test: `scripts/lib/domains-render.test.mjs` (nouveau)

**Interfaces:**
- Consumes: `SHARED_DOMAINS` (Task 1) ; un objet `domains` de la forme `STACKS[stack].domains` (Task 2).
- Produces: `export function renderDomains({ stack, domains, shared }) → string` (markdown).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/domains-render.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest } from './matrix.mjs';
import { SHARED_DOMAINS, renderDomains } from './domains.mjs';

test('DOMAINS.md SaaS liste labels, options, secrets et MCP', () => {
  const md = renderDomains({ stack: 'saas', domains: resolveStackManifest('saas', 'claude-code').domains, shared: SHARED_DOMAINS });
  assert.match(md, /Paiement/);
  assert.match(md, /@better-auth\/stripe/);
  assert.match(md, /STRIPE_WEBHOOK_SECRET/);
  assert.match(md, /mcp\.stripe\.com/);        // ligne MCP tirée du catalogue partagé
  assert.match(md, /searchIndex/);
});

test('DOMAINS.md mobile : règle IAP présente', () => {
  const md = renderDomains({ stack: 'mobile', domains: STACKS.mobile.domains, shared: SHARED_DOMAINS });
  assert.match(md, /IAP|RevenueCat/);
});

test('un domaine sans MCP n’imprime pas de ligne MCP vide', () => {
  const md = renderDomains({ stack: 'desktop', domains: STACKS.desktop.domains, shared: SHARED_DOMAINS });
  assert.doesNotMatch(md, /MCP\s*:\s*\n/);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/domains-render.test.mjs`
Expected: FAIL (`renderDomains` non exporté).

- [ ] **Step 3 : Ajouter `renderDomains` à la fin de `scripts/lib/domains.mjs`**

```js
// Rend docs/DOMAINS.md : le catalogue de capacités de la stack que l'IA lit pour choisir selon le PRD.
export function renderDomains({ stack, domains, shared }) {
  const L = [];
  L.push(`# Capacités métier — stack ${stack}`);
  L.push('');
  L.push('L’IA lit ce catalogue pour choisir les capacités **selon le PRD** (elle n’invente pas). Règle : préférer le **built-in / officiel** ; n’ajouter une option externe que si le PRD le justifie. Les secrets vont dans `.env.example` (ou l’env Convex pour cette stack), jamais dans le code client.');
  L.push('');
  for (const [key, d] of Object.entries(domains)) {
    L.push(`## ${d.label}`);
    for (const o of d.options) L.push(`- ${o}`);
    if (d.when) L.push(`- _Quand :_ ${d.when}`);
    if (d.secrets && d.secrets.length) L.push(`- _Secrets :_ ${d.secrets.join(', ')}`);
    if (d.mcp && shared[d.mcp]) L.push(`- _MCP :_ \`${shared[d.mcp].mcp.install}\``);
    L.push('');
  }
  return L.join('\n');
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/domains-render.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/domains.mjs scripts/lib/domains-render.test.mjs
git commit -m "feat(domains): rendu de docs/DOMAINS.md par stack"
```

---

### Task 4 : Écrire `docs/DOMAINS.md` + pointeur AGENTS (environment.mjs + templates.mjs)

**Files:**
- Modify: `scripts/lib/environment.mjs` (nouvelle étape 8 : écrit `docs/DOMAINS.md`)
- Modify: `scripts/lib/environment.test.mjs` (assert DOMAINS.md présent)
- Modify: `scripts/lib/templates.mjs` (ajoute le pointeur `docs/DOMAINS.md` dans la liste « Docs du projet » de `renderProjectAgentsMd`)

**Interfaces:**
- Consumes: `renderDomains` + `SHARED_DOMAINS` (domains.mjs) ; `manifest.domains` (Task 2).

- [ ] **Step 1 : Écrire le test qui échoue** — ajouter ce test à `scripts/lib/environment.test.mjs` (à la fin du fichier) :

```js
test('DOMAINS.md est écrit avec le catalogue de la stack', () => {
  const dir = project();
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  const dom = fs.readFileSync(path.join(dir, 'docs/DOMAINS.md'), 'utf8');
  assert.match(dom, /Capacités métier/);
  assert.match(dom, /@better-auth\/stripe/);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/environment.test.mjs`
Expected: FAIL (`docs/DOMAINS.md` absent).

- [ ] **Step 3 : Ajouter l'import et l'étape 8 dans `scripts/lib/environment.mjs`**

En haut, après la ligne `import { renderSetupAi } from './setup-ai.mjs';`, ajouter :
```js
import { renderDomains, SHARED_DOMAINS } from './domains.mjs';
```

Puis, juste après le bloc « 6. SETUP-AI.md » (le `try { write('docs/SETUP-AI.md', ...) ... }`), insérer :
```js
  // 6b. DOMAINS.md (catalogue métier de la stack)
  try { write('docs/DOMAINS.md', renderDomains({ stack, domains: manifest.domains, shared: SHARED_DOMAINS })); done.push('docs/DOMAINS.md'); }
  catch (e) { failed.push(`DOMAINS (${e.message})`); }
```

- [ ] **Step 4 : Ajouter le pointeur dans `scripts/lib/templates.mjs`** — dans `renderProjectAgentsMd`, la ligne « ## Docs du projet » liste les docs. Remplacer :

```js
## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Architecture : \`docs/superpowers/specs/\` · Propositions (dream) : \`docs/DREAM.md\`.
```
par :
```js
## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Capacités : \`docs/DOMAINS.md\` · Architecture : \`docs/superpowers/specs/\` · Propositions (dream) : \`docs/DREAM.md\`.
```

- [ ] **Step 5 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/environment.test.mjs`
Expected: PASS.

- [ ] **Step 6 : Vérif à la main (dry d'intégration)**

Run:
```bash
rm -rf /tmp/vs-dom && node scripts/setup.mjs --source . --stack mobile --assistant claude-code --project /tmp/vs-dom >/dev/null && node -e "const fs=require('fs');const d=fs.readFileSync('/tmp/vs-dom/docs/DOMAINS.md','utf8');if(!/RevenueCat|IAP/.test(d))throw new Error('règle IAP manquante');console.log('OK DOMAINS mobile')"
```
Expected: `OK DOMAINS mobile`.

- [ ] **Step 7 : Suite complète + commit**

Run: `node --test` (vert ; coller la fin dans le rapport).
```bash
git add scripts/lib/environment.mjs scripts/lib/environment.test.mjs scripts/lib/templates.mjs
git commit -m "feat(environment): écrit docs/DOMAINS.md + pointeur AGENTS"
```

---

## Self-Review

**Spec coverage (§1.7) :**
- §1.7a `SHARED_DOMAINS` (MCP cross-stack) → Task 1 ✓
- §1.7b `domains` par stack (paiement 4 options SaaS, IAP mobile, licence desktop) → Task 2 ✓
- §1.7c `DOMAIN_TRIGGERS` (mot-clé→domaine) → Task 1 ✓
- §1.7d rendu `docs/DOMAINS.md` par `setup.mjs` → Task 3+4 ✓ ; pointeur AGENTS → Task 4 ✓
- Sélection par le PRD dans `/new-project` → **hors Plan 2** (Plan 3), volontaire. Les triggers sont prêts.

**Placeholder scan :** aucun TBD/TODO ; code complet à chaque étape ; données vérifiées (pas de paquet inventé). ✓

**Type consistency :** `domains` (matrix) a la forme `{label, options[], mcp?, secrets?, when?}` — consommée identiquement par `renderDomains` (Task 3) et le test (Task 2). `SHARED_DOMAINS[key].mcp.install` cohérent Task 1↔3. `resolveStackManifest(...).domains` ajouté Task 2, consommé Task 4. ✓

## Notes d'exécution

- Ordre : Task 1 → 2 → 3 → 4 (3 dépend de 1+2 ; 4 de 3).
- Branche : `git checkout -b feat/domaines` depuis `main` avant Task 1.
- Après Plan 2 : Plan 3 (ROADMAP + `/new-project` sélection domaines + `/build`).

// Dossier de commandes par assistant : source unique dans commands-list.mjs (il était recopié
// ici sous le nom `TARGET` et dans kit-owned.mjs sous le nom `CMD_DIR`).
import { COMMANDS_DIR } from './commands-list.mjs';

export const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};

// Le geste MCP, par assistant — SOURCE UNIQUE. `docs/A-FAIRE.md` le disait déjà correctement,
// mais le prompt de premier contact (`COLLE-MOI-DANS-L-IA.md`) imposait `/mcp` aux trois : une
// commande qui n'existe ni chez Cursor (Settings → MCP) ni chez Codex (recopie du `.mcp.json`).
// `court` = la forme d'une parenthèse, `long` = la case à cocher de A-FAIRE ; les deux doivent
// nommer le même geste (voir « G1 » dans parcours.test.mjs).
export const MCP_CONNECT = {
  cursor: { court: 'Settings → MCP', long: 'ouvre **Settings → MCP** dans Cursor et active-le' },
  'claude-code': { court: '`/mcp`', long: 'lance `/mcp` pour connecter' },
  codex: { court: 'recopie `.mcp.json` dans ta config MCP Codex', long: '**recopie la définition** du serveur depuis `.mcp.json` dans ta configuration MCP Codex' },
};
// Les 4 skills design, SOURCE UNIQUE. La « Règle design » ordonne de les charger, les runbooks
// les citent, `validate-commands.mjs` vérifie qu'ils y sont, et `DESIGN_SKILL_SPECS` (plus bas)
// doit les installer : quatre endroits, une seule liste. shadcnblocks n'en fait pas partie —
// c'est un registry du CLI shadcn, pas un skill (voir SHADCN_NOTE).
export const DESIGN_SKILL_NAMES = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines'];
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
// Contexte IA par stack. `ai-context/` pèse 4,8 Mo, dont 4,7 en `llms-full` Convex + Expo :
// une vitrine les recevait TOUS. On ne copie que les dossiers de la stack (+ le README, qui
// explique quoi en faire — sans lui, le dossier arrive sans mode d'emploi).
export const AI_CONTEXT = {
  saas: ['better-auth', 'convex', 'tanstack-start'],
  mobile: ['convex', 'react-native-expo'],
  desktop: ['electron'],
  vitrine: ['astro'],
};
// awesome-cursorrules : SUPPRIMÉ. Le matching par tags déversait 64-201 règles .mdc hors-sujet
// (Angular, Solidity…) avec `globs: **/*` — l'anti-pattern des docs Cursor. Les règles typées
// du kit (templates/cursor/rules/) couvrent le besoin.

export function resolveAssets(stack, assistant) {
  if (!COMMANDS_DIR[assistant]) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(COMMANDS_DIR).join('|')})`);
  // Garde d'entrée : sans elle, une stack mal orthographiée partait avec ZÉRO contexte IA, en
  // silence — le scaffold réussissait, le projet naissait aveugle.
  if (!AI_CONTEXT[stack]) throw new Error(`Stack inconnue : ${stack} (attendu: ${Object.keys(AI_CONTEXT).join('|')})`);
  // `skipped` a disparu : il était toujours vide (plus rien n'y était poussé depuis le retrait
  // d'awesome-cursorrules) et le rapport le concaténait avec les vrais « sautés » du scaffold.
  const copies = [], clones = [], inAssistant = [];
  const isCursor = assistant === 'cursor';
  const isClaude = assistant === 'claude-code';

  if (isCursor) {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles complètes de la stack ${stack} (charge quand pertinent)`, alwaysApply: false });
  } else {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `AGENTS-stack.md`, transform: 'raw' });
    if (isClaude) copies.push({ from: `.claude/skills/stack-${stack}`, to: `.claude/skills/stack-${stack}`, transform: 'dir' });
  }
  copies.push({ from: 'ai-context/README.md', to: 'ai-context/README.md', transform: 'raw' });
  for (const d of AI_CONTEXT[stack]) copies.push({ from: `ai-context/${d}`, to: `ai-context/${d}`, transform: 'dir' });

  clones.push({
    repo: KARPATHY_REPO,
    // Le dépôt tiers livre la règle en `alwaysApply: true` : on la copie en Agent-Requested
    // (transform 'mdc-on-demand'), sinon elle sature le contexte à chaque tour.
    picks: isCursor
      ? [{ src: '.cursor/rules/karpathy-guidelines.mdc', to: '.cursor/rules/karpathy.mdc', transform: 'mdc-on-demand' }]
      : [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }],
  });
  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });

  return { copies, clones, inAssistant, commandsDir: COMMANDS_DIR[assistant] };
}

// Stitch (Google Labs) — design/maquette par IA. Skills officiels auto-installés + MCP distant.
// SÉCURITÉ : le MCP Stitch se configure au niveau UTILISATEUR (hors dépôt) — la clé n'est jamais commitée.
// (Cursor sait interpoler ${env:...} dans les headers MCP ; on garde le user-scope pour la simplicité :
// une seule clé, tous les projets, rien à mettre dans le mcp.json du dépôt.) Rendu dans A-FAIRE.md (renderSetupAi).
export const STITCH = {
  url: 'https://stitch.googleapis.com/mcp',
  keyUrl: 'https://stitch.withgoogle.com',
  keySteps: 'Settings → Create API Key',
  mcp: {
    cursor: 'Cursor → Settings → MCP → Add — dans la config **globale** (`~/.cursor/mcp.json`, PAS le projet) : `{ "mcpServers": { "stitch": { "url": "https://stitch.googleapis.com/mcp", "headers": { "X-Goog-Api-Key": "TA_CLÉ" } } } }`',
    'claude-code': '`claude mcp add stitch --transport http https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: TA_CLÉ" -s user`',
    codex: 'Ajoute un serveur MCP HTTP `https://stitch.googleapis.com/mcp` avec le header `X-Goog-Api-Key: TA_CLÉ` dans ta config Codex **utilisateur**.',
  },
};
const STITCH_SKILL = { label: 'stitch (maquette : generate-design · extract-html · loop · design-md)', repo: 'google-labs-code/stitch-skills', skills: ['stitch::generate-design', 'stitch::extract-static-html', 'stitch-loop', 'design-md'] };

// Versions ÉPINGLÉES, source unique. Sans épingle, la doc du kit redevient fausse au prochain
// majeur sans que rien ne rougisse : `faits-stacks.test.mjs` compare cette table à ce que TOUS
// les fichiers du kit annoncent. Vérifié le 30/07/2026 :
//   npm view astro version engines → 7.1.6 · engines.node = '>=22.12.0'
// Changer un chiffre ici oblige à mettre la doc en accord (le test le dit, fichier:ligne).
export const PINS = {
  vitrine: { astro: '7', node: '22.12' },
};

export const STACKS = {
  saas: {
    plugins: {
      'claude-code': [{ name: 'convex', cmd: '/plugin install convex@claude-plugins-official' }],
      cursor: [{ name: 'convex-agent-plugins', cmd: 'git clone https://github.com/get-convex/convex-agent-plugins ~/.cursor/plugins/convex-agent-plugins' }],
      codex: [],
    },
    mcp: {
      convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] },
      'better-auth': { type: 'http', url: 'https://mcp.better-auth.com/mcp' },
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
      // Test E2E fonctionnel : pilote un vrai navigateur (navigate/click/fill/assert) + tests rejouables en CI.
      playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
    },
    skills: [
      { label: 'better-auth', repo: 'better-auth/skills' },
      { label: 'convex-agent-skills', repo: 'get-convex/agent-skills', all: true },
      STITCH_SKILL,
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: [] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
      { label: 'TanStack Start llms', url: 'https://tanstack.com/start/latest/llms.txt' },
      { label: 'Better Auth llms', url: 'https://better-auth.com/llms.txt' },
    ],
    domains: {
      payment: { label: 'Paiement / abonnements', mcp: 'payment', secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], options: ['@better-auth/stripe (défaut, couplé auth)', '@convex-dev/stripe (Convex-natif)', 'Polar : @polar-sh/better-auth ou @convex-dev/polar (marchand de référence, gère la TVA)', `Autumn : @useautumn/convex (facturation à l'usage)`], when: `Secrets webhook → env Convex. TVA gérée pour toi → Polar. À l'usage/crédits → Autumn.` },
      // `@react-email/components` est DÉPRÉCIÉ sur npm (jusqu'à sa dernière version, 1.0.12) :
      // les composants sont passés dans le paquet `react-email` lui-même (README de
      // resend/react-email : `npm i react-email@latest`, `import { Button } from "react-email"`).
      email: { label: 'Email transactionnel', mcp: 'email', secrets: ['RESEND_API_KEY'], options: ['@convex-dev/resend + react-email'], when: `Composant officiel Convex×Resend. Brancher ici les mails Better Auth (reset, vérification, magic link).` },
      storage: { label: 'Upload / stockage de fichiers', options: ['Convex File Storage (built-in, défaut)', `UploadThing (UI d'upload prête)`, '@convex-dev/r2 (Cloudflare R2)'], when: 'Built-in par défaut ; externe seulement si UI drag-drop ou gros volume/coût.' },
      analytics: { label: 'Analytics produit', mcp: 'analytics', secrets: ['VITE_POSTHOG_KEY'], options: ['posthog-js'] },
      'error-tracking': { label: `Suivi d'erreurs`, mcp: 'error-tracking', secrets: ['VITE_SENTRY_DSN'], options: ['@sentry/react'] },
      jobs: { label: 'Tâches planifiées / cron', options: ['Convex Scheduler + convex/crons.ts (built-in)', '@convex-dev/workpool ou @convex-dev/workflow (traitement lourd/durable)'], when: 'Built-in par défaut.' },
      search: { label: 'Recherche', options: ['Convex searchIndex (built-in, défaut)', 'Algolia + algolia/mcp'], when: 'Built-in par défaut ; Algolia si gros catalogue / pertinence avancée.' },
    },
  },
  mobile: {
    plugins: {
      'claude-code': [
        { name: 'expo', cmd: 'claude plugin install expo@claude-plugins-official' },
        { name: 'convex', cmd: '/plugin install convex@claude-plugins-official' },
      ],
      cursor: [],
      codex: [{ name: 'expo', cmd: 'codex plugin add expo@openai-curated' }],
    },
    mcp: {
      convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] },
      expo: { type: 'http', url: 'https://mcp.expo.dev/mcp', needsAuth: true },
      // Test E2E fonctionnel mobile : pilote le simulateur iOS / émulateur Android + flows Maestro.
      // Bundlé dans le Maestro CLI (pas npx) → prérequis à installer une fois.
      // Chemin ABSOLU (pas `maestro` nu) : Cursor/GUI n'héritent pas du PATH du shell → `spawn ENOENT`.
      // `~/…` est étendu en absolu au moment d'écrire la config (voir expandMcpCommands).
      // Le prérequis nommait « Cursor » — il partait pourtant tel quel dans le A-FAIRE des trois
      // assistants : un utilisateur Codex lisait une note écrite pour un autre outil. La cause
      // (une app GUI n'hérite pas du PATH du shell) vaut pour les trois : on la dit sans nom.
      maestro: { command: '~/.maestro/bin/maestro', args: ['mcp'], prereq: 'installe le Maestro CLI : `curl -fsSL "https://get.maestro.mobile.dev" | bash` (chemin par défaut `~/.maestro/bin`) + un simulateur iOS / émulateur Android. Après install, **relance ton assistant** puis reteste le serveur : une app lancée depuis le Dock (ou le menu Démarrer) n\'hérite pas du PATH de ton terminal. Erreur Java → ajoute `JAVA_HOME` dans `env`.' },
    },
    skills: [
      { label: 'expo', repo: 'expo/skills' },
      { label: 'convex-agent-skills', repo: 'get-convex/agent-skills', all: true },
      STITCH_SKILL,
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint-expo', 'deps-check'], prePush: ['doctor'] },
    scripts: { typecheck: 'tsc --noEmit' },
    rules: [
      { label: 'Expo llms', url: 'https://docs.expo.dev/llms.txt' },
      { label: 'React Native llms', url: 'https://reactnative.dev/llms.txt' },
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
    ],
    domains: {
      payment: { label: 'Paiement', options: ['@stripe/stripe-react-native (biens physiques / services réels)', 'RevenueCat : react-native-purchases (+ react-native-purchases-ui) pour les achats intégrés (IAP)'], when: `Apple/Google IMPOSENT l'IAP (RevenueCat) pour le digital consommé dans l'app ; Stripe autorisé pour biens/services réels. Les deux → dev build requis (pas Expo Go).` },
      // Doc Expo (push-notifications/what-you-need-to-know) : « You must use a development build
      // to use push notifications since the capability is not built into Expo Go. » Aucune
      // distinction de plateforme — iOS ET Android, pas seulement Android.
      push: { label: 'Notifications push', options: ['expo-notifications'], when: 'Push distant → dev build OBLIGATOIRE sur iOS ET Android (Expo Go ne l\'embarque plus) + projectId EAS.' },
      camera: { label: 'Caméra / média', options: ['expo-camera', 'expo-image-picker'], when: 'Fonctionne dans Expo Go.' },
      maps: { label: 'Cartes / localisation', options: ['react-native-maps', 'expo-location'], when: 'Google Maps → clé API + dev build.' },
      analytics: { label: 'Analytics produit', mcp: 'analytics', options: ['posthog-react-native'] },
      'error-tracking': { label: `Suivi d'erreurs`, mcp: 'error-tracking', options: ['@sentry/react-native'] },
    },
  },
  desktop: {
    plugins: {
      // Dépôt COMMUNAUTAIRE (ohvignas/claude-electron-skills), pas un dépôt Electron officiel :
      // 1 ★, écrit pour Electron 42 quand npm publie 43.2.0. Utile, mais à relire.
      'claude-code': [{ name: 'electron', cmd: 'claude plugin marketplace add ohvignas/claude-electron-skills && claude plugin install electron@claude-electron-skills', note: 'skills **communautaires** (dépôt tiers `ohvignas/claude-electron-skills`, écrit pour Electron 42) — pas un paquet officiel Electron : recoupe avec https://www.electronjs.org/docs/latest' }],
      cursor: [],
      codex: [],
    },
    mcp: {
      'chrome-devtools': { command: 'npx', args: ['chrome-devtools-mcp@latest', '--browser-url=http://127.0.0.1:9222'] },
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
    },
    skills: [STITCH_SKILL],
    // `security` (npx @doyensec/electronegativity) a été RETIRÉ : son paquet npm n'a pas bougé
    // depuis le 09/03/2023. Le push garde un filet réel — `npm audit` — et l'audit Electron
    // proprement dit reste la checklist officielle des 20 points (voir `rules` ci-dessous),
    // conduite par l'agent sécurité, pas par un binaire abandonné.
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: ['audit'] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Electron security checklist', url: 'https://www.electronjs.org/docs/latest/tutorial/security' },
      { label: 'Electron docs', url: 'https://www.electronjs.org/docs/latest' },
    ],
    domains: {
      payment: { label: 'Paiement / licence', options: [`Stripe Checkout via shell.openExternal + un backend (JAMAIS la clé secrète dans l'app)`, 'Keygen (validation de licence)', 'secure-electron-license-keys (hors-ligne)'], when: 'Une app desktop ne peut PAS utiliser Stripe directement : la clé secrète serait extractible. Il faut un petit backend.' },
      'auto-update': { label: 'Mises à jour automatiques', options: ['update-electron-app (feed gratuit update.electronjs.org)', 'electron-updater (feed self-host)'], when: 'macOS exige la signature de code (payante).' },
      persistence: { label: 'Persistance locale', options: ['electron-store (réglages)', 'better-sqlite3 (SQL local ; module natif → @electron/rebuild, skill electron:native-node-modules)'] },
      'error-tracking': { label: `Suivi d'erreurs`, mcp: 'error-tracking', options: ['@sentry/electron'] },
    },
  },
  vitrine: {
    plugins: { 'claude-code': [], cursor: [], codex: [] },
    mcp: {
      // Astro a RETIRÉ son llms.txt (05/2026) : le MCP Docs officiel est la source à jour.
      'astro-docs': { command: 'npx', args: ['-y', 'mcp-remote', 'https://mcp.docs.astro.build/mcp'] },
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
      // Test E2E fonctionnel : pilote un vrai navigateur (navigate/click/fill/assert) + tests rejouables en CI.
      playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
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
};

export function resolveStackManifest(stack, assistant) {
  const s = STACKS[stack];
  if (!s) throw new Error(`Stack inconnue : ${stack} (attendu: ${Object.keys(STACKS).join('|')})`);
  return {
    plugins: s.plugins[assistant] ?? [],
    mcp: s.mcp,
    skills: s.skills,
    checks: s.checks,
    scripts: s.scripts,
    rules: s.rules,
    domains: s.domains,
  };
}

// Skills design auto-installables (headless) via le CLI skills. Les blocs shadcnblocks ne sont PAS un skill :
// ils s'ajoutent via le registry natif du CLI shadcn (voir SHADCN_NOTE + /new-project Phase 7).
export const DESIGN_SKILL_SPECS = [
  // webapp-testing vient du MÊME dépôt : ajouté ici plutôt qu'en second clone (un seul `skills add`).
  { label: 'frontend-design + brand-guidelines + webapp-testing', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines', 'webapp-testing'] },
  { label: 'web-design-guidelines', repo: 'github.com/vercel-labs/agent-skills', skills: ['web-design-guidelines'] },
  { label: 'ui-ux-pro-max', repo: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill', skills: ['ui-ux-pro-max'] },
];

// Skills des agents du crew — chaque nom a été vérifié par `npx skills add <repo> --list`.
// Jamais `--all` : ces dépôts contiennent des dizaines de skills hors sujet.
export const AGENT_SKILL_SPECS = [
  { label: 'revue de code (Sentry)', repo: 'github.com/getsentry/skills', skills: ['code-review', 'find-bugs'] },
  { label: 'sécurité (OpenAI)', repo: 'github.com/openai/skills', skills: ['security-best-practices', 'security-threat-model'] },
];

// « ajouté à components.json au scaffold » était FAUX : le scaffold du kit ne crée aucun
// `components.json` — il n'y a même pas encore de projet à ce stade. C'est `/new-project`
// Phase 7 qui, après `shadcn init`, y déclare le registry. Promettre l'inverse envoyait le
// débutant chercher un fichier inexistant.
// `<new-project>` est substitué au rendu par la façon dont CET assistant désigne le runbook
// (`/new-project`, ou le fichier à ouvrir chez Codex) — voir refCommande.
export const SHADCN_NOTE = 'Blocs pré-faits **shadcnblocks** via le CLI shadcn natif : `npx shadcn add @shadcnblocks/<bloc>` (ex. `@shadcnblocks/hero125`). Rien à faire maintenant : le registry `@shadcnblocks` se déclare dans `components.json`, que **<new-project> Phase 7** crée en même temps que le projet (`shadcn init`). Blocs **gratuits sans clé** ; pour les blocs **pro**, mets `SHADCNBLOCKS_API_KEY` dans `.env`.';

// Mobile : React Native n'a pas de DOM — ni shadcn/ui ni les blocs shadcnblocks n'y tournent
// (`/new-project` Phase 7 : « mobile : jamais shadcn »). A-FAIRE poussait pourtant la même note
// qu'en web : une case à cocher intenable, avec une clé d'API à la clé.
export const NATIVEWIND_NOTE = 'Rien à installer côté blocs : en React Native, l\'UI se compose avec **NativeWind** (Tailwind pour RN) et les composants natifs — les bibliothèques de blocs web visent le DOM, que RN n\'a pas. Le thème vit dans `docs/design.md`.';

// La note « blocs d'UI » de la stack : web → shadcnblocks, mobile → NativeWind.
export function uiBlocksNote(stack) {
  return stack === 'mobile' ? NATIVEWIND_NOTE : SHADCN_NOTE;
}

// Stacks à UI web (rendu HTML/Chrome) → comparaison visuelle maquette↔page possible.
// Mobile exclu (React Native, pas de rendu Chrome).
export const VISUAL_CHECK_STACKS = ['saas', 'desktop', 'vitrine'];

// Outils lancés par l'agent sécurité et le vérificateur. Gratuits, sans compte — et OPTIONNELS :
// rien dans le kit ne les installe, rien ne les exige pour scaffolder, construire ou tester.
// La case était présentée comme les autres, donc lue comme un prérequis. On dit ce qu'on perd :
// sans eux l'agent sécurité n'a aucune preuve à produire, et le gate de `/deploy` ne passe pas.
export const VERIF_TOOLS_NOTE = 'Outils de vérification — **optionnels** : le kit ne les installe pas et tout le reste marche sans. Ce qu\'on perd : l\'agent sécurité n\'a aucune preuve à produire, il répond `NON PROUVÉ`, et le gate sécurité du déploiement ne passe pas. Pour les avoir : `brew install semgrep gitleaks osv-scanner` (ou `pipx install semgrep`). Les autres (`npx oxlint`, `npx knip`) s\'exécutent sans installation.';

// Signal INDICATIF, jamais un prérequis : l'œil (et le screenshot) tranchent. Un outil de
// comparaison automatique — PixelRAG par exemple — n'est qu'un confort, à installer si tu veux.
export const PIXELRAG_NOTE = 'Rien à installer. Compare simplement le screenshot de ta page à l\'écran correspondant de `maquette/` : c\'est ce qui fait foi. Si tu veux un chiffre en plus, un comparateur d\'images (PixelRAG et consorts) donne un **signal indicatif** — il ne bloque jamais, et un écart mesuré ne vaut pas un verdict.';

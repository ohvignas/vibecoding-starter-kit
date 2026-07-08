const TARGET = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };
export const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};
export const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
// awesome-cursorrules : SUPPRIMÉ. Le matching par tags déversait 64-201 règles .mdc hors-sujet
// (Angular, Solidity…) avec `globs: **/*` — l'anti-pattern des docs Cursor. Les règles typées
// du kit (templates/cursor/rules/) couvrent le besoin.

export function resolveAssets(stack, assistant) {
  if (!TARGET[assistant]) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(TARGET).join('|')})`);
  const copies = [], clones = [], inAssistant = [], skipped = [];
  const isCursor = assistant === 'cursor';
  const isClaude = assistant === 'claude-code';

  if (isCursor) {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles complètes de la stack ${stack} (charge quand pertinent)`, alwaysApply: false });
  } else {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `AGENTS-stack.md`, transform: 'raw' });
    if (isClaude) copies.push({ from: `.claude/skills/stack-${stack}`, to: `.claude/skills/stack-${stack}`, transform: 'dir' });
  }
  copies.push({ from: `ai-context`, to: `ai-context`, transform: 'dir' });

  clones.push({
    repo: KARPATHY_REPO,
    picks: isCursor
      ? [{ src: '.cursor/rules/karpathy-guidelines.mdc', to: '.cursor/rules/karpathy.mdc' }]
      : [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }],
  });
  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });

  return { copies, clones, inAssistant, skipped, commandsDir: TARGET[assistant] };
}

// Stitch (Google Labs) — design/maquette par IA. Skills officiels auto-installés + MCP distant.
// SÉCURITÉ : le MCP Stitch se configure au niveau UTILISATEUR (hors dépôt) — la clé n'est jamais commitée.
// (Cursor sait interpoler ${env:...} dans les headers MCP ; on garde le user-scope pour la simplicité :
// une seule clé, tous les projets, rien à mettre dans le mcp.json du dépôt.) Rendu par SETUP-AI (renderSetupAi).
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
      email: { label: 'Email transactionnel', mcp: 'email', secrets: ['RESEND_API_KEY'], options: ['@convex-dev/resend + @react-email/components'], when: `Composant officiel Convex×Resend. Brancher ici les mails Better Auth (reset, vérification, magic link).` },
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
      push: { label: 'Notifications push', options: ['expo-notifications'], when: 'Push distant → dev build (Android SDK 53+) + projectId EAS.' },
      camera: { label: 'Caméra / média', options: ['expo-camera', 'expo-image-picker'], when: 'Fonctionne dans Expo Go.' },
      maps: { label: 'Cartes / localisation', options: ['react-native-maps', 'expo-location'], when: 'Google Maps → clé API + dev build.' },
      analytics: { label: 'Analytics produit', mcp: 'analytics', options: ['posthog-react-native'] },
      'error-tracking': { label: `Suivi d'erreurs`, mcp: 'error-tracking', options: ['@sentry/react-native'] },
    },
  },
  desktop: {
    plugins: {
      'claude-code': [{ name: 'electron', cmd: 'claude plugin marketplace add ohvignas/claude-electron-skills && claude plugin install electron@claude-electron-skills' }],
      cursor: [],
      codex: [],
    },
    mcp: {
      'chrome-devtools': { command: 'npx', args: ['chrome-devtools-mcp@latest', '--browser-url=http://127.0.0.1:9222'] },
    },
    skills: [STITCH_SKILL],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: ['security'] },
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

// Skills design auto-installables (headless) via le CLI skills. shadcnblocks à part (clé payante).
export const DESIGN_SKILL_SPECS = [
  { label: 'frontend-design + brand-guidelines', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines'] },
  { label: 'web-design-guidelines', repo: 'github.com/vercel-labs/agent-skills', skills: ['web-design-guidelines'] },
  { label: 'ui-ux-pro-max', repo: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill', skills: ['ui-ux-pro-max'] },
];

export const SHADCN_NOTE = 'shadcnblocks (optionnel) : `npx -y skills add masonjames/Shadcnblocks-Skill -a <assistant> --yes` — nécessite une clé API ShadcnBlocks (payante) + `jq` pour récupérer des blocs.';

const TARGET = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };
const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};
export const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
const CURSORRULES_REPO = 'https://github.com/PatrickJS/awesome-cursorrules';
const CURSOR_TAGS = { saas: ['typescript', 'react', 'clean-code'], mobile: ['react-native', 'typescript', 'expo'], desktop: ['typescript', 'clean-code'] };

export function resolveAssets(stack, assistant) {
  if (!TARGET[assistant]) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(TARGET).join('|')})`);
  const copies = [], clones = [], inAssistant = [], skipped = [];
  const isCursor = assistant === 'cursor';
  const isClaude = assistant === 'claude-code';

  if (isCursor) {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles stack ${stack}` });
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
  if (isCursor) clones.push({ repo: CURSORRULES_REPO, matchTags: CURSOR_TAGS[stack], to: '.cursor/rules' });
  else skipped.push({ name: 'awesome-cursorrules', reason: 'Format .mdc spécifique à Cursor' });

  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });
  inAssistant.push({ name: 'skills design (5)', command: `installe dans ton assistant : ${DESIGN_SKILLS} (voir guides/03 + la règle design de l'AGENTS.md)` });

  return { copies, clones, inAssistant, skipped, commandsDir: TARGET[assistant] };
}

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
      { name: 'better-auth', cmd: 'npx skills add better-auth/skills' },
      { name: 'convex-agent-skills', cmd: 'npx skills add get-convex/agent-skills --all' },
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: [] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
      { label: 'TanStack Start llms', url: 'https://tanstack.com/start/latest/llms.txt' },
      { label: 'Better Auth llms', url: 'https://better-auth.com/llms.txt' },
    ],
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
      { name: 'expo', cmd: 'npx skills add expo/skills' },
      { name: 'convex-agent-skills', cmd: 'npx skills add get-convex/agent-skills --all' },
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint-expo', 'deps-check'], prePush: ['doctor'] },
    scripts: { typecheck: 'tsc --noEmit' },
    rules: [
      { label: 'Expo llms', url: 'https://docs.expo.dev/llms.txt' },
      { label: 'React Native llms', url: 'https://reactnative.dev/llms.txt' },
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
    ],
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
    skills: [],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: ['security'] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Electron security checklist', url: 'https://www.electronjs.org/docs/latest/tutorial/security' },
      { label: 'Electron docs', url: 'https://www.electronjs.org/docs/latest' },
    ],
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
  };
}

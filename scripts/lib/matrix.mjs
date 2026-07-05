const TARGET = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };
const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};
const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
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
  if (stack !== 'desktop') copies.push({ from: `.mcp.json`, to: isCursor ? `.cursor/mcp.json` : `.mcp.json`, transform: 'raw' });

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

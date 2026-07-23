// Fichiers 100% kit (aucune édition utilisateur attendue) → régénérables par `update --refresh`.
// Retourne des paires { from (relatif au kit), to (relatif au projet) }. JAMAIS de chemin utilisateur.
const COMMANDS = ['init-vibecoding', 'help', 'new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos', 'debug', 'deploy'];
const CMD_DIR = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };

export function kitOwnedFiles(stack, assistant) {
  const dir = CMD_DIR[assistant];
  if (!dir) throw new Error(`Assistant inconnu : ${assistant}`);
  const pairs = COMMANDS.map((c) => ({ from: `templates/commands/${c}.md`, to: `${dir}/${c}.md` }));
  if (assistant === 'cursor') {
    pairs.push({ from: 'templates/cursor/rules/00-project.mdc', to: '.cursor/rules/00-project.mdc' });
    pairs.push({ from: 'templates/cursor/rules/10-css-maquette.mdc', to: '.cursor/rules/10-css-maquette.mdc' });
  }
  if (assistant === 'claude-code') {
    for (const a of ['code-reviewer', 'security-reviewer', 'test-runner']) {
      pairs.push({ from: `templates/agents/subagents/${a}.md`, to: `.claude/agents/${a}.md` });
    }
  }
  return pairs;
}

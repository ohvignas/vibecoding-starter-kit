// Fichiers 100% kit (aucune édition utilisateur attendue) → régénérables par `update --refresh`.
// Retourne des paires { from (relatif au kit), to (relatif au projet) }. JAMAIS de chemin utilisateur.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMMANDS = ['init-vibecoding', 'help', 'new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos', 'deploy'];
const CMD_DIR = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };
// Dossier d'agents NATIF de chaque assistant. Codex n'en a pas → docs/agents/crew/ (source unique
// partagée par le scaffold (setup.mjs) et la mise à jour (kitOwnedFiles) : jamais deux vérités).
export const AGENTS_DIR = { cursor: '.cursor/agents', 'claude-code': '.claude/agents', codex: 'docs/agents/crew' };
export const CREW = ['code-reviewer', 'security-reviewer', 'test-runner', 'verificateur', 'critique-produit', 'critique-donnees', 'critique-ux'];

// Liste un dossier du kit sans jamais planter si la source a bougé (le refresh saute alors le fichier).
const listKit = (rel, ext) => {
  try { return fs.readdirSync(path.join(KIT_ROOT, rel)).filter((f) => f.endsWith(ext)); }
  catch { return []; }
};

export function kitOwnedFiles(stack, assistant) {
  const dir = CMD_DIR[assistant];
  if (!dir) throw new Error(`Assistant inconnu : ${assistant}`);
  const pairs = COMMANDS.map((c) => ({ from: `templates/commands/${c}.md`, to: `${dir}/${c}.md` }));

  // Les 7 agents du crew, dans le dossier natif de l'assistant. Cursor ne comprend pas le
  // frontmatter Claude Code → transform 'cursor-agent' (appliqué par refresh.mjs).
  for (const a of CREW) {
    pairs.push({
      from: `templates/agents/subagents/${a}.md`,
      to: `${AGENTS_DIR[assistant]}/${a}.md`,
      ...(assistant === 'cursor' ? { transform: 'cursor-agent' } : {}),
    });
  }

  if (assistant === 'cursor') {
    pairs.push({ from: 'templates/cursor/rules/00-project.mdc', to: '.cursor/rules/00-project.mdc' });
    pairs.push({ from: 'templates/cursor/rules/10-css-maquette.mdc', to: '.cursor/rules/10-css-maquette.mdc' });
    // Règles typées par framework : copiées À PLAT (c'est ce que fait le scaffold, setup.mjs:171).
    for (const f of listKit(`templates/cursor/rules/${stack}`, '.mdc')) {
      pairs.push({ from: `templates/cursor/rules/${stack}/${f}`, to: `.cursor/rules/${f}` });
    }
    for (const f of listKit('templates/cursor/hooks', '.mjs')) {
      pairs.push({ from: `templates/cursor/hooks/${f}`, to: `.cursor/hooks/${f}` });
    }
  }
  if (assistant === 'claude-code') {
    // Le skill de stack est un DOSSIER dans le kit → viser le FICHIER, jamais le dossier
    // (refresh.mjs lit le chemin : un dossier donnerait EISDIR).
    pairs.push({ from: `.claude/skills/stack-${stack}/SKILL.md`, to: `.claude/skills/stack-${stack}/SKILL.md` });
  }
  return pairs;
}

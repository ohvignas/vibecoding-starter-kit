// Fichiers 100% kit (aucune édition utilisateur attendue) → régénérables par `update --refresh`.
// Retourne des paires { from (relatif au kit), to (relatif au projet) }. JAMAIS de chemin utilisateur.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, COMMANDS_DIR } from './commands-list.mjs';
import { resolveStackManifest } from './matrix.mjs';
import { prePushScript, preCommitCheckLine } from './hooks.mjs';
import { mergeMcpConfig, expandMcpCommands } from './mcp.mjs';
import { renderRunDoc } from './run-doc.mjs';

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Dossier d'agents NATIF de chaque assistant. Codex n'en a pas → docs/agents/crew/ (source unique
// partagée par le scaffold (setup.mjs) et la mise à jour (kitOwnedFiles) : jamais deux vérités).
export const AGENTS_DIR = { cursor: '.cursor/agents', 'claude-code': '.claude/agents', codex: 'docs/agents/crew' };
export const CREW = ['code-reviewer', 'security-reviewer', 'test-runner', 'verificateur', 'critique-produit', 'critique-donnees', 'critique-ux'];
// Dossier des hooks natifs, quand l'assistant en a un (Codex : aucun hook d'édition).
const HOOKS_SRC = { cursor: 'templates/cursor/hooks', 'claude-code': 'templates/claude/hooks' };
const HOOKS_DEST = { cursor: '.cursor/hooks', 'claude-code': '.claude/hooks' };
// Cursor lit `.cursor/mcp.json`, les deux autres `.mcp.json` — jamais les deux à la fois.
export const MCP_FILE = (assistant) => (assistant === 'cursor' ? '.cursor/mcp.json' : '.mcp.json');

// Liste un dossier du kit sans jamais planter si la source a bougé (le refresh saute alors le fichier).
const listKit = (rel, ext) => {
  try { return fs.readdirSync(path.join(KIT_ROOT, rel)).filter((f) => f.endsWith(ext)); }
  catch { return []; }
};

export function kitOwnedFiles(stack, assistant) {
  const dir = COMMANDS_DIR[assistant];
  if (!dir) throw new Error(`Assistant inconnu : ${assistant}`);
  const pairs = COMMANDS.map((c) => ({ from: `templates/commands/${c}.md`, to: `${dir}/${c}.md` }));

  // Templates que /new-project ouvre (PRD, architecture) : 100 % kit, l'utilisateur écrit dans
  // docs/PRD.md et la spec, jamais ici → régénérables sans risque par `--refresh`.
  pairs.push({ from: 'templates/prd/PRD.md', to: 'docs/templates/PRD.md' });
  pairs.push({ from: 'templates/specs/architecture.md', to: 'docs/templates/architecture.md' });

  // Le glossaire embarqué (Lot H7) : 100 % kit lui aussi, et le seul fichier du projet qui vienne
  // de `guides/` plutôt que de `templates/`. Sans cette ligne, un projet créé aujourd'hui garderait
  // à jamais le vocabulaire d'aujourd'hui — un glossaire périmé est pire que pas de glossaire.
  pairs.push({ from: 'guides/glossaire.md', to: 'docs/glossaire.md' });

  // Les 7 agents du crew, dans le dossier natif de l'assistant. Cursor ne comprend pas le
  // frontmatter Claude Code → transform 'cursor-agent' (appliqué par refresh.mjs).
  for (const a of CREW) {
    pairs.push({
      from: `templates/agents/subagents/${a}.md`,
      to: `${AGENTS_DIR[assistant]}/${a}.md`,
      ...(assistant === 'cursor' ? { transform: 'cursor-agent' } : {}),
    });
  }

  // Hooks natifs de l'assistant : c'est là que vit le garde-fou shell. Un correctif de sécurité
  // qui n'atteint jamais les projets déjà générés ne protège personne.
  if (HOOKS_SRC[assistant]) {
    for (const f of listKit(HOOKS_SRC[assistant], '.mjs')) {
      pairs.push({ from: `${HOOKS_SRC[assistant]}/${f}`, to: `${HOOKS_DEST[assistant]}/${f}` });
    }
  }
  // Runner de checks : recopié tel quel par le scaffold, donc 100 % kit lui aussi.
  pairs.push({ from: 'templates/hooks/framework/checks.mjs', to: '.githooks/checks.mjs' });
  // Fins de ligne (Windows) : règle du kit, aucune raison de l'éditer.
  pairs.push({ from: 'templates/gitattributes', to: '.gitattributes' });

  if (assistant === 'cursor') {
    pairs.push({ from: 'templates/cursor/rules/00-project.mdc', to: '.cursor/rules/00-project.mdc' });
    pairs.push({ from: 'templates/cursor/rules/10-css-maquette.mdc', to: '.cursor/rules/10-css-maquette.mdc' });
    // Règles typées par framework : copiées À PLAT (c'est ce que fait le scaffold, setup.mjs:179).
    for (const f of listKit(`templates/cursor/rules/${stack}`, '.mdc')) {
      pairs.push({ from: `templates/cursor/rules/${stack}/${f}`, to: `.cursor/rules/${f}` });
    }
  }
  if (assistant === 'claude-code') {
    // Le skill de stack est un DOSSIER dans le kit → viser le FICHIER, jamais le dossier
    // (refresh.mjs lit le chemin : un dossier donnerait EISDIR).
    pairs.push({ from: `.claude/skills/stack-${stack}/SKILL.md`, to: `.claude/skills/stack-${stack}/SKILL.md` });
  }
  return pairs;
}

// Fichiers que le scaffold ne copie pas mais CALCULE. Sans eux, `--refresh` laissait un projet
// avec les hooks git et la config MCP de sa date de création : un serveur MCP ajouté à une stack
// n'atteignait jamais un projet existant.
//   policy 'always' → écrase (100 % kit)
//   policy 'merge'  → fusionne avec l'existant (ce que l'utilisateur a ajouté lui appartient)
//   policy 'new'    → si le contenu diffère, la version fraîche part en `<fichier>.new`
export function kitOwnedGenerated(stack, assistant, { home = os.homedir(), backend } = {}) {
  const m = resolveStackManifest(stack, assistant);
  return [
    { to: '.githooks/pre-push', policy: 'always', mode: 0o755, render: () => prePushScript(m.checks.prePush) },
    {
      to: '.githooks/pre-commit', from: 'templates/hooks/pre-commit', policy: 'always', mode: 0o755,
      // Même construction qu'au scaffold : le modèle, puis la ligne de checks de la stack.
      render: (_prev, tpl) => `${tpl.replace(/\s*$/, '\n')}${preCommitCheckLine(m.checks.preCommit)}\n`,
    },
    { to: MCP_FILE(assistant), policy: 'merge', render: (prev) => mergeMcpConfig(prev, expandMcpCommands(m.mcp, home)) },
    {
      to: 'docs/RUN.md', from: `templates/run/${stack}.md`, policy: 'new',
      render: (_prev, tpl) => renderRunDoc({ template: tpl, stack, assistant, backend }),
    },
  ];
}

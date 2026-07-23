import fs from 'node:fs';
import path from 'node:path';
import { renderProjectAgentsMd } from './templates.mjs';

// Source unique du rendu AGENTS.md/CLAUDE.md — utilisée par setup ET update --refresh.
export function renderAgentsFile({ source, stack, assistant, commandsDir, learning = true }) {
  const snip = (f) => { try { return fs.readFileSync(path.join(source, `templates/agents/${f}`), 'utf8'); } catch { return ''; } };
  return renderProjectAgentsMd({
    stack, assistant, commandsDir, learning,
    loopSection: snip('loop-section.md'), designRule: snip('design-rule.md'),
    subagentsRule: snip('subagents-rule.md'), verifyRule: snip('verify-rule.md'),
    secretsRule: snip('secrets-cost-rule.md'), cssMaquetteRule: snip('css-maquette-rule.md'),
    memoryRules: snip('memory-rules.md'),
  });
}

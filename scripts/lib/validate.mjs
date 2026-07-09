import fs from 'node:fs';
import path from 'node:path';
import { resolveAssets } from './matrix.mjs';

const REQUIRED = [
  'AGENTS.md',
  'playbook/00-START.md', 'playbook/stack-saas.md', 'playbook/stack-mobile.md',
  'playbook/stack-desktop.md', 'playbook/install-tooling.md',
  'templates/commands/new-project.md',
  'templates/commands/new-feature.md',
  'templates/commands/edit-design.md',
  'scripts/setup.mjs',
];

export function validatePlaybook(root) {
  const errors = [];
  for (const f of REQUIRED) if (!fs.existsSync(path.join(root, f))) errors.push(`fichier manquant : ${f}`);
  for (const stack of ['saas', 'mobile', 'desktop', 'vitrine']) {
    for (const assistant of ['cursor', 'claude-code', 'codex']) {
      for (const c of resolveAssets(stack, assistant).copies) {
        if (!fs.existsSync(path.join(root, c.from))) errors.push(`source de copie manquante (${stack}/${assistant}) : ${c.from}`);
      }
    }
  }
  if (fs.existsSync(path.join(root, 'AGENTS.md'))) {
    const a = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    if (!a.includes('playbook/00-START.md')) errors.push('AGENTS.md ne renvoie pas vers playbook/00-START.md');
  }
  return errors;
}

// scripts/lib/gitinit.mjs — dépôt git réel dans le projet généré : les hooks (.githooks) sont
// actifs dès la première minute et l'élève a un premier point de retour arrière.
import { execFileSync } from 'node:child_process';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' });

// Si projectDir n'est pas déjà dans un dépôt : init -b main + hooksPath + add + commit initial.
// --no-verify sur le commit initial : le contenu vient du kit (déjà scanné) ; le hook pre-commit
// protège les commits SUIVANTS de l'élève. Échec non-fatal : failed[] en français, l'installeur continue.
export function initProjectGit({ projectDir, run = defaultRun }) {
  const done = [], failed = [];
  let isRepo = true;
  try { run('git', ['-C', projectDir, 'rev-parse', '--is-inside-work-tree']); }
  catch { isRepo = false; }
  if (isRepo) return { done, failed }; // dépôt existant (ou projet dans un dépôt parent) : on ne touche à rien
  try {
    run('git', ['-C', projectDir, 'init', '-b', 'main']);
    run('git', ['-C', projectDir, 'config', 'core.hooksPath', '.githooks']);
    run('git', ['-C', projectDir, 'add', '-A']);
    run('git', ['-C', projectDir, 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial']);
    done.push('dépôt git (init + hooks pre-commit actifs + commit initial)');
  } catch (e) {
    failed.push(`git init (${String(e.message).split('\n')[0]}) — configure ton identité git (git config --global user.name "Ton Nom" && git config --global user.email "toi@exemple.fr") puis relance le script`);
  }
  return { done, failed };
}

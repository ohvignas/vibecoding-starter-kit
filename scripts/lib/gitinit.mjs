// scripts/lib/gitinit.mjs — dépôt git réel dans le projet généré : les hooks (.githooks) sont
// actifs dès la première minute et l'élève a un premier point de retour arrière.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' });
const HOOKS_PATH = '.githooks';
// Deux chemins peuvent désigner le même dossier (sur macOS, /tmp est un symlink vers /private/tmp) :
// comparer les chaînes brutes ferait passer le projet pour un sous-dossier de son propre dépôt.
const memeDossier = (a, b) => {
  const vrai = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
  return vrai(a) === vrai(b);
};

// 3 sorties : done (fait), skipped (non fait, non bloquant, avec la raison ET la commande pour
// rattraper), failed (échec réel → exit 1).
//
// Si projectDir n'est pas déjà dans un dépôt : init -b main + hooksPath + add + commit initial.
// --no-verify sur le commit initial : le contenu vient du kit (déjà scanné) ; le hook pre-commit
// protège les commits SUIVANTS de l'élève. Échec non-fatal : failed[] en français, l'installeur continue.
//
// Si le dépôt existe déjà, on ne se contentait de RIEN faire : `.githooks/pre-commit` était copié
// et affiché ✅, mais git ne le lit que si `core.hooksPath` le désigne. Le scan de secrets ne
// tournait jamais et le rapport disait le contraire. Désormais on le pose — sauf dans les deux
// cas où ce serait s'approprier la config de quelqu'un d'autre, et là on le dit.
export function initProjectGit({ projectDir, run = defaultRun }) {
  const done = [], failed = [], skipped = [];
  let isRepo = true;
  try { run('git', ['-C', projectDir, 'rev-parse', '--is-inside-work-tree']); }
  catch { isRepo = false; }

  if (isRepo) {
    try {
      // `.githooks` est résolu depuis la RACINE du dépôt : dans un sous-dossier d'un dépôt parent,
      // poser la clé pointerait le mauvais dossier ET modifierait la config du parent.
      const toplevel = String(run('git', ['-C', projectDir, 'rev-parse', '--show-toplevel'])).trim();
      if (toplevel && !memeDossier(toplevel, projectDir)) {
        skipped.push({
          name: 'hooks git (pre-commit)',
          reason: `ce dossier appartient au dépôt ${toplevel} — le kit ne touche pas à sa config. Le scan de secrets ne tournera pas tant que \`core.hooksPath\` n'y est pas réglé.`,
        });
        return { done, failed, skipped };
      }
      let actuel = null;
      try { actuel = String(run('git', ['-C', projectDir, 'config', '--get', 'core.hooksPath'])).trim(); }
      catch { actuel = null; } // clé absente : git config --get sort en 1
      if (actuel && actuel !== HOOKS_PATH) {
        skipped.push({
          name: 'hooks git (pre-commit)',
          reason: `core.hooksPath vaut déjà « ${actuel} » — on ne l'écrase pas. Le scan de secrets du kit ne tournera pas ; pour l'activer : \`git -C ${projectDir} config core.hooksPath ${HOOKS_PATH}\`.`,
        });
        return { done, failed, skipped };
      }
      if (actuel !== HOOKS_PATH) run('git', ['-C', projectDir, 'config', 'core.hooksPath', HOOKS_PATH]);
      done.push('dépôt git existant : hooks pre-commit activés (core.hooksPath = .githooks)');
    } catch (e) {
      skipped.push({ name: 'hooks git (pre-commit)', reason: `git n'a pas répondu (${String(e.message).split('\n')[0]}) — active-les à la main : \`git -C ${projectDir} config core.hooksPath ${HOOKS_PATH}\`.` });
    }
    return { done, failed, skipped };
  }

  try {
    run('git', ['-C', projectDir, 'init', '-b', 'main']);
    run('git', ['-C', projectDir, 'config', 'core.hooksPath', HOOKS_PATH]);
    run('git', ['-C', projectDir, 'add', '-A']);
    run('git', ['-C', projectDir, 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial']);
    done.push('dépôt git (init + hooks pre-commit actifs + commit initial)');
  } catch (e) {
    failed.push(`git init (${String(e.message).split('\n')[0]}) — configure ton identité git (git config --global user.name "Ton Nom" && git config --global user.email "toi@exemple.fr") puis relance le script`);
  }
  return { done, failed, skipped };
}

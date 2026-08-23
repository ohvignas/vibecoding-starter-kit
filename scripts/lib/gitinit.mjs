// scripts/lib/gitinit.mjs — dépôt git réel dans le projet généré : les hooks (.githooks) sont
// actifs dès la première minute et l'élève a un premier point de retour arrière.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' });
const HOOKS_PATH = '.githooks';
// Deux chemins peuvent désigner le même dossier (sur macOS, /tmp est un symlink vers /private/tmp) :
// comparer les chaînes brutes ferait passer le projet pour un sous-dossier de son propre dépôt.
const memeDossier = (a, b) => {
  const vrai = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
  return vrai(a) === vrai(b);
};

// LES HOOKS QUE L'UTILISATEUR AVAIT DÉJÀ, et que `core.hooksPath` ÉTEINDRAIT TOUS.
//
// ⛔ CE QUE LA CLÉ FAIT VRAIMENT, mesuré. `core.hooksPath` ne s'ajoute pas à `.git/hooks/` : il le
// REMPLACE. Sur un projet ayant un `.git/hooks/pre-commit` maison (husky non installé par
// `core.hooksPath`, lefthook, un script écrit à la main), le kit posait la clé sans rien demander
// et le hook de l'utilisateur ne tournait plus jamais. Mesuré : un `pre-commit` qui affichait
// « mon hook maison » n'apparaissait plus dans la sortie du commit suivant l'installation.
// Ce n'est pas un fichier écrasé — c'est plus discret que ça, et donc pire : le fichier est
// toujours là, intact, et il ne s'exécute plus.
//
// `git rev-parse --git-path hooks` plutôt que `<projet>/.git/hooks` : dans un worktree ou un
// submodule, `.git` est un FICHIER et le vrai dossier est ailleurs. Les `*.sample` livrés par
// `git init` ne comptent pas — ils ne s'exécutent pas, il n'y a rien à y perdre.
// Tout échec (pas un dépôt, dossier illisible, `run` bouchonné) rend `[]` : « je n'ai rien vu à
// protéger », qui est aussi le cas d'un dépôt tout neuf. C'est le comportement d'avant.
// La phrase du refus — UNE phrase, qui dit ce qu'on perd et comment revenir dessus. Elle est
// partagée par les deux branches (dépôt existant / dépôt créé) : deux formulations pour la même
// décision finiraient par diverger, et l'une des deux mentirait.
const REFUS_HOOKS = (projectDir) => `tu as refusé \`core.hooksPath\` — le scan de secrets du kit ne tournera pas au commit, et rien de ta config git n'a été touché. Pour changer d'avis : \`git -C ${projectDir} config core.hooksPath ${HOOKS_PATH}\`.`;

export function hooksMaison(projectDir, run = defaultRun) {
  try {
    const rel = String(run('git', ['-C', projectDir, 'rev-parse', '--git-path', 'hooks'])).trim();
    if (!rel) return [];
    const dir = path.isAbsolute(rel) ? rel : path.join(projectDir, rel);
    return fs.readdirSync(dir).filter((n) => !n.endsWith('.sample')).sort();
  } catch { return []; }
}

// 3 sorties : done (fait), skipped (non fait, non bloquant, avec la raison ET la commande pour
// rattraper), failed (échec réel → exit 1).
//
// Si projectDir n'est pas déjà dans un dépôt : init -b main + hooksPath + add + commit initial.
// --no-verify sur le commit initial : le contenu vient du kit (déjà scanné) ; le hook pre-commit
// protège les commits SUIVANTS de l'élève. Échec non-fatal : failed[] en français, l'installeur continue.
//
// Si le dépôt existe déjà, on ne se contentait de RIEN faire : `.githooks/pre-commit` était copié
// et affiché ✅, mais git ne le lit que si `core.hooksPath` le désigne. Le scan de secrets ne
// tournait jamais et le rapport disait le contraire. Désormais on le pose — sauf dans les TROIS
// cas où ce serait s'approprier la config de quelqu'un d'autre, et là on le dit.
//
// `accordHooks` — la réponse de l'utilisateur à « j'active le scan de secrets ? », et elle a
// TROIS valeurs, pas deux :
//   · `true`      → il a dit oui : on pose, même s'il avait ses propres hooks (il les a vus nommés) ;
//   · `false`     → il a dit non : on ne pose nulle part, et on le dit en une phrase ;
//   · `undefined` → personne n'a été consulté. On pose SI rien n'est éteint au passage — c'est le
//                   cas du parcours neuf (dépôt tout juste `init`, `.git/hooks/` sans autre chose
//                   que des `*.sample`), qui ne bouge donc pas d'un octet.
export function initProjectGit({ projectDir, run = defaultRun, accordHooks }) {
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
      if (accordHooks === false) {
        skipped.push({ name: 'hooks git (pre-commit)', reason: REFUS_HOOKS(projectDir) });
        return { done, failed, skipped };
      }
      // Le 3ᵉ cas : il a SES hooks, et personne ne lui a demandé s'il acceptait de les perdre.
      const maison = hooksMaison(projectDir, run);
      if (maison.length && accordHooks !== true) {
        skipped.push({
          name: 'hooks git (pre-commit)',
          reason: `ton dépôt a déjà ses propres hooks (${maison.join(', ')}) et \`core.hooksPath\` les éteindrait TOUS — on ne le fait pas sans ton accord. Le scan de secrets du kit ne tournera pas ; pour l'activer (et désactiver les tiens) : \`git -C ${projectDir} config core.hooksPath ${HOOKS_PATH}\`.`,
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
    // Un refus vaut PARTOUT : refuser le scan de secrets puis se le voir poser par l'autre branche
    // ferait de la question un décor. Le dépôt, lui, est créé — c'est le point de retour arrière.
    if (accordHooks !== false) run('git', ['-C', projectDir, 'config', 'core.hooksPath', HOOKS_PATH]);
    run('git', ['-C', projectDir, 'add', '-A']);
    run('git', ['-C', projectDir, 'commit', '--no-verify', '-m', 'chore: environnement vibecoding initial']);
    if (accordHooks === false) skipped.push({ name: 'hooks git (pre-commit)', reason: REFUS_HOOKS(projectDir) });
    done.push(accordHooks === false
      ? 'dépôt git (init + commit initial) — hooks pre-commit NON activés, tu les as refusés'
      : 'dépôt git (init + hooks pre-commit actifs + commit initial)');
  } catch (e) {
    failed.push(`git init (${String(e.message).split('\n')[0]}) — configure ton identité git (git config --global user.name "Ton Nom" && git config --global user.email "toi@exemple.fr") puis relance le script`);
  }
  return { done, failed, skipped };
}

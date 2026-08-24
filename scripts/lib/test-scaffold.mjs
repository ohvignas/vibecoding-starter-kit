// Lance `scripts/setup.mjs` POUR DE VRAI depuis un test, et fait parler l'échec.
//
// POURQUOI CE MODULE EXISTE. `setup.mjs` imprime son rapport — et donc la LISTE DE SES ÉCHECS —
// sur STDOUT. `execFileSync`, lui, ne met que STDERR dans le message de l'exception qu'il jette.
// Un test qui l'appelle nu échoue donc sur « Command failed: node setup.mjs … » et ne dit JAMAIS
// ce qui a échoué. Mesuré sur la CI de ce dépôt : 12 tests rouges, tout le stderr disponible
// tenant en une ligne (« Cloning into '/tmp/vs-clone-…' »), et aucun moyen de savoir pourquoi
// sans relancer à la main sur la machine du runner.
//
// C'est la même famille de défaut que ce dépôt traque partout ailleurs : un instrument de mesure
// incapable de rapporter la raison de son propre échec.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Rend STDOUT en cas de succès. En cas d'échec, jette une erreur qui PORTE le rapport.
export function scaffold(argv, options = {}) {
  const cmd = [path.resolve('scripts/setup.mjs'), ...argv];
  try {
    return String(execFileSync(process.execPath, cmd, { stdio: 'pipe', ...options }));
  } catch (e) {
    throw new Error([
      `setup.mjs a échoué (exit ${e.status ?? '?'})`,
      `argv   : ${argv.join(' ')}`,
      '--- stdout (le rapport, c\'est ici que setup.mjs liste ses échecs) ---',
      String(e.stdout ?? '(vide)'),
      '--- stderr ---',
      String(e.stderr ?? '(vide)'),
    ].join('\n'));
  }
}

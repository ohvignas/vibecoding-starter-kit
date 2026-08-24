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

// UNE IDENTITÉ GIT, PARCE QUE LE SCAFFOLD COMMITTE. `setup.mjs` fait `git init` puis un commit
// initial (le premier point de retour arrière de l'utilisateur). Une machine sans `user.name`/
// `user.email` — tout runner de CI, et tout poste où git vient d'être installé — voit ce commit
// refusé, le kit le range en échec, et le scaffold sort en 1. Le kit a RAISON de le dire : il
// imprime la commande exacte à taper. C'est le TEST qui a tort de scaffolder sans identité.
//
// Mesuré sur la CI de ce dépôt : 12 tests rouges pour cette seule raison, verts en local — macOS
// fabrique une identité de repli à partir du compte et du nom d'hôte, Linux refuse. Une
// reproduction locale qui se contente de vider `--global user.email` ne voit donc RIEN.
//
// L'identité passe par l'ENVIRONNEMENT du processus fils : aucune config git de la machine n'est
// lue ni écrite.
export const IDENTITE_GIT = {
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};

// Rend STDOUT en cas de succès. En cas d'échec, jette une erreur qui PORTE le rapport.
export function scaffold(argv, options = {}) {
  const cmd = [path.resolve('scripts/setup.mjs'), ...argv];
  try {
    return String(execFileSync(process.execPath, cmd, {
      stdio: 'pipe', ...options,
      env: { ...process.env, ...IDENTITE_GIT, ...(options.env ?? {}) },
    }));
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

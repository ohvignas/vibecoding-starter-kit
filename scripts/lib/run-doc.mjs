// scripts/lib/run-doc.mjs — SOURCE UNIQUE de `docs/RUN.md` : le modèle de la stack, plus les
// deux notes que le scaffold y ajoutait à deux endroits différents (la note « backend en local »
// dans setup.mjs, la note « Codex n'a pas de hook d'édition » dans environment.mjs).
// Un seul rendu, sinon `--refresh` ne peut pas reproduire ce que le scaffold a écrit et
// re-signalerait le fichier comme modifié à chaque passage.
import { renderBackendNote } from './wizard.mjs';

export const NOTE_CODEX = "> Codex n'a pas de hook d'édition : lance `npm run typecheck` après tes modifications.";

export function renderRunDoc({ template, stack, assistant, backend }) {
  let out = template;
  const backendNote = renderBackendNote(stack, backend);
  if (backendNote) out = `${backendNote}\n${out}`;
  if (assistant === 'codex') out = `${NOTE_CODEX}\n\n${out}`;
  return out;
}

// ── LE `docs/RUN.md` D'UN PROJET ADOPTÉ — ÉCRIT D'OBSERVATION, JAMAIS D'UN MODÈLE ──────────────
//
// ⛔ Le défaut mesuré (spec, décision 4) : `templates/run/<stack>.md` a produit « Lancer l'app —
// SaaS (Convex + TanStack Start) · `npx convex dev` » dans un projet qui n'avait ni Convex ni
// TanStack. Le SEUL fichier qu'un débutant ouvre pour lancer son app lui mentait, et le mensonge
// avait l'air d'une consigne du kit.
//
// Sur un projet existant, le kit ne connaît RIEN de la stack : c'est le sens de `aucune`. Ce qu'il
// peut faire, c'est LIRE — les `scripts` du `package.json`, le lockfile. Il relève, il attribue à
// la source, et ce qu'il n'a pas trouvé, il le DIT. Il n'y a aucun modèle derrière ce rendu.

// Le gestionnaire de paquets se DÉDUIT du lockfile présent sur le disque : c'est une observation,
// pas une préférence. Écrire `npm run dev` dans un projet pnpm, c'est la première commande que
// l'utilisateur copie — et elle refait son lockfile.
export const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
];

// PUR : ne lit pas le disque. `pkg` = le contenu BRUT du package.json (ou null s'il n'y en a pas),
// `fichiers` = les entrées observées à la racine. Séparer la lecture du rendu est ce qui rend les
// cinq cas (absent · illisible · sans scripts · avec scripts · lockfile) testables sans tmpdir.
export function renderRunDocObserve({ pkg = null, fichiers = [] } = {}) {
  const lock = LOCKFILES.find(([f]) => fichiers.includes(f));
  const runner = lock ? lock[1] : 'npm';
  const entete = [
    '# Lancer et vérifier ce projet',
    '',
    '> **Relevé dans ton projet, pas deviné.** Le kit ne connaît pas ta stack : il a lu ton',
    '> `package.json` et les fichiers de la racine, et il n\'a écrit ici que ce qu\'il y a trouvé.',
    '> Ce qu\'il n\'a pas su déterminer est dit tel quel, plus bas — il ne le remplace pas par une',
    '> supposition. Complète, corrige, c\'est ton fichier : le kit ne le régénère jamais.',
    '',
  ];

  // Les trois façons de n'avoir rien à relever. Chacune dit CE QUI A ÉTÉ CHERCHÉ — sans quoi
  // l'utilisateur ne peut pas savoir si le kit a mal cherché ou si son projet est comme ça.
  let relevees = null;
  let constat;
  if (pkg === null) {
    constat = ['## Les commandes de ce projet', '',
      'Je n\'ai **pas trouvé de `package.json`** à la racine : je n\'ai donc relevé **aucune commande**,',
      'et je n\'en invente pas. Si ce projet se lance autrement (Makefile, Docker, un script shell, un',
      'autre langage), écris ici la commande exacte — c\'est la première chose que l\'IA lira.'];
  } else {
    let parsed = null;
    try { parsed = JSON.parse(pkg); } catch { parsed = undefined; }
    if (parsed === undefined) {
      constat = ['## Les commandes de ce projet', '',
        'J\'ai trouvé un `package.json`, mais **il n\'est pas du JSON valide** : je n\'ai rien pu en relever,',
        'et je n\'invente pas de commande. Répare-le, puis écris les commandes ici.'];
    } else {
      const scripts = (parsed && typeof parsed.scripts === 'object' && parsed.scripts) || {};
      const noms = Object.keys(scripts);
      if (!noms.length) {
        constat = ['## Les commandes de ce projet', '',
          'J\'ai trouvé le `package.json`, mais **il n\'a aucune entrée `scripts`** : rien à relever.',
          'Écris ici la commande qui lance ce projet, telle que tu la tapes.'];
      } else {
        relevees = noms;
        constat = ['## Les commandes de ce projet', '',
          `Relevées une à une dans les \`scripts\` de \`package.json\`${lock ? ` · lockfile observé : \`${lock[0]}\` → **${runner}**` : ' · aucun lockfile observé → **npm** par défaut, corrige si ce n\'est pas le tien'}.`,
          '',
          '| Ce que tu tapes | Ce que ça lance vraiment |',
          '| --- | --- |',
          ...noms.map((n) => `| \`${runner} run ${n}\` | \`${String(scripts[n]).replace(/\|/g, '\\|')}\` |`)];
      }
    }
  }

  // Ce que le kit N'A PAS pu déterminer. Cette section n'est pas une politesse : un `scripts` de
  // douze entrées ne dit pas laquelle lance l'app, laquelle teste, ni ce qu'il faut avant. Sans
  // cette liste écrite, c'est l'IA qui comble — et elle comble en devinant.
  const trous = ['## Ce que le kit n\'a PAS pu déterminer', ''];
  if (relevees) {
    trous.push(
      '- **Laquelle de ces commandes lance l\'app** pour la voir à l\'écran, et sur quelle adresse.',
      '- **Laquelle vérifie** (tests, types, lint) — et laquelle doit passer avant un commit.',
    );
  } else {
    trous.push('- **Comment on lance ce projet**, et comment on le vérifie : rien n\'a pu être relevé.');
  }
  trous.push(
    '- **Ce qu\'il faut AVANT** : dépendances installées, variables d\'environnement, base de données,',
    '  service tiers à démarrer. Rien de tout ça ne se lit dans un `package.json`.',
    '',
    'Réponds à ces points ici, en une ligne chacun. Tant qu\'ils sont ouverts, l\'IA n\'a pas de quoi',
    'lancer ton app : elle doit te le dire plutôt que d\'essayer une commande au hasard.',
  );

  const pourLIA = ['---', '',
    '**Pour l\'IA** — ce fichier est une observation datée du jour de l\'installation, pas un contrat.',
    'Si une commande d\'ici échoue, ne la remplace pas par une autre au jugé : dis laquelle a échoué,',
    'avec sa sortie, et demande. Quand tu apprends la bonne, corrige-la ICI, elle servira la fois suivante.',
  ];

  return [...entete, ...constat, '', ...trous, '', ...pourLIA, ''].join('\n');
}

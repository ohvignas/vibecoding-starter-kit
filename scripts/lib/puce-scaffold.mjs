// scripts/lib/puce-scaffold.mjs
// LA PUCE D'UNE STACK DANS `07-scaffold.md`, ET LES BLOCS DE CODE QU'ELLE PORTE.
//
// Trois gardes lisent ce fichier, et chacun s'était trompé de périmètre à sa façon :
//   · V2bis (cablage-stacks) lisait la puce vitrine — mais en INTERPRÉTANT sa prose ;
//   · le garde SEO (vitrine-build-time) ne lisait PAS ce fichier du tout : son corpus venait du
//     CHEMIN (`/vitrine/`), et `07-scaffold.md` ne porte « vitrine » que dans son contenu. Un
//     `useQuery` ajouté à la puce vitrine passait donc, sur LE template destiné à `site/` ;
//   · runbook-executable jugeait `find(l => l.includes('create-convex'))` — la PREMIÈRE ligne du
//     runbook entier. Deux stacks citent maintenant `create-convex` : la puce vitrine est passée
//     devant, et les deux gardes de `saas` ne protégeaient plus rien.
// D'où cette source unique : on découpe par PUCE DE STACK, et chaque garde juge la sienne.
import fs from 'node:fs';
import path from 'node:path';

export const SCAFFOLD_MD = 'templates/commands/new-project/07-scaffold.md';
const ENTETE = /^\s*-\s+\*\*(saas|desktop|mobile|vitrine)\*\*/;

// Toutes les puces de stack du runbook de scaffold : { stack → lignes }. Une puce va de son
// en-tête `- **<stack>**` jusqu'à l'en-tête suivant (ses lignes de continuation — ⚠️, sous-items
// numérotés, blocs de code — en font partie).
export function pucesDeScaffold(racine) {
  const lignes = fs.readFileSync(path.join(racine, SCAFFOLD_MD), 'utf8').split('\n');
  const indent = (l) => l.length - l.trimStart().length;
  const debuts = lignes.flatMap((l, i) => (ENTETE.test(l) ? [[l.match(ENTETE)[1], i]] : []));
  return Object.fromEntries(debuts.map(([stack, i], n) => {
    // ⚠️ UNE PUCE S'ARRÊTE AUSSI QUAND LA LISTE S'ARRÊTE. Sans cette borne, la DERNIÈRE puce
    // (mobile) avalait toute la fin du fichier — les items 2 à 5 de « Mise en place ». Mesuré :
    // retirer `--yes` de `create-expo-app` laissait le garde VERT, parce que le `--yes` du
    // `shadcn apply` d'un item suivant tombait dans sa puce. Une borne haute sans borne basse est
    // un découpage qui ment.
    const suivante = lignes.slice(i + 1).findIndex((l) => l.trim() && indent(l) < indent(lignes[i]));
    const fins = [debuts[n + 1]?.[1], suivante < 0 ? undefined : i + 1 + suivante].filter((v) => v !== undefined);
    return [stack, lignes.slice(i, fins.length ? Math.min(...fins) : lignes.length)];
  }));
}

export function puceDeStack(racine, stack) {
  const p = pucesDeScaffold(racine)[stack];
  if (!p) throw new Error(`${SCAFFOLD_MD} n'a plus de puce \`- **${stack}**\``);
  return p;
}

// LES BLOCS DE CODE DE LA PUCE, ET LEUR CONVENTION : la première ligne de chaque bloc est un
// commentaire qui NOMME le fichier que le bloc produit (`// package.json`, `# biome.json`).
//
// ⛔ POURQUOI DES BLOCS ET PLUS DE LA PROSE. Trois fois de suite, un garde qui cherchait dans la
// prose « est-ce que cette puce POSE ce fichier ? » a été satisfait par une puce qui l'INTERDIT :
// « ne crée surtout PAS… », puis, une fois les mots `ne`/`pas`/`jamais`/`aucun` bannis,
// « ⛔ Évite de créer… ». Une liste noire de mots ne clôt pas une classe : il reste une infinité
// de façons de nier en français. On ne demande donc plus rien à la prose. Le contenu à écrire est
// un ARTEFACT — du JSON qu'on parse, une commande qu'on lit — et c'est lui qui fait foi.
//
// CE QUE ÇA NE VOIT PAS, et il faut le dire : une prose qui CONTREDIRAIT le bloc juste au-dessus.
// C'est le plancher de ce garde. Il est bien plus haut que le précédent : contredire un fichier
// dont le contenu est écrit juste en dessous est une incohérence visible à l'œil nu, là où « ⛔
// Évite de créer package.json » se lisait comme une consigne normale.
export function blocsDeLaPuce(puce) {
  const blocs = [];
  let courant = null;
  for (const brute of puce) {
    const l = brute.trim();
    if (l.startsWith('```')) {
      if (courant) { blocs.push(courant); courant = null; }
      else courant = { langue: l.slice(3).trim(), lignes: [] };
      continue;
    }
    if (courant) courant.lignes.push(l);
  }
  return blocs.map((b) => {
    const fichier = b.lignes[0]?.match(/^(?:\/\/|#)\s*([\w@./-]+)/)?.[1] ?? null;
    return { ...b, fichier, corps: b.lignes.join('\n') };
  });
}

// Le corps JSON d'un bloc, commentaires `//` retirés. `null` si ce n'est pas du JSON lisible :
// un bloc illisible ne doit pas faire planter le garde, il doit le faire ROUGIR avec son nom.
export function jsonDuBloc(bloc) {
  try {
    return JSON.parse(bloc.lignes.filter((l) => !l.startsWith('//')).join('\n'));
  } catch { return null; }
}

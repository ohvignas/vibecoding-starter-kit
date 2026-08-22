// Bloc « managé » dans AGENTS.md/CLAUDE.md : régénéré par `update --refresh`.
// Tout ce qui est HORS des marqueurs appartient à l'utilisateur et n'est jamais touché.
export const MARK_START = '<!-- vibecoding:start — bloc généré, régénéré par `node <kit>/scripts/update.mjs --refresh` ; n\'édite pas ici -->';
export const MARK_END = '<!-- vibecoding:end -->';
// Détection par PRÉFIXE stable (pas la chaîne entière) : le texte décoré de MARK_START peut
// dériver entre versions du kit. Repérer la zone via ce préfixe garde `--refresh` idempotent
// (remplacement EN PLACE), sinon un marqueur d'ancienne version ne matcherait plus → duplication.
export const MARK_START_PREFIX = '<!-- vibecoding:start';

export function wrapManaged(body) {
  return `${MARK_START}\n${body}\n${MARK_END}`;
}

// Extrait le bloc managé (marqueurs inclus). null si absent/malformé.
export function extractManaged(content) {
  const s = content.indexOf(MARK_START_PREFIX);
  const e = content.indexOf(MARK_END);
  if (s === -1 || e === -1 || e < s) return null;
  return content.slice(s, e + MARK_END.length);
}

// Numéro de ligne (1-based) d'un index de caractère — pour NOMMER la ligne fautive : sans elle,
// le message envoie l'utilisateur chercher un marqueur dans un fichier de 200 lignes.
const ligneDe = (contenu, index) => contenu.slice(0, index).split('\n').length;

// TOUTES les positions d'une chaîne, pas la première. C'est la correction de fond du garde
// ci-dessous : `indexOf` seul ne peut pas distinguer « une paire » de « trois marqueurs dont deux
// tombent par hasard dans le bon ordre » — et c'est exactement la forme du cas qui perd du texte.
const positions = (contenu, aiguille) => {
  const out = [];
  for (let i = contenu.indexOf(aiguille); i !== -1; i = contenu.indexOf(aiguille, i + aiguille.length)) out.push(i);
  return out;
};

// ── LE GARDE DES MARQUEURS DÉPAREILLÉS ────────────────────────────────────────────────────────
//
// `indexOf` ne cherche pas une PAIRE : il cherche deux chaînes indépendantes, et garde la PREMIÈRE
// de chacune. Un fichier perso qui contient une occurrence LITTÉRALE de « <!-- vibecoding:start »
// — le cas réel : l'utilisateur a recopié des morceaux d'un `AGENTS.md.new` — fait mordre `s` dans
// SON texte pendant que `e` trouve le `end` du vrai bloc, plus bas. Le `slice` efface l'intervalle.
//
// ⛔ POURQUOI ON COMPTE, ET PAS « start SANS end ». Le brief de cette tâche décrivait le garde
// comme « `existing` contient MARK_START_PREFIX **sans** MARK_END (ou l'inverse) → jeter ». Écrit
// comme ça, IL NE VOIT PAS LE CAS QUI PERD DU TEXTE — mesuré, test rouge à l'appui : le montage
// fautif a bien un start ET un end, dans le bon ordre. Il en a juste DEUX starts. Un garde qui ne
// regarde que la présence laissait donc passer précisément la perte qu'il devait empêcher.
//
// MESURÉ (6 lignes ; marqueur perso ligne 3, vrai bloc lignes 5-7) :
//   · « CE PARAGRAPHE EST À MOI » (ligne 4) → SUPPRIMÉ ;
//   · « pnpm, pas npm. » (ligne 2) → gardé — la perte est PARTIELLE, donc invisible à tout
//     contrôle qui se contenterait de « le fichier n'est pas vide » ;
//   · et le fichier ressort DÉFINITIVEMENT abîmé : le marqueur du kit se retrouve collé au milieu
//     d'une phrase de l'utilisateur, donc la fusion suivante recoupera au même mauvais endroit.
//
// La règle est donc : UNE paire, exactement — ou aucun marqueur du tout (migration douce). Tout le
// reste, on refuse. Le dire coûte une relance ; le deviner coûte du texte que personne ne récupère.
export function erreurMarqueurs(existing, chemin = 'le fichier') {
  const debuts = positions(existing, MARK_START_PREFIX);
  const fins = positions(existing, MARK_END);
  if (!debuts.length && !fins.length) return null; // aucun marqueur : migration douce, cas normal
  if (debuts.length === 1 && fins.length === 1 && fins[0] > debuts[0]) return null; // le cas nominal

  const lignes = (idx) => idx.map((i) => ligneDe(existing, i)).join(', ');
  const compte = (n, quoi, idx) => `${n} « ${quoi} » (ligne${n > 1 ? 's' : ''} ${lignes(idx)})`;
  const premiere = Math.min(...[...debuts, ...fins]);
  const detail = [];
  if (debuts.length) detail.push(compte(debuts.length, MARK_START_PREFIX, debuts));
  else detail.push(`aucun « ${MARK_START_PREFIX} »`);
  if (fins.length) detail.push(compte(fins.length, MARK_END, fins));
  else detail.push(`aucun « ${MARK_END} »`);

  const consequence = debuts.length && fins.length && fins[0] > debuts[0]
    // Le cas qui perd : la fusion couperait de la PREMIÈRE ouverture à la PREMIÈRE fermeture.
    ? `Fusionner ici effacerait tout le texte des lignes ${ligneDe(existing, debuts[0])} à ${ligneDe(existing, fins[0])} — celui du kit ET le tien.`
    : 'Fusionner ici laisserait des marqueurs dépareillés dans le fichier : la fusion SUIVANTE couperait au mauvais endroit.';

  return [
    `${chemin}:${ligneDe(existing, premiere)} — marqueurs vibecoding DÉPAREILLÉS : ${detail.join(' et ')}.`,
    'Une zone gérée par le kit, c\'est UNE paire et une seule.',
    consequence,
    `Rien n'a été écrit dans ${chemin}. Ouvre-le, retire (ou referme) le marqueur en trop, puis relance —`,
    'tout ce qui est HORS des marqueurs t\'appartient et n\'est jamais touché.',
  ].join('\n');
}

// Fusionne : remplace le bloc managé de `existing` par celui de `fresh`.
// - marqueurs présents dans existing → remplacement EN PLACE (zone utilisateur préservée).
// - absents → migration douce : bloc frais en tête, ancien contenu conservé dessous.
// - marqueurs dépareillés → on JETTE (voir `erreurMarqueurs`). `chemin` sert au message : le
//   projet en a DEUX (AGENTS.md, CLAUDE.md), un refus qui ne dit pas lequel ne sert à rien.
export function mergeManagedSection(existing, fresh, chemin) {
  const freshBlock = extractManaged(fresh);
  if (!freshBlock) throw new Error('Contenu frais sans marqueurs vibecoding.');
  const faute = erreurMarqueurs(existing, chemin);
  if (faute) throw new Error(faute);
  const s = existing.indexOf(MARK_START_PREFIX);
  const e = existing.indexOf(MARK_END);
  if (s !== -1 && e !== -1 && e > s) {
    return existing.slice(0, s) + freshBlock + existing.slice(e + MARK_END.length);
  }
  return `${freshBlock}\n\n${existing}`;
}

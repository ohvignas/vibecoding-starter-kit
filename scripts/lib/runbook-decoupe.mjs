// scripts/lib/runbook-decoupe.mjs — CE QUI FAIT QU'UN RUNBOOK DÉCOUPÉ VAUT ENCORE LE RUNBOOK
// D'UN SEUL BLOC. Un runbook trop long se découpe en étapes (`commands-list.mjs` dit OÙ elles
// vivent) ; deux propriétés, et deux seulement, font que le découpage n'a rien coûté :
//   1. NON-PERTE — chaque ligne de contenu du fichier d'avant se retrouve dans l'union
//      « entrée + étapes ». Découper déplace du texte, ça n'en retire pas.
//   2. CHECKLIST — l'entrée cite chaque étape du disque, une fois, dans l'ordre, avec sa SORTIE.
//      Chez Codex une étape est un fichier qu'un humain ouvre : rien ne l'empêche d'en sauter un,
//      sauf cette checklist.
// Ces deux contrôles se prouvent MOT POUR MOT de la même façon pour les trois runbooks découpés.
// D'où ce fichier : une troisième copie du même corps de test aurait divergé (c'est la leçon
// entière de `duplications.test.mjs`). Ce qui reste PROPRE à chaque runbook — l'inventaire de son
// fichier d'avant, le nombre de ses étapes — reste dans son fichier de test.
//
// Forme retenue : chaque fonction rend une LISTE d'erreurs (idiome de `validate-commands.mjs`),
// jamais une exception — l'appelant en fait un `deepEqual([])` et voit toutes les fautes d'un coup.
import fs from 'node:fs';
import path from 'node:path';
import { cheminRunbook, etapesDuRunbook, fichiersDuRunbook } from './commands-list.mjs';

const lire = (kitRoot, rel) => fs.readFileSync(path.join(kitRoot, rel), 'utf8');

// 1. NON-PERTE. `lignesAvant` est l'inventaire VERBATIM du fichier d'avant le découpage, extrait
// avant le commit qui le découpe — la référence n'existe plus nulle part ailleurs après.
// POURQUOI LA LIGNE ENTIÈRE, et pas une liste de marqueurs : une consigne sans backtick ni chemin
// (« Ne saute aucune section : ce que le PRD ne dit pas, la roadmap ne le construira pas. ») peut
// disparaître sans qu'aucun marqueur ne manque. C'est le défaut qui a fait échouer les revues des
// lots B et C. On exige donc la ligne, à la trime près, dans l'union entrée + étapes.
// `minFichiers` est la GARDE DE MONTAGE : sans elle, un dossier d'étapes vidé rendrait le contrôle
// vert à vide sur un corpus amputé.
export function erreursNonPerte(kitRoot, cmd, lignesAvant, minFichiers) {
  const fichiers = fichiersDuRunbook(kitRoot, cmd);
  if (fichiers.length < minFichiers) {
    return [`montage : ${fichiers.length} fichier(s) lu(s) pour /${cmd}, ${minFichiers} attendus au moins`
      + ' — l\'union entrée + étapes est vide ou incomplète, la non-perte ne prouve rien'];
  }
  const vues = new Set();
  for (const f of fichiers) for (const l of lire(kitRoot, f).split('\n')) vues.add(l.trim());
  return lignesAvant.filter((l) => !vues.has(l)).map((l) => `  ${l.slice(0, 110)}${l.length > 110 ? '…' : ''}`);
}

// 2. CHECKLIST. Une étape livrée mais jamais citée par l'entrée est invisible ; une étape citée
// sans sa sortie laisse l'utilisateur sans rien à quoi reconnaître qu'elle est finie.
// L'entrée doit aussi rester COURTE : c'est tout l'objet du découpage.
export function erreursChecklist(kitRoot, cmd, maxLignesEntree) {
  const entree = lire(kitRoot, cheminRunbook(cmd));
  const etapes = etapesDuRunbook(kitRoot, cmd);
  if (!etapes.length) return [`montage : aucune étape de /${cmd} sur le disque, la checklist ne prouve rien`];

  const errors = [];
  const lignes = entree.split('\n');
  const positions = [];
  for (const e of etapes) {
    const occurrences = [...entree.matchAll(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
    if (occurrences.length !== 1) {
      errors.push(`l'entrée cite « ${e} » ${occurrences.length} fois — il en faut exactement une`);
      continue;
    }
    positions.push(occurrences[0].index);
    const ligne = lignes.find((l) => l.includes(e));
    if (!/→/.test(ligne)) errors.push(`l'entrée cite « ${e} » sans dire ce qu'elle produit`);
    if (!/^- \[ \]/.test(ligne)) errors.push(`« ${e} » n'est pas une case à cocher : l'entrée est une checklist, pas un sommaire`);
    if (ligne.length <= e.length + 30) errors.push(`« ${e} » : sortie attendue trop maigre — ${ligne}`);
  }
  if (positions.length === etapes.length && positions.some((p, i) => i > 0 && p < positions[i - 1])) {
    errors.push('l\'ordre des étapes dans l\'entrée n\'est pas celui de leurs numéros');
  }
  if (lignes.length > maxLignesEntree) errors.push(`l'entrée fait ${lignes.length} lignes (${maxLignesEntree} au plus) : le mur revient`);
  return errors;
}

// 3. `$ARGUMENTS` ne se substitue que dans le fichier chargé COMME COMMANDE. Dans une étape citée
// par son chemin, c'est du texte littéral — et le repli « si vide, demande à l'utilisateur » perd
// son déclencheur. Il doit donc rester dans l'entrée, et nulle part ailleurs.
export function erreursArguments(kitRoot, cmd) {
  const errors = [];
  if (!lire(kitRoot, cheminRunbook(cmd)).includes('$ARGUMENTS')) {
    errors.push(`${cheminRunbook(cmd)} : l'entrée ne prend plus son argument`);
  }
  for (const f of fichiersDuRunbook(kitRoot, cmd).slice(1)) {
    if (lire(kitRoot, f).includes('$ARGUMENTS')) {
      errors.push(`${f} : une étape n'est pas chargée comme commande, « $ARGUMENTS » y resterait littéral`);
    }
  }
  return errors;
}

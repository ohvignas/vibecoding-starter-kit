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
import { COMMANDS, cheminRunbook, dossierEtapes, etapesDuRunbook, fichiersDuRunbook } from './commands-list.mjs';

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

// 3. RENVOI VIVANT — l'AUTRE SENS DE LA FLÈCHE, et le seul que l'utilisateur subisse.
// `erreursChecklist` part des étapes DU DISQUE et vérifie que l'entrée les cite : elle ne voit
// donc jamais un chemin CITÉ que rien ne porte. L'entrée peut renvoyer vers `new-projet/02-prd.md`
// (dossier mal orthographié) ou vers une 10ᵉ étape jamais livrée, et la checklist reste verte —
// mesuré. Or c'est exactement ce que l'item 7 de `/doctor` rendra en ✗ chez l'utilisateur, pour un
// fichier que le kit n'a jamais posé : la commande démarre, puis renvoie dans le vide dès sa
// première case.
//
// DEUX FORMES DE RENVOI, toutes deux nées du découpage, et elles ne se lisent pas pareil :
//   · `new-project/02-prd.md` — le chemin depuis le dossier de commandes. C'est ce qu'écrit la
//     CHECKLIST D'ENTRÉE, le seul renvoi qu'un débutant ouvre à la main. Le dossier compte autant
//     que le fichier : `new-projet/` mène nulle part même si `02-prd.md` existe.
//   · `07-scaffold.md` — le seul fichier. Écrit dans un runbook DÉCOUPÉ (une étape qui en rappelle
//     une autre), il se lit depuis le dossier de ce runbook : il ne peut viser qu'une étape du
//     MÊME runbook. Écrit AILLEURS — `templates/prd/PRD.md`, `templates/env/*.env.example`,
//     `/edit-design`, qui n'a aucun dossier à côté de lui — il ne désigne qu'« l'étape du kit qui
//     porte ce nom », et la prose voisine dit de quel runbook (« `/new-project`, étape … »). On
//     n'y exige donc que l'existence : réclamer la forme préfixée serait juger une formulation,
//     ce que ce dépôt refuse partout ailleurs.
const RENVOI_ETAPE = /`(?:([\w-]+)\/)?(\d\d-[\w-]+\.md)`/g;

export function erreursRenvois(kitRoot, fichiers) {
  const parRunbook = new Map(COMMANDS.map((c) => [c, new Set(etapesDuRunbook(kitRoot, c))]));
  const toutes = new Set([...parRunbook.values()].flatMap((s) => [...s]));
  // GARDES DE MONTAGE. Sans étape livrée, « le renvoi mène quelque part » est vrai à vide ; sans
  // fichier balayé, le contrôle ne lit rien. Les deux états sont ceux qu'aurait ce garde si le
  // dossier d'étapes cessait d'être livré — l'accident même qu'il surveille.
  if (toutes.size === 0) return ['montage : aucune étape dans le kit — « le renvoi mène quelque part » serait vrai à vide'];
  if (!fichiers.length) return ['montage : aucun fichier balayé — ce garde ne lit rien'];

  const errors = [];
  for (const f of fichiers) {
    // Le runbook DÉCOUPÉ auquel ce fichier appartient, s'il y en a un. Un runbook d'un bloc n'a
    // pas de dossier à côté de lui : un renvoi nu y vaut exactement ce qu'il vaut dans un template
    // livré ailleurs, donc `proprietaire` reste nul.
    const proprietaire = COMMANDS.find((c) => parRunbook.get(c).size > 0
      && (f === cheminRunbook(c) || f.startsWith(`${dossierEtapes(c)}/`))) ?? null;
    lire(kitRoot, f).split('\n').forEach((l, i) => {
      for (const [, cmd, etape] of l.matchAll(RENVOI_ETAPE)) {
        const ou = `  ${f}:${i + 1}`;
        if (cmd !== undefined) {
          if (!parRunbook.has(cmd)) errors.push(`${ou} — « ${cmd}/${etape} » : « ${cmd} » n'est pas un runbook du kit`);
          else if (!parRunbook.get(cmd).has(etape)) errors.push(`${ou} — « ${cmd}/${etape} » : /${cmd} ne livre pas cette étape`);
        } else if (proprietaire) {
          if (!parRunbook.get(proprietaire).has(etape)) {
            errors.push(`${ou} — « ${etape} » : renvoi nu lu depuis le dossier de /${proprietaire}, qui ne livre pas cette étape`);
          }
        } else if (!toutes.has(etape)) {
          errors.push(`${ou} — « ${etape} » n'est une étape d'aucun runbook`);
        }
      }
    });
  }
  return errors;
}

// 4. `$ARGUMENTS` ne se substitue que dans le fichier chargé COMME COMMANDE. Dans une étape citée
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

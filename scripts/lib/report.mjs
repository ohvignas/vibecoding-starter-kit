import { refCommande } from './commands-list.mjs';

// Rapport à 4 états : créé (✅) / conservé (•, déjà présent — jamais écrasé) / gardé MALGRÉ
// `--force` (🔒) / échec (❌).
//
// ⛔ POURQUOI UN QUATRIÈME BAC, ET PAS UNE LIGNE DE PLUS DANS « conservé ». Le titre de chaque bac
// annonce LA RAISON de ce qu'il contient. Mesuré sur un `--adopt --force` réel : les deux seuls
// survivants (`docs/ETAT-DES-LIEUX.md`, `docs/RUN.md`) s'affichaient sous « Conservé (déjà
// présent…) », titre inchangé — alors que les 23 AUTRES fichiers « déjà présents » du même run
// venaient d'être écrasés. « Déjà présent » n'était donc pas leur raison : c'était la promesse du
// kit de ne jamais les régénérer. Les deux lignes qui avaient écarté le drapeau de l'utilisateur
// s'affichaient exactement comme si le drapeau n'avait jamais été tapé.
// Ni vrai, ni silencieux : FAUX — la pire des trois formes ici. Une raison différente veut un bac
// différent ; l'ajouter à la ligne aurait laissé le titre mentir au-dessus.
export function formatReport({ project, stack, assistant, done, kept = [], promesse = [], inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nCréé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (kept.length) { L.push('\nConservé (déjà présent — le kit n\'écrase jamais tes fichiers) :'); for (const k of kept) L.push(`  • ${k}`); }
  // Ce bac n'existe QUE sur un run `--force` : c'est le seul cas où un drapeau a été écarté. Un
  // run normal ne doit pas parler d'un drapeau que l'utilisateur n'a pas tapé.
  if (promesse.length) {
    L.push('\nGardé MALGRÉ --force (le kit t\'a promis de ne jamais régénérer ces fichiers) :');
    for (const p of promesse) L.push(`  🔒 ${p}`);
    L.push('  Ce sont tes réponses, pas du contenu du kit. Pour repartir du gabarit : supprime le fichier, puis relance.');
  }
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  // L'entrée du kit est `/help` — pas `/new-project` : rien n'est encore installé à cette
  // seconde, et le prompt imprimé juste après commence par « ouvre docs/A-FAIRE.md ». Envoyer
  // vers `/new-project` ici contredisait ce prompt, deux lignes plus bas.
  L.push(`\nProchaine étape : colle le prompt ci-dessous dans ton assistant. Perdu plus tard ? ${refCommande(assistant, 'help')} — l'aide-mémoire des 10 runbooks, et par où continuer.`);
  return L.join('\n');
}

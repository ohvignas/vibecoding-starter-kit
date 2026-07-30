import { refCommande } from './commands-list.mjs';

// Rapport à 3 états : créé (✅) / conservé (•, déjà présent — jamais écrasé) / échec (❌).
export function formatReport({ project, stack, assistant, done, kept = [], inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nCréé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (kept.length) { L.push('\nConservé (déjà présent — le kit n\'écrase jamais tes fichiers) :'); for (const k of kept) L.push(`  • ${k}`); }
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  // L'entrée du kit est `/help` — pas `/new-project` : rien n'est encore installé à cette
  // seconde, et le prompt imprimé juste après commence par « ouvre docs/A-FAIRE.md ». Envoyer
  // vers `/new-project` ici contredisait ce prompt, deux lignes plus bas.
  L.push(`\nProchaine étape : colle le prompt ci-dessous dans ton assistant. Perdu plus tard ? ${refCommande(assistant, 'help')} — l'aide-mémoire des 10 runbooks, et par où continuer.`);
  return L.join('\n');
}

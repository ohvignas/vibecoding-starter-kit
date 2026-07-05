export function formatReport({ project, stack, assistant, done, inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nInstallé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  L.push('\nProchaine étape : lance /new-project (fondation), puis /new-feature pour chaque feature.');
  return L.join('\n');
}

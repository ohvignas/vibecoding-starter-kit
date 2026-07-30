// Rend docs/A-FAIRE.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/superpowers).
// Les skills design sont déjà installés par le wizard.
import { buildSkillAddArgs } from './external.mjs';
import { DESIGN_SKILL_SPECS, AGENT_SKILL_SPECS, STITCH, VISUAL_CHECK_STACKS, PIXELRAG_NOTE, VERIF_TOOLS_NOTE, MCP_CONNECT, uiBlocksNote } from './matrix.mjs';
import { refCommande, NOTE_CODEX_COMMANDES } from './commands-list.mjs';
import { cursorDeeplink } from './deeplink.mjs';

// skillsInstalled=false (wizard lancé avec --no-skills) : on liste les commandes au lieu d'un faux ✅.
export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, skillsInstalled = true }) {
  // La note « blocs d'UI » suit la STACK, jamais l'inverse : mobile n'a pas de DOM (voir matrix).
  const shadcnNote = uiBlocksNote(stack);
  // Comment nommer un runbook à CET assistant : `/new-project` chez Cursor et Claude Code,
  // un fichier à ouvrir chez Codex (qui n'exécute aucune slash-command du kit).
  const cmd = (c) => refCommande(assistant, c);
  const L = [];
  L.push(`# À faire — installe ça, puis ${assistant === 'codex' ? 'ouvre' : 'lance'} ${cmd('new-project')}  (stack ${stack} · ${assistant})`);
  L.push('');
  L.push(`Le **seul** fichier « à installer ». Ouvre-le dans ton assistant, fais chaque case, coche au fur et à mesure. (${cmd('new-project')} y ajoutera une section « Pour ton projet ».)`);
  if (assistant === 'codex') L.push(`\n> ⚠️ ${NOTE_CODEX_COMMANDES}`);
  L.push('');
  L.push('## 1. Plugins');
  // `note` : ce que le plugin est vraiment (dépôt communautaire, périmètre) — un débutant ne
  // peut pas le deviner de la commande.
  if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})${p.note ? `\n  - ⚠️ ${p.note}` : ''}`);
  else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  L.push('');
  L.push('## 2. Skills portables (stack)');
  if (manifest.skills.length) {
    if (skillsInstalled) {
      L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
      L.push('- (si un install a échoué — réseau — relance à la main :)');
    } else {
      L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    }
    for (const s of manifest.skills) L.push(`  - ${skillsInstalled ? '' : '[ ] '}\`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  // 3 branches : Codex n'a pas de `/mcp` — il faut lui dire quoi recopier, et où. La table vit
  // dans matrix.mjs (MCP_CONNECT) : le prompt `COLLE-MOI-DANS-L-IA.md` doit dire le même geste,
  // et il disait `/mcp` aux trois tant que chacun portait sa propre copie.
  const connect = (MCP_CONNECT[assistant] ?? MCP_CONNECT['claude-code']).long;
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : ${connect}${cfg.needsAuth ? ' (login requis)' : ''}`);
    if (cfg.prereq) L.push(`  - ⚠️ prérequis : ${cfg.prereq}`);
    if (assistant === 'cursor' && !cfg.apiKey) L.push(`  - ou clique pour l'ajouter : ${cursorDeeplink(name, cfg)}`);
  }
  L.push('');
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  // Le renvoi « voir « plugin » au glossaire » pointait dans le vide : `guides/glossaire.md` vit
  // dans le kit, jamais dans le projet généré. On définit le mot sur place.
  L.push('- [ ] Vérifie que c\'est actif : tape `/` puis « brainstorm » — si `/superpowers:brainstorming` apparaît dans le menu, superpowers est installé. Sinon, relance la case ci-dessus (un **plugin** = un paquet d\'extensions que ton assistant installe lui-même, en une commande).');
  L.push('');
  L.push('## 5. Design');
  if (skillsInstalled) {
    L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, webapp-testing, web-design-guidelines, ui-ux-pro-max');
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of DESIGN_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }
  L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant).replace('<new-project>', cmd('new-project'))}`);
  L.push('');
  L.push('### Skills du crew (agents de revue et de sécurité)');
  if (skillsInstalled) {
    L.push(`- ✅ déjà installés par le wizard : ${AGENT_SKILL_SPECS.flatMap((s) => s.skills).join(', ')}`);
    L.push('- (si un install a échoué — réseau — relance à la main :)');
    for (const s of AGENT_SKILL_SPECS) L.push(`  - \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of AGENT_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }
  L.push('');
  L.push('### Maquette IA — Stitch (si tu n\'as pas de design à fournir)');
  // « déjà installés » se lisait « c'est prêt », alors que les DEUX cases suivantes sont
  // obligatoires pour que Stitch réponde. On borne la promesse à ce qui est vrai.
  L.push(skillsInstalled
    ? '- ✅ skills Stitch posés par le wizard (generate-design · extract-html · loop · design-md) — **pas encore utilisables** : les deux cases ci-dessous ouvrent l\'accès.'
    : '- ⚠️ skills Stitch PAS installés : couverts par les commandes de la section 2 ci-dessus (spec « stitch »).');
  L.push(`- [ ] Crée ta **clé API Stitch** : ${STITCH.keyUrl} → ${STITCH.keySteps} → copie-la (garde-la **secrète**, ne la commite jamais).`);
  L.push(`- [ ] Connecte le **MCP Stitch au niveau utilisateur** (hors dépôt → la clé n'est jamais commitée) : ${STITCH.mcp[assistant]}`);
  L.push('');
  // Pas une case à cocher : rien à installer ici. La vérif visuelle se fait à l'œil, sur screenshot.
  if (VISUAL_CHECK_STACKS.includes(stack)) {
    L.push('### Vérif visuelle — comparer ta page à la maquette (aucun prérequis)');
    L.push(`- ${PIXELRAG_NOTE}`);
    L.push('');
  }
  // HORS de la condition ci-dessus : mobile a autant besoin des scanners que le web.
  L.push('### Outils de preuve (optionnels — toutes les stacks)');
  L.push(`- [ ] ${VERIF_TOOLS_NOTE}`);
  L.push('');
  // Le projet n'a AUCUN `package.json` à ce stade — le kit n'en crée pas. La section listait
  // des scripts « à ajouter si absents » dans un fichier qui n'existe pas encore : on dit
  // quand il apparaîtra, et donc quand revenir ici.
  L.push('## 6. Scripts package.json');
  L.push(`- ℹ️ Aucun \`package.json\` pour l'instant : il naîtra avec le projet, quand ${cmd('new-project')} (Phase 7) scaffoldera la stack. **Reviens cocher ces cases après.**`);
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}

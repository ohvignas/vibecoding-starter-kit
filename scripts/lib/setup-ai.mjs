// Rend docs/A-FAIRE.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/superpowers).
// Les skills design sont déjà installés par le wizard.
//
// C'EST LE FICHIER PIVOT DU PREMIER CONTACT : `COLLE-MOI-DANS-L-IA.md` en fait son étape 1,
// `/doctor` en fait un item, et `/build` en fait son « Jalon 0 ». Ce qui est faux ici est lu trois
// fois. Sur un projet ADOPTÉ (stack `aucune`) il l'était deux fois :
//   · son titre envoyait sur `/new-project` (PRD + tech spec) un projet qui a déjà son code ;
//   · sa section 5 poussait shadcnblocks, `components.json` et tout le flux maquette — le contenu
//     design que la tâche 3 a précisément RETIRÉ d'`AGENTS.md` pour ce parcours-là.
// Et trois de ses six sections sortaient VIDES (`aucune` ne déclare ni plugin, ni skill de stack,
// ni MCP) : « ## 3. MCP à autoriser » n'était qu'un titre, suivi de rien.
import { buildSkillAddArgs } from './external.mjs';
import { DESIGN_SKILL_SPECS, AGENT_SKILL_SPECS, STITCH, VISUAL_CHECK_STACKS, PIXELRAG_NOTE, VERIF_TOOLS_NOTE, MCP_CONNECT, uiBlocksNote } from './matrix.mjs';
import { refCommande, NOTE_CODEX_COMMANDES } from './commands-list.mjs';
import { cursorDeeplink } from './deeplink.mjs';
import { estAdopte } from './adoption.mjs';
// Le fichier que CHAQUE check exige AVANT de lancer son script (`selectChecks` teste `needs` en
// premier). Lu à la source, jamais recopié : c'est le même module que le kit copie en `.githooks/`.
import { CHECKS } from '../../templates/hooks/framework/checks.mjs';

// skillsInstalled=false (wizard lancé avec --no-skills) : on liste les commandes au lieu d'un faux ✅.
export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, skillsInstalled = true }) {
  // Comment nommer un runbook à CET assistant : `/new-project` chez Cursor et Claude Code,
  // un fichier à ouvrir chez Codex (qui n'exécute aucune slash-command du kit).
  const cmd = (c) => refCommande(assistant, c);
  const adopte = estAdopte(stack);
  const L = [];
  // Les sections sont NUMÉROTÉES À LA VOLÉE, et pas en dur. Sur les 4 stacks offertes les six
  // sections sont toujours rendues → le compteur redonne 1…6, à l'octet près. Sur un projet
  // adopté, celles qui n'ont rien à dire sautent leur tour au lieu de laisser un trou dans la
  // numérotation (« ## 1. … ## 4. … »), qui se lit comme un fichier tronqué.
  let n = 0;
  const section = (titre) => { L.push(''); L.push(`## ${++n}. ${titre}`); };
  // Sur les 4 stacks offertes, ces trois-là restent des SOUS-sections de « Design » — c'est le
  // rendu d'aujourd'hui, octet pour octet. Sur un projet adopté, « Design » se réduit à une ligne
  // et se retrouverait à contenir « Outils de preuve » : elles reprennent alors leur rang.
  const sousSection = (titre) => { L.push(''); L.push(adopte ? `## ${++n}. ${titre}` : `### ${titre}`); };

  L.push(adopte
    ? `# À faire — installe ça, puis ouvre \`docs/ETAT-DES-LIEUX.md\`  (projet existant · ${assistant})`
    : `# À faire — installe ça, puis ${assistant === 'codex' ? 'ouvre' : 'lance'} ${cmd('new-project')}  (stack ${stack} · ${assistant})`);
  L.push('');
  // La parenthèse « /new-project y ajoutera une section » est une promesse du parcours NEUF :
  // sur un projet adopté, `/new-project` n'est pas ce qu'on lance ensuite.
  L.push(adopte
    ? 'Le **seul** fichier « à installer ». Ouvre-le dans ton assistant, fais chaque case, coche au fur et à mesure.'
    : `Le **seul** fichier « à installer ». Ouvre-le dans ton assistant, fais chaque case, coche au fur et à mesure. (${cmd('new-project')} y ajoutera une section « Pour ton projet ».)`);
  if (assistant === 'codex') L.push(`\n> ⚠️ ${NOTE_CODEX_COMMANDES}`);

  // ── LES TROIS SECTIONS QUI PEUVENT N'AVOIR RIEN À DIRE ────────────────────────────────────────
  // Le saut est gardé par `adopte`, JAMAIS par le seul « c'est vide » : `codex`/`saas` a lui aussi
  // zéro plugin (matrix.mjs), et sa section 1 doit continuer de dire « aucun plugin dédié » —
  // mesuré. Une règle « vide → non rendu » sans garde déplacerait le parcours neuf.
  if (!adopte || manifest.plugins.length) {
    section('Plugins');
    // `note` : ce que le plugin est vraiment (dépôt communautaire, périmètre) — un débutant ne
    // peut pas le deviner de la commande.
    if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})${p.note ? `\n  - ⚠️ ${p.note}` : ''}`);
    else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  }

  if (!adopte || manifest.skills.length) {
    section('Skills portables (stack)');
    if (manifest.skills.length) {
      if (skillsInstalled) {
        L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
        L.push('- (si un install a échoué — réseau — relance à la main :)');
      } else {
        L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
      }
      for (const s of manifest.skills) L.push(`  - ${skillsInstalled ? '' : '[ ] '}\`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
    } else L.push('- [ ] (aucun)');
  }

  if (!adopte || Object.keys(manifest.mcp).length) {
    section('MCP à autoriser');
    // 3 branches : Codex n'a pas de `/mcp` — il faut lui dire quoi recopier, et où. La table vit
    // dans matrix.mjs (MCP_CONNECT) : le prompt `COLLE-MOI-DANS-L-IA.md` doit dire le même geste,
    // et il disait `/mcp` aux trois tant que chacun portait sa propre copie.
    const connect = (MCP_CONNECT[assistant] ?? MCP_CONNECT['claude-code']).long;
    for (const [name, cfg] of Object.entries(manifest.mcp)) {
      L.push(`- [ ] ${name} : ${connect}${cfg.needsAuth ? ' (login requis)' : ''}`);
      if (cfg.prereq) L.push(`  - ⚠️ prérequis : ${cfg.prereq}`);
      if (assistant === 'cursor' && !cfg.apiKey) L.push(`  - ou clique pour l'ajouter : ${cursorDeeplink(name, cfg)}`);
    }
  }

  section('Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  // Le renvoi « voir « plugin » au glossaire » pointait dans le vide : `guides/glossaire.md` vit
  // dans le kit, jamais dans le projet généré. On définit le mot sur place.
  L.push('- [ ] Vérifie que c\'est actif : tape `/` puis « brainstorm » — si `/superpowers:brainstorming` apparaît dans le menu, superpowers est installé. Sinon, relance la case ci-dessus (un **plugin** = un paquet d\'extensions que ton assistant installe lui-même, en une commande).');

  section('Design');
  // LES 4 SKILLS DESIGN RESTENT ANNONCÉS, MÊME SUR UN PROJET ADOPTÉ — et ce n'est pas une
  // exception au « on retire le design » : le wizard les installe sur TOUS les parcours
  // (setup.mjs, `installSkills(DESIGN_SKILL_SPECS, …)`, sans garde de stack) et la « Règle
  // sous-agents » du bloc adopté les nomme encore (« un sous-agent design charge les skills
  // design », agents-file.mjs). Les taire ici ferait le renvoi mort INVERSE : des skills installés
  // et exigés, que la seule checklist d'install ne mentionne nulle part — et, sous `--no-skills`,
  // jamais installés ET jamais listés.
  if (skillsInstalled) {
    L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, webapp-testing, web-design-guidelines, ui-ux-pro-max');
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of DESIGN_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }
  // CE QUI PART SUR UN PROJET ADOPTÉ : les blocs shadcnblocks (le registry se déclare dans un
  // `components.json` que `/new-project` crée — et `/new-project` n'est pas joué ici) et la
  // maquette Stitch (aucun dossier `maquette/` n'est posé, setup.mjs). C'est mot pour mot le
  // contenu que la tâche 3 a retiré d'`AGENTS.md` pour ce parcours.
  if (!adopte) {
    // La note « blocs d'UI » suit la STACK, jamais l'inverse : mobile n'a pas de DOM (voir matrix).
    const shadcnNote = uiBlocksNote(stack, refCommande(assistant, 'new-project'));
    L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant).replace('<new-project>', cmd('new-project'))}`);
  }

  sousSection('Skills du crew (agents de revue et de sécurité)');
  if (skillsInstalled) {
    L.push(`- ✅ déjà installés par le wizard : ${AGENT_SKILL_SPECS.flatMap((s) => s.skills).join(', ')}`);
    L.push('- (si un install a échoué — réseau — relance à la main :)');
    for (const s of AGENT_SKILL_SPECS) L.push(`  - \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of AGENT_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }

  if (!adopte) {
    sousSection('Maquette IA — Stitch (si tu n\'as pas de design à fournir)');
    // « déjà installés » se lisait « c'est prêt », alors que les DEUX cases suivantes sont
    // obligatoires pour que Stitch réponde. On borne la promesse à ce qui est vrai.
    L.push(skillsInstalled
      ? '- ✅ skills Stitch posés par le wizard (generate-design · extract-html · loop · design-md) — **pas encore utilisables** : les deux cases ci-dessous ouvrent l\'accès.'
      : '- ⚠️ skills Stitch PAS installés : couverts par les commandes de la section 2 ci-dessus (spec « stitch »).');
    L.push(`- [ ] Crée ta **clé API Stitch** : ${STITCH.keyUrl} → ${STITCH.keySteps} → copie-la (garde-la **secrète**, ne la commite jamais).`);
    L.push(`- [ ] Connecte le **MCP Stitch au niveau utilisateur** (hors dépôt → la clé n'est jamais commitée) : ${STITCH.mcp[assistant]}`);
  }

  // Pas une case à cocher : rien à installer ici. La vérif visuelle se fait à l'œil, sur screenshot.
  if (VISUAL_CHECK_STACKS.includes(stack)) {
    sousSection('Vérif visuelle — comparer ta page à la maquette (aucun prérequis)');
    L.push(`- ${PIXELRAG_NOTE}`);
  }
  // HORS de la condition ci-dessus : mobile a autant besoin des scanners que le web.
  sousSection('Outils de preuve (optionnels — toutes les stacks)');
  L.push(`- [ ] ${VERIF_TOOLS_NOTE}`);

  // Le projet n'a AUCUN `package.json` à ce stade — le kit n'en crée pas. La section listait
  // des scripts « à ajouter si absents » dans un fichier qui n'existe pas encore : on dit
  // quand il apparaîtra, et donc quand revenir ici.
  // SUR UN PROJET ADOPTÉ : il a déjà son `package.json` (ou n'en aura jamais — ce n'est pas au kit
  // d'en décider), `aucune` ne déclare AUCUN script à y ajouter, et la note renvoie à une étape de
  // `/new-project` qui ne sera pas jouée. La section n'aurait ni contenu ni raison.
  if (!adopte) {
    section('Scripts package.json');
    L.push(`- ℹ️ Aucun \`package.json\` pour l'instant : il naîtra avec le projet, quand ${cmd('new-project')} scaffoldera la stack à son étape \`07-scaffold.md\`. **Reviens cocher ces cases après.**`);
    // LA CASE QUI MANQUAIT, ET LE MUR QU'ELLE ÉVITE. Sur une stack à deux applications, les
    // scripts ci-dessous portent `--workspaces` : recopiés dans un `package.json` qui ne déclare
    // pas le champ `workspaces`, ils donnent `npm error No workspaces found!` — et le hook, lui,
    // affiche « ⚠ check typecheck : problème détecté ». L'élève a suivi la case à la lettre et le
    // kit accuse son code. C'est exactement ce que le commentaire de `checks.mjs` interdit.
    // La liste vient du manifeste (`STACKS.<stack>.workspaces`), jamais recopiée ici.
    if (manifest.workspaces.length) {
      L.push(`- [ ] **D'abord** : ce \`package.json\` est celui de la **racine**, et il doit déclarer les deux applications, sinon les scripts ci-dessous répondent \`No workspaces found!\` → \`"workspaces": ${JSON.stringify(manifest.workspaces)}\``);
      L.push(`  - ⚠️ et chaque application (${manifest.workspaces.map((w) => `\`${w}/\``).join(', ')}) doit déclarer **ses** scripts \`typecheck\` et \`lint\` : une application qui n'en a pas fait échouer la commande de la racine, en la nommant.`);
      // ⛔ LES FICHIERS `needs`, ET SEULEMENT CEUX QUI SERVENT ENCORE. `needs` est le prérequis de
      // la commande PAR DÉFAUT d'un check (`checks.mjs`) : un check dont la stack DÉCLARE le
      // script ne passe jamais par ce repli, donc n'a que faire de son fichier de config. La
      // version d'avant les listait tous — elle faisait cocher « pose un `biome.json` » à une
      // vitrine dont les deux applications lintent avec eslint, pour un outil qu'aucun scaffold
      // n'installe. La liste reste DÉRIVÉE : qu'une stack cesse de déclarer son script, et le
      // fichier de son repli réapparaît ici.
      const requis = [...new Set(manifest.checks.preCommit.filter((id) => !manifest.scripts?.[id]).map((id) => CHECKS[id]?.needs).filter(Boolean))];
      if (requis.length) L.push(`- [ ] **Et à la racine, à côté du \`package.json\`** : ${requis.map((f) => `\`${f}\``).join(' + ')} — le hook vérifie que ces fichiers sont là **avant** de lancer le script. S'il en manque un, le check ne rougit pas : il se **saute**, et le pre-commit sort vert sans avoir rien vérifié.`);
    }
    for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  }
  L.push('');
  return L.join('\n');
}

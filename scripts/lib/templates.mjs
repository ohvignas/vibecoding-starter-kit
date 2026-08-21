import { wrapManaged } from './managed-section.mjs';
import { estAdopte } from './adoption.mjs';

export function toCursorMdc({ description, body, alwaysApply = true }) {
  return `---\ndescription: ${JSON.stringify(String(description).replace(/\r?\n/g, ' '))}\nglobs:\nalwaysApply: ${alwaysApply}\n---\n\n${body}\n`;
}

// Une règle `.mdc` clonée verbatim d'un dépôt tiers arrive souvent en `alwaysApply: true` :
// elle serait alors injectée à CHAQUE tour, dans tous les projets, sans qu'on l'ait choisi.
// On force `false` (Agent-Requested) : la règle reste disponible, l'IA la charge si pertinent.
export function forceAlwaysApplyFalse(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n)?/.exec(text);
  if (!m) return `---\ndescription:\nglobs:\nalwaysApply: false\n---\n\n${text}`;
  const fm = /^alwaysApply\s*:.*$/m.test(m[1])
    ? m[1].replace(/^alwaysApply\s*:.*$/m, 'alwaysApply: false')
    : `${m[1]}\nalwaysApply: false`;
  return `---\n${fm}\n---\n${text.slice(m[0].length)}`;
}

// Ordre de lecture volontaire : la boucle, puis la Règle Preuve (elle pose le vocabulaire
// PROUVÉ/BLOQUÉ que les suivantes emploient) et la Règle Réalité (les mocks), puis la
// vérification, puis les règles transverses — les règles UI (design, CSS) viennent après.
export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', subagentsRule = '', verifyRule = '', realityRule = '', proofRule = '', secretsRule = '', cssMaquetteRule = '', memoryRules = '', learning = true }) {
  const learningSection = learning === false ? '' : `## Mode apprentissage
Tu **enseignes**, tu n'interroges pas : **aucune question** de compréhension. À chaque étape franchie : (1) dis ce que tu viens de faire et **pourquoi ainsi** ; (2) **ajoute la leçon** à \`docs/APPRENTISSAGE.md\` — gabarit et règles en tête du fichier, numérotée, à la suite ; (3) \`/build --all\` reste **désactivé**. Il apprend en te regardant faire.

`;
  // PROJET ADOPTÉ (`aucune`) : le kit ne pose ni `maquette/`, ni `docs/design.md`, ni
  // `AGENTS-stack.md`, ni `ai-context/`, ni `docs/PRD.md`/`docs/ROADMAP.md`. Ces quatre sections
  // n'y renvoient donc vers RIEN — et ce bloc est relu à CHAQUE message. On les retire plutôt que
  // d'entretenir un renvoi mort. Les phrases des règles GARDÉES qui citaient les mêmes fichiers
  // sont réécrites au rendu par `adapterAuProjetAdopte` (agents-file.mjs).
  const adopte = estAdopte(stack);
  // Les deux règles UI, ensemble : elles ne parlent que de `docs/design.md` et de `maquette/`.
  // Le bloc porte ses propres séparateurs pour que le rendu des 4 stacks reste octet pour octet
  // identique, et que l'adopté n'hérite pas de lignes vides orphelines.
  const uiRules = adopte ? '' : `${designRule}

${cssMaquetteRule}

`;
  const contexteEtDocs = adopte ? '' : `## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et \`ai-context/\`. Si présents : \`AGENTS-stack.md\`, \`AGENTS-karpathy.md\`.

## Docs du projet
PRD : \`docs/PRD.md\` · Archi : \`docs/ARCHITECTURE.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Capacités : \`docs/DOMAINS.md\` · Architecture : \`docs/superpowers/specs/\`.

`;
  // Le clone Karpathy N'EST PAS stack-keyé (matrix.mjs:63-69) : il atterrit sur un projet adopté
  // comme sur les autres. Sa SEULE mention vivait dans « Contexte de la stack » — la retirer sans
  // la reloger créerait le renvoi mort INVERSE : 3 ko de principes à la racine dont l'IA ignore
  // l'existence. On la reloge donc en tête, où elle ne dépend d'aucune stack.
  // CURSOR EXCLU, et ce n'est pas un oubli : chez lui le clone va dans \`.cursor/rules/karpathy.mdc\`
  // (matrix.mjs:67-68), que Cursor charge tout seul en Agent-Requested. Lui annoncer un
  // \`AGENTS-karpathy.md\` à la racine serait exactement le renvoi mort que cette tâche supprime.
  const karpathyNote = adopte && assistant !== 'cursor' ? `

Si présent à la racine : \`AGENTS-karpathy.md\` (principes de dev) — charge-le quand il éclaire une décision.` : '';
  // \`/new-project\` pose une fondation et \`/build\` déroule \`docs/ROADMAP.md\` : sur un projet qui
  // existe déjà, il n'y a ni fondation à poser ni roadmap posée. Les deux runbooks restent dans
  // l'aide-mémoire — ils marchent — mais nommés pour ce qu'ils font VRAIMENT là.
  const refNew = adopte ? 'fonder un projet neuf' : 'fondation';
  const refBuild = adopte ? 'dérouler une roadmap' : 'construire la roadmap';
  const body = `# Règles projet (généré par vibe-stack)

@docs/memory/index.md

Stack : **${stack}** · Assistant : **${assistant}**.${karpathyNote}

${loopSection}

${proofRule}

${realityRule}

${verifyRule}

${subagentsRule}

${secretsRule}

${uiRules}${memoryRules}

${learningSection}${contexteEtDocs}## Commandes
Runbooks dans \`${commandsDir}/\`, détaillés par \`/help\`.
\`/init-vibecoding\` (installer), \`/help\` (aide-mémoire), \`/new-project\` (${refNew}), \`/build\` (${refBuild}), \`/new-feature\` (livrer), \`/edit-design\` (UI), \`/next\` (la suite), \`/sos\` (ça casse), \`/doctor\` (diagnostic), \`/deploy\` (déployer).`;
  return `${wrapManaged(body)}

## Tes règles à toi (préservées lors des mises à jour)
<!-- Ajoute ici tes règles projet perso. \`update --refresh\` ne touche JAMAIS cette zone. -->
`;
}

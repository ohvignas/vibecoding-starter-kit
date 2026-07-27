import { wrapManaged } from './managed-section.mjs';

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

export function toSkillMd({ name, description, body }) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(String(description).replace(/\r?\n/g, ' '))}\n---\n\n${body}\n`;
}

export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', subagentsRule = '', verifyRule = '', realityRule = '', proofRule = '', secretsRule = '', cssMaquetteRule = '', memoryRules = '', learning = true }) {
  const learningSection = learning === false ? '' : `## Mode apprentissage
À chaque jalon terminé : (1) explique en **3 puces simples** ce que tu viens de construire et **pourquoi** ; (2) pose **une question de compréhension** à l'utilisateur et **attends sa réponse** avant de continuer ; (3) \`/build --all\` est **désactivé** (on avance jalon par jalon). Objectif : l'utilisateur comprend, il ne subit pas.

`;
  const body = `# Règles projet (généré par vibe-stack)

@docs/memory/index.md

Stack : **${stack}** · Assistant : **${assistant}**.

${loopSection}

${designRule}

${subagentsRule}

${verifyRule}

${realityRule}

${proofRule}

${secretsRule}

${cssMaquetteRule}

${memoryRules}

${learningSection}## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et \`ai-context/\`. Si présents : \`AGENTS-stack.md\`, \`AGENTS-karpathy.md\`.

## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Capacités : \`docs/DOMAINS.md\` · Architecture : \`docs/superpowers/specs/\`.

## Commandes
\`/new-project\` (fondation) · \`/build\` (construire la roadmap, jalon par jalon) · \`/new-feature\` (livrer une feature) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.

## Maquette
La maquette de référence est dans \`maquette/\`.`;
  return `${wrapManaged(body)}

## Tes règles à toi (préservées lors des mises à jour)
<!-- Ajoute ici tes règles projet perso. \`update --refresh\` ne touche JAMAIS cette zone. -->
`;
}

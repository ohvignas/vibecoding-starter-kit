export function toCursorMdc({ description, body, alwaysApply = true }) {
  return `---\ndescription: ${JSON.stringify(String(description).replace(/\r?\n/g, ' '))}\nglobs:\nalwaysApply: ${alwaysApply}\n---\n\n${body}\n`;
}

export function toSkillMd({ name, description, body }) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(String(description).replace(/\r?\n/g, ' '))}\n---\n\n${body}\n`;
}

export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', memoryRules = '' }) {
  return `# Règles projet (généré par vibe-stack)

@docs/memory/index.md

Stack : **${stack}** · Assistant : **${assistant}**.

${loopSection}

${designRule}

${memoryRules}

## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et \`ai-context/\`. Si présents : \`AGENTS-stack.md\`, \`AGENTS-karpathy.md\`.

## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Capacités : \`docs/DOMAINS.md\` · Architecture : \`docs/superpowers/specs/\` · Propositions (dream) : \`docs/DREAM.md\`.

## Commandes
\`/new-project\` (fondation) · \`/new-feature\` (livrer) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.

## Maquette
La maquette de référence est dans \`maquette/\`.
`;
}

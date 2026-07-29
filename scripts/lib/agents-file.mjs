import fs from 'node:fs';
import path from 'node:path';
import { renderProjectAgentsMd } from './templates.mjs';

// Les 9 règles standing injectées dans AGENTS.md/CLAUDE.md, et le paramètre du rendu qui les
// porte. C'est le CONTRAT du fichier : s'il en manque une, ce qui sort n'est pas un AGENTS.md.
const REGLES = {
  loopSection: 'loop-section.md', proofRule: 'proof-rule.md', realityRule: 'reality-rule.md',
  verifyRule: 'verify-rule.md', subagentsRule: 'subagents-rule.md', secretsRule: 'secrets-cost-rule.md',
  designRule: 'design-rule.md', cssMaquetteRule: 'css-maquette-rule.md', memoryRules: 'memory-rules.md',
};

// Source unique du rendu AGENTS.md/CLAUDE.md — utilisée par setup ET update --refresh.
//
// Une règle illisible n'est JAMAIS remplacée par du vide : le rendu dégénéré (l'ossature sans
// aucune règle) était écrit tel quel par `--refresh` par-dessus l'AGENTS.md complet du projet,
// avec le message « Régénéré » — 15 017 → 1 393 octets (2 189 → 190 mots), exit 0, les 9 règles
// perdues sans un mot. (Chiffres remesurés : une revue avait relevé 5 octets d'écart.)
// On échoue à la place, en nommant ce qui manque : une source amputée est un bug d'installation,
// pas un contenu.
export function renderAgentsFile({ source, stack, assistant, commandsDir, learning = true }) {
  const snippets = {}, manquants = [];
  for (const [cle, fichier] of Object.entries(REGLES)) {
    const abs = path.join(source, 'templates/agents', fichier);
    try {
      const t = fs.readFileSync(abs, 'utf8');
      if (!t.trim()) { manquants.push(`${fichier} (vide)`); continue; }
      snippets[cle] = t;
    } catch (e) { manquants.push(`${fichier} (${e.code || e.message})`); }
  }
  if (manquants.length) {
    throw new Error([
      `Règles standing introuvables dans ${path.join(source, 'templates/agents')} : ${manquants.join(', ')}.`,
      "Le rendu serait un AGENTS.md sans ses règles — refusé pour ne pas écraser celui du projet.",
      'Vérifie le chemin passé à `--source` (ou réinstalle le kit : `npm create vibecoding-kit@latest`).',
    ].join('\n'));
  }
  return renderProjectAgentsMd({ stack, assistant, commandsDir, learning, ...snippets });
}

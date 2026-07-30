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

// Mobile = React Native : pas de DOM, donc ni shadcn/ui ni blocs shadcnblocks — `/new-project`
// le tranche déjà (« mobile : jamais shadcn »). Les deux règles UI, elles, l'imposaient à TOUTES
// les stacks : un projet mobile recevait, RELUE À CHAQUE MESSAGE, la consigne d'utiliser une
// bibliothèque qui n'y tourne pas. On substitue phrase par phrase, et on ÉCHOUE si la phrase
// source a bougé : une substitution devenue sans effet ramènerait la consigne fausse en silence.
const SUBSTITUTIONS_MOBILE = [
  ['designRule', 'design-rule.md', ', ou fais régler le thème sur **[tweakcn.com](https://tweakcn.com)** (shadcn/Tailwind) et intègre l\'export CSS', ''],
  ['designRule', 'design-rule.md',
    'Aller vite sur une section : `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé, `SHADCNBLOCKS_API_KEY` pour le pro), adaptés ensuite à `docs/design.md` — ce n\'est **pas** un skill.',
    'Aller vite sur un écran : **NativeWind** + composants natifs, adaptés ensuite à `docs/design.md` — les blocs web ne s\'installent pas ici (React Native n\'a pas de DOM).'],
  ['cssMaquetteRule', 'css-maquette-rule.md',
    '- **Écrans React** : **shadcn/ui + Tailwind d\'abord**, le CSS maquette n\'est qu\'une référence.',
    '- **Écrans React Native** : **NativeWind d\'abord**, le CSS maquette n\'est qu\'une référence.'],
];

export function adapterAuMobile(snippets) {
  for (const [cle, fichier, de, vers] of SUBSTITUTIONS_MOBILE) {
    const avant = snippets[cle];
    if (!avant.includes(de)) {
      throw new Error(`templates/agents/${fichier} : la phrase à adapter pour le mobile a changé — « ${de.slice(0, 60)}… » introuvable.\nSans adaptation, un projet mobile reçoit une consigne shadcn inapplicable en React Native. Mets à jour SUBSTITUTIONS_MOBILE (scripts/lib/agents-file.mjs).`);
    }
    snippets[cle] = avant.replace(de, vers);
  }
  return snippets;
}

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
  if (stack === 'mobile') adapterAuMobile(snippets);
  return renderProjectAgentsMd({ stack, assistant, commandsDir, learning, ...snippets });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('loop-section : boucle superpowers, def-of-done sur main, pas de BMAD', () => {
  const t = read('templates/agents/loop-section.md');
  for (const s of ['brainstorming', 'writing-plans', 'subagent-driven-development', 'Test live', 'Merge']) {
    assert.match(t, new RegExp(s));
  }
  // Le scaffold ne crée que `main` : la définition de « fini » doit y renvoyer, jamais à `dev`.
  assert.match(t, /mergé sur \*\*`main`\*\*/);
  assert.doesNotMatch(t, /BMAD/i);
});
test('design-rule : 4 skills design + design.md + blocs @shadcnblocks via CLI', () => {
  const t = read('templates/agents/design-rule.md');
  for (const s of ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'brand-guidelines', 'design.md', '@shadcnblocks']) {
    assert.match(t, new RegExp(s.replace(/[-.]/g, '\\$&')));
  }
});

test('subagents-rule : quand déléguer + contrat + parallèle + modèle sonnet 5', () => {
  const t = read('templates/agents/subagents-rule.md');
  for (const s of ['subagent-driven-development', 'parallèle', 'contexte frais', 'artefact', 'Règle design', 'claude-sonnet-5', 'jamais en parallèle']) {
    assert.match(t, new RegExp(s));
  }
});

test('verify-rule : rendu + fonctionnement E2E + Playwright/Maestro + test-runner + trous QA', () => {
  const t = read('templates/agents/verify-rule.md');
  for (const s of ['navigateur', 'Screenshot', 'maquette', 'systematic-debugging', 'verification-before-completion', 'end-to-end', 'Playwright', 'Maestro', 'test-runner', 'contexte frais', 'FONCTIONNEMENT', 'PixelRAG', 'toMatchAriaSnapshot', 'Non bloquant']) {
    assert.match(t, new RegExp(s));
  }
  // Les trous QA ne sont plus recopiés ici : ils vivent dans l'agent qui les exécute.
  assert.match(t, /cas limites/i, 'verify-rule renvoie aux cas limites du test-runner');
  assert.match(read('templates/agents/subagents/test-runner.md'), /erreur API/, 'le test-runner les porte');
});

test('subagent test-runner : contexte frais, Playwright/Maestro, verdict court, ne code pas', () => {
  const t = read('templates/agents/subagents/test-runner.md');
  for (const s of ['Playwright', 'Maestro', 'critères', 'Verdict', 'ne codes? rien', 'toMatchAriaSnapshot', 'waitForRequest', 'rechargement', 'model:']) {
    assert.match(t, new RegExp(s));
  }
});

test('secrets-cost-rule : .env + jamais commit + coûts/modèle', () => {
  const t = read('templates/agents/secrets-cost-rule.md');
  for (const s of ['\\.env', 'pre-commit', 'destructive', 'Choix du modèle', 'fan-out']) {
    assert.match(t, new RegExp(s));
  }
  // Le modèle se choisit à UN seul endroit : ici, on renvoie.
  assert.match(t, /Règle sous-agents/);
  assert.doesNotMatch(t, /claude-(sonnet|opus)-\d/);
});

test('css-maquette-rule : pas de slice lignes + accolades + vrai CSS + couleur primaire', () => {
  const t = read('templates/agents/css-maquette-rule.md');
  for (const s of ['plages de lignes', 'Accolades', 'vrai CSS', 'shadcn', 'primaire']) {
    assert.match(t, new RegExp(s));
  }
  // E10 a supprimé la section `## Maquette` de `templates.mjs` pour tenir le plafond de mots, en
  // s'appuyant sur le fait que cette règle-ci porte déjà la consigne. Personne ne l'assertait :
  // la retirer d'ici l'aurait fait disparaître du rendu sans qu'aucun test ne bronche.
  assert.match(t, /`maquette\/`/, 'la seule occurrence restante de la consigne « maquette/ » dans AGENTS.md');
});

test('reality-rule : zéro mock + boutons câblés + maquette à l\'identique', () => {
  const t = read('templates/agents/reality-rule.md');
  for (const s of ['mock', 'vrai backend', 'MARCHE', 'maquette à l\'identique', 'Prends le temps']) {
    assert.match(t, new RegExp(s));
  }
  // La fidélité à la maquette reste exigée, mais la comparaison d'images ne décide pas :
  // l'outil (PixelRAG) et son statut non bloquant sont décrits une seule fois, dans verify-rule.
  assert.match(t, /jamais bloquant/);
  assert.doesNotMatch(t, /PixelRAG/);
});

test('ROADMAP + étape roadmap : données/câblage réel par jalon (zéro mock)', () => {
  const roadmap = read('templates/roadmap/ROADMAP.md');
  // La roadmap vit dans l'étape `06-…` depuis le découpage : on lit le runbook entier (entrée +
  // étapes), énuméré depuis la source unique `commands-list.mjs`.
  const np = fichiersDuRunbook(ROOT, 'new-project').map((f) => read(f)).join('\n');
  assert.match(roadmap, /Données \/ câblage réel/);
  assert.match(np, /vraie donnée/i);
  assert.match(np, /zéro mock/i);
});

test('règle Cursor CSS scoped : globs styles + non-alwaysApply', () => {
  const t = read('templates/cursor/rules/10-css-maquette.mdc');
  assert.match(t, /globs:\s*\*\*\/styles\/\*\*/);
  assert.match(t, /alwaysApply:\s*false/);
});

test('stacks/vitrine : AGENTS.md + README + prompts présents et complets', () => {
  const a = read('stacks/vitrine/AGENTS.md');
  assert.match(a, /îlot/i);
  assert.match(a, /client:/);
  assert.match(a, /llms\.txt/);
  assert.match(a, /JSON-LD/);
  assert.match(a, /robots\.txt/);
  assert.match(a, /@astrojs\/sitemap/);
  // ⚠️ CETTE LIGNE EXIGEAIT `Keystatic` — le CMS git que la stack vient de quitter. Le fait a
  // changé, la propriété non : le fichier doit toujours nommer la brique qui PORTE LE CONTENU,
  // sinon l'IA se retrouve avec des règles de mise en page et aucune source de données. Le
  // contenu vit maintenant dans Convex, saisi depuis une SECONDE application — et c'est cette
  // seconde application qu'il faut nommer, sinon la règle « au build » n'a plus d'endroit où
  // renvoyer `useQuery`.
  assert.match(a, /Convex/, 'vitrine : la brique qui porte le contenu');
  assert.match(a, /dashboard\//, 'vitrine : la seconde application, celle qui saisit le contenu');
  assert.match(a, /Better Auth/, 'vitrine : ce qui ferme le dashboard');
  assert.ok(read('stacks/vitrine/README.md').length > 800);
  const p = read('stacks/vitrine/prompts-de-demarrage.md');
  assert.ok(p.includes('shadcn'));
  // Un prompt de démarrage qui ne monte QUE le site public laisserait le débutant sans endroit
  // où écrire son contenu — le défaut exact que le passage à Convex crée s'il n'est pas dit.
  assert.match(p, /dashboard/, 'les prompts doivent monter les DEUX applications');
});

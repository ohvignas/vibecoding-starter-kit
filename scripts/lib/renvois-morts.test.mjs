// scripts/lib/renvois-morts.test.mjs
// UN BLOC LIVRÉ NE CITE PAS UN FICHIER QUE LE PROJET N'A PAS.
//
// `promesses-livrees.test.mjs` traque l'INVERSE (les chemins du DÉPÔT — scripts/templates/stacks/
// cursor-plugin — cités dans un fichier livré) et son message encourage même `docs/…` comme
// alternative correcte. Il ne peut pas servir ici : sa regex (`SOURCES_DU_KIT`) ne lit pas `docs/`,
// et `AGENTS.md` n'est même pas dans sa carte de livraison (`carte.has('AGENTS.md') === false`,
// mesuré). Ce fichier couvre l'autre moitié : le bloc AGENTS.md/CLAUDE.md que `renderAgentsFile`
// produit pour un projet ADOPTÉ (`--stack aucune`) ne doit citer AUCUN chemin que ce parcours-là
// ne pose pas — et le rendu des 4 stacks OFFERTES ne doit rien perdre au passage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAgentsFile } from './agents-file.mjs';

const ASSISTANTS = ['claude-code', 'codex', 'cursor'];
const STACKS_OFFERTES = ['saas', 'mobile', 'desktop', 'vitrine'];

// Ce qu'un projet ADOPTÉ n'a pas. Liste dérivée des décisions 1, 2, 4 et 8 de la spec
// (docs/superpowers/specs/2026-08-21-projets-existants-design.md).
//
// DEUX ENTRÉES DE LA LISTE SOURCE (plan, tâche 4) NE SONT VOLONTAIREMENT PAS ICI :
//
//  · `docs/ETAT-DES-LIEUX.md` — une substitution de la tâche 3 (SUBSTITUTIONS_ADOPTE,
//    agents-file.mjs, entrée verifyRule) y renvoie déjà, mais le fichier n'existe qu'après
//    `--adopt` (tâche 6 : `templates/adoption/ETAT-DES-LIEUX.md`, pas encore écrit). Mesuré : un
//    scaffold `--stack aucune` nu ne le pose PAS. Le lister ici ferait rougir ce garde pour un
//    renvoi qui n'est mort que sur le chemin bas niveau, jamais sur le chemin nominal (`--adopt`)
//    — hors périmètre de cette tâche. LA TÂCHE 6 DOIT LE SAVOIR : ce garde ne couvre pas encore ce
//    fichier ; si `--adopt` ne finit pas par le poser, rien ici ne le détectera.
//
//  · `docs/DOMAINS.md` — mesuré PRÉSENT après un scaffold `--stack aucune` NU (scaffold réel,
//    tmpdir, inspection du disque) : `writeStackEnvironment` (environment.mjs:76-79) l'écrit sans
//    condition, même avec `manifest.domains = {}` (le cas `aucune`, matrix.mjs:261). Le rendu
//    actuel ne le cite nulle part (la section qui le citait, « Docs du projet », est retirée en
//    bloc pour `aucune`), donc son absence de cette liste est neutre AUJOURD'HUI — mais l'y mettre
//    serait FAUX : le fichier qu'une phrase citerait existe réellement, ce ne serait pas un renvoi
//    mort. Le plan (tâche 7, étape 7.3 : « docs/DOMAINS.md vide : non posé ») confirme que c'est
//    l'ABSENCE de ce fichier qui est l'état futur, pas sa présence actuelle. LA TÂCHE 7 DOIT LE
//    SAVOIR : si une règle gardée se met à citer `docs/DOMAINS.md` avant que cette étape ne ferme
//    le trou, ce garde ne le verra pas.
const ABSENTS = [
  'maquette/', 'docs/design.md', 'docs/PRD.md', 'docs/ROADMAP.md', 'docs/ARCHITECTURE.md',
  'AGENTS-stack.md', 'ai-context/', '.env.example',
];

// Ce qu'il A, donc autorisé — et dont la présence RÉELLE dans le rendu est vérifiée ci-dessous,
// pas seulement déclarée : une substitution trop large qui les effacerait par effet de bord doit
// rougir ici, en les nommant.
//
// `docs/glossaire.md` N'Y EST PAS, volontairement : le fichier existe bien sur un projet adopté
// (setup.mjs le pose), mais aucune des 9 règles standing ne le cite, POUR AUCUNE STACK (mesuré) —
// seul `templates/commands/help.md` le fait, hors du périmètre de `renderAgentsFile`. L'exiger ici
// ferait rougir ce garde pour une raison qui n'a rien à voir avec un renvoi mort.
const PRESENTS = ['docs/agents/JOURNAL.md', 'docs/agents/state.yaml', 'docs/memory/', 'docs/APPRENTISSAGE.md'];

test('renvois morts — le bloc adopté ne cite aucun fichier absent', () => {
  for (const assistant of ASSISTANTS) {
    const t = renderAgentsFile({ source: process.cwd(), stack: 'aucune', assistant, commandsDir: '.claude/commands', learning: true });

    // Montage : un rendu vide (ou effondré) rendrait le contrôle ABSENTS vrai À VIDE —
    // `''.includes(x)` est toujours faux, donc `fautes` resterait `[]` même si `renderAgentsFile`
    // avait cessé de rendre quoi que ce soit. Mesuré : claude-code et codex rendent 1874 mots,
    // cursor 1857 (pas de note Karpathy — matrix.mjs, gate `assistant !== 'cursor'`). Le brief de
    // cette tâche proposait « > 1700 » : ça tient les deux valeurs mesurées, mais avec 157 à 174
    // mots de mou — assez pour qu'UNE des 8 sections gardées disparaisse entièrement (chacune
    // ~150-300 mots, décision 2 de la spec) sans faire rougir ce plancher. 1800 tient toujours les
    // deux (57 à 74 mots de marge, mesuré) tout en étant sensiblement plus exigeant.
    const n = t.trim().split(/\s+/).length;
    assert.ok(n > 1800, `montage (${assistant}) : rendu de seulement ${n} mots, le contrôle ne juge rien d'assez substantiel`);

    const fautes = ABSENTS.filter((a) => t.includes(a));
    assert.deepEqual(fautes, [], [
      `${assistant} : le bloc livré cite des fichiers absents d'un projet adopté :`,
      ...fautes.map((f) => `  ${f}`),
      'Retire la section, ou substitue la phrase (SUBSTITUTIONS_ADOPTE, agents-file.mjs).',
    ].join('\n'));

    // Contrôle symétrique : on n'a pas coupé trop large. Chacune de ces 4 chaînes est mesurée
    // présente dans le rendu aujourd'hui — si une substitution future les efface par effet de
    // bord, ceci doit rougir en la nommant.
    // Le brief de cette tâche écrivait cette ligne `assert.ok(t.includes(p) || true, …)` : un
    // OU logique avec `true` ne peut JAMAIS être faux, donc cette assertion ne pouvait rougir pour
    // AUCUNE raison — exactement le défaut que la tâche demande de traquer dans chaque assertion
    // écrite ici. Prouvé mordant à la place (mutation jouée et restaurée, hors suite) : effacer la
    // seule occurrence de `docs/agents/state.yaml` (verify-rule.md:15) fait rougir cette ligne en
    // le nommant.
    for (const p of PRESENTS) {
      assert.ok(t.includes(p), `${assistant} : « ${p} » a disparu du rendu adopté — vérifie que SUBSTITUTIONS_ADOPTE (agents-file.mjs) n'a pas coupé trop large`);
    }
  }
});

test('renvois morts — le rendu des 4 stacks offertes garde ses renvois', () => {
  // Les 4 stacks OFFERTES ne passent jamais par `adapterAuProjetAdopte` (agents-file.mjs :
  // `if (estAdopte(stack))`) : leurs renvois vers `maquette/` doivent survivre intacts.
  // Vérifié mordant (mutation jouée puis restaurée, hors suite) : forcer `estAdopte` à toujours
  // répondre `true` fait tomber ce contrôle à `false` pour `saas` — les sections design/
  // CSS-maquette disparaissent (templates.mjs, même garde `estAdopte`) ET les phrases substituées
  // de reality-rule.md/verify-rule.md perdent leurs occurrences de « maquette ». Une régression
  // qui élargirait le parcours adopté aux stacks offertes se voit donc ici sur les 4, pas
  // seulement sur celle que testait le brief.
  for (const stack of STACKS_OFFERTES) {
    const t = renderAgentsFile({ source: process.cwd(), stack, assistant: 'claude-code', commandsDir: '.claude/commands', learning: true });
    assert.ok(t.includes('maquette'), `${stack} : une stack offerte DOIT garder ses renvois maquette`);
  }
});

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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderAgentsFile } from './agents-file.mjs';
import { AGENTS_DIR } from './kit-owned.mjs';
import { MARK_START_PREFIX } from './managed-section.mjs';

const ASSISTANTS = ['claude-code', 'codex', 'cursor'];
const STACKS_OFFERTES = ['saas', 'mobile', 'desktop', 'vitrine'];

// Les 8 règles standing que le rendu adopté DOIT garder — même liste, même ancrage que
// `adoption.test.mjs` (`^## .*` + le titre, sur une ligne). Sans l'ancrage `^## `, un renvoi
// CROISÉ vers le nom d'une section depuis une AUTRE règle encore présente suffit à faire passer
// le test alors que la section elle-même a disparu — mesuré par la tâche 3 (finding 2, revue) :
// 4 des 8 noms restaient verts en vidant la section correspondante, faute de cet ancrage.
const GARDES = ['Règle Preuve', 'Règle Réalité', 'Règle de vérification', 'Boucle d\'itération', 'Règle sous-agents', 'Mémoire du projet', 'Règle secrets', 'Mode apprentissage'];

// Ce qu'un projet ADOPTÉ n'a pas. Liste dérivée des décisions 1, 2, 4 et 8 de la spec
// (docs/superpowers/specs/2026-08-21-projets-existants-design.md).
//
// DEUX ENTRÉES DE LA LISTE SOURCE (plan, tâche 4) NE SONT VOLONTAIREMENT PAS ICI :
//
//  · `docs/ETAT-DES-LIEUX.md` — une substitution de la tâche 3 (SUBSTITUTIONS_ADOPTE,
//    agents-file.mjs, entrée verifyRule) y renvoie déjà, mais le fichier n'existe qu'après
//    `--adopt` (tâche 6 : `templates/adoption/ETAT-DES-LIEUX.md`). Mesuré : un scaffold
//    `--stack aucune` nu ne le pose PAS. Le lister ici ferait rougir ce garde pour un renvoi qui
//    n'est mort que sur le chemin bas niveau, jamais sur le chemin nominal (`--adopt`).
//    ✅ FERMÉ PAR LA TÂCHE 6 — mais pas ici : par le troisième test de ce fichier, qui joue un
//    `--adopt` RÉEL et exige que chaque `docs/…` cité existe sur le disque. C'est la seule forme
//    qui pouvait couvrir ce fichier-là, puisque son existence dépend du parcours, pas du rendu.
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
    // cette tâche proposait « > 1700 » ; 1800 tient toujours les deux (57 à 74 mots de marge).
    //
    // CE PLANCHER NE PROUVE PAS « aucune section gardée n'a disparu ». Une revue l'a mesuré, en
    // vidant un snippet à la fois : Règle secrets coûte 122 mots, Mémoire du projet 139, et
    // **Mode apprentissage seulement 60** — pas « 150-300 chacune » comme une version antérieure
    // de ce commentaire l'affirmait, à tort. Perdre CETTE section-là ne fait tomber le total qu'à
    // 1814 (claude-code/codex) ou 1797 (cursor) : 1814 > 1800, ce plancher seul ne l'aurait PAS vu
    // sur 2 des 3 assistants. C'est la boucle `GARDES` plus bas, ancrée sur les en-têtes — pas ce
    // comptage — qui a la charge de prouver qu'aucune des 8 sections n'a disparu. Ce plancher, lui,
    // ne garde que sa promesse d'origine : rejeter un rendu effondré/vide.
    const n = t.trim().split(/\s+/).length;
    assert.ok(n > 1800, `montage (${assistant}) : rendu de seulement ${n} mots, le contrôle ne juge rien d'assez substantiel`);

    const fautes = ABSENTS.filter((a) => t.includes(a));
    assert.deepEqual(fautes, [], [
      `${assistant} : le bloc livré cite des fichiers absents d'un projet adopté :`,
      ...fautes.map((f) => `  ${f}`),
      'Retire la section, ou substitue la phrase (SUBSTITUTIONS_ADOPTE, agents-file.mjs).',
    ].join('\n'));

    // Aucune des 8 sections gardées n'a disparu — ANCRÉ SUR L'EN-TÊTE (`^## `), comme
    // `adoption.test.mjs`. Sans cette boucle, la perte de « Mode apprentissage » (60 mots, la plus
    // petite des 8) ne se voyait QUE par la disparition accidentelle de `docs/APPRENTISSAGE.md`
    // dans le contrôle PRESENTS ci-dessous — un filet qui n'a pas été CONÇU pour ça, et qui
    // cesserait de mordre si `docs/APPRENTISSAGE.md` sortait un jour de `PRESENTS` (exactement le
    // raisonnement qui a fait sortir `docs/glossaire.md` de cette même liste, plus haut).
    for (const garde of GARDES) {
      assert.match(t, new RegExp(`^## .*${garde}`, 'm'), `${assistant} : « ${garde} » a disparu du rendu adopté — elle est de la méthode, elle DOIT rester`);
    }

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

// ── LE GARDE QUI TOUCHE LE DISQUE ─────────────────────────────────────────────────────────────
//
// Les deux tests ci-dessus jugent le RENDU contre une liste écrite à la main (`ABSENTS`). Ils ne
// peuvent rien dire d'un fichier dont l'existence dépend du PARCOURS et pas du rendu — et c'est
// exactement le cas de `docs/ETAT-DES-LIEUX.md` : cité par le bloc adopté depuis la tâche 3, posé
// par `--adopt` seulement depuis la tâche 6. Mesuré entre les deux : renvoi mort réel, reproductible,
// et invisible à tout contrôle qui ne regarde que des chaînes.
//
// Celui-ci ne lit aucune liste : il joue un `--adopt` pour de vrai, relève TOUS les `docs/…` que le
// bloc livré cite, et va voir sur le disque. Un renvoi ajouté demain vers un fichier que le parcours
// ne pose pas rougit ici sans que personne ait à penser à l'inscrire quelque part.
test('renvois morts — chaque `docs/…` cité par le bloc adopté existe VRAIMENT après --adopt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'renvois-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"deja-la","scripts":{"dev":"vite"}}');
  // ⛔ UN `AGENTS.md` PRÉEXISTANT, ET C'EST TOUT LE MONTAGE. Sans lui, le fichier est CRÉÉ et le
  // chemin de FUSION n'est jamais exercé — mesuré : la mutation « setup.mjs ne fusionne plus,
  // retour au .new » laissait ce test VERT, alors qu'il prétendait couvrir le fichier livré. Un
  // projet existant a presque toujours son AGENTS.md : c'est le cas nominal, pas un cas limite.
  const PERSO = '# Mes règles à moi\n\n- **pnpm, pas npm.**\n';
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), PERSO);
  execFileSync(process.execPath, [
    path.resolve('scripts/setup.mjs'), '--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills',
  ], { stdio: 'pipe' });

  const livre = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  // Montage : c'est bien le fichier FUSIONNÉ qu'on relève, pas un fichier fraîchement créé. Si la
  // méthode repartait en `.new`, `livre` ne serait que les règles perso et tout ce qui suit
  // tomberait — c'est ce qui rend le relevé ci-dessous une mesure du fichier RÉELLEMENT livré,
  // et pas d'un `renderAgentsFile()` rejoué en mémoire.
  assert.ok(livre.includes('- **pnpm, pas npm.**'), 'montage : les règles perso doivent avoir survécu à la fusion');
  assert.ok(livre.includes(MARK_START_PREFIX), 'montage : le bloc du kit doit être DANS le fichier livré, pas à côté dans un .new');
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md.new')), 'montage : un .new signifie que la méthode n\'est pas installée');
  // ── LE PÉRIMÈTRE, ET POURQUOI IL S'ARRÊTE LÀ ────────────────────────────────────────────────
  // Ce test ne lisait QUE le bloc d'AGENTS.md. Mesuré : `docs/glossaire.md` cite lui aussi
  // `docs/DOMAINS.md`, et il est au bout de la chaîne que le kit met le plus en avant —
  // COLLE-MOI (« /help … c'est le seul à retenir ») → help.md (« un mot qui bloque ? le
  // glossaire ») → glossaire.md. Le renvoi y est resté MORT sans qu'un seul test bronche.
  //
  // On balaye donc la DOCUMENTATION livrée : les deux fichiers qu'on tend au lecteur pour qu'il
  // les LISE. Les runbooks de `.claude/commands/` restent dehors, et ce n'est pas un oubli : ils
  // cochent des fichiers qu'ils CRÉENT eux-mêmes (`docs/PRD.md`, `docs/ROADMAP.md`…). Les citer
  // avant de les produire est leur fonctionnement normal, pas un renvoi mort — et les deux qui
  // comptaient ici (`/build`, `/next`) sont déjà gardés ailleurs (adoption.test.mjs).
  const SOURCES = {
    'AGENTS.md (bloc fusionné)': livre,
    'docs/glossaire.md': fs.readFileSync(path.join(dir, 'docs/glossaire.md'), 'utf8'),
  };
  const releve = (txt) => [...new Set([...txt.matchAll(/docs\/[A-Za-z0-9_./-]+/g)].map((m) => m[0].replace(/[.,;:)`]+$/, '')))];
  const parSource = Object.fromEntries(Object.entries(SOURCES).map(([nom, txt]) => [nom, releve(txt).sort()]));
  const cites = [...new Set(Object.values(parSource).flat())].sort();
  // Montage : un relevé vide rendrait le contrôle vrai à vide. Mesuré, le bloc adopté en cite 8.
  assert.ok(parSource['AGENTS.md (bloc fusionné)'].length >= 6,
    `montage : seulement ${parSource['AGENTS.md (bloc fusionné)'].length} chemins docs/ relevés — le bloc livré est vide ou tronqué`);
  assert.ok(cites.includes('docs/ETAT-DES-LIEUX.md'), 'montage : le renvoi que ce test existe pour couvrir a disparu du rendu');
  // Montage du SECOND balayage : sans lui, supprimer le glossaire du périmètre passerait inaperçu.
  assert.ok(parSource['docs/glossaire.md'].length >= 2,
    `montage : ${parSource['docs/glossaire.md'].length} chemins docs/ relevés dans le glossaire — il est vide, tronqué, ou plus livré`);

  // LA SEULE EXCEPTION, et elle est PROUVÉE plus bas, pas décrétée : `docs/agents/crew/` n'est pas
  // un renvoi mais une LÉGENDE — la phrase de `subagents-rule.md` énumère les dossiers d'agents des
  // trois assistants (« `.cursor/agents/` · `.claude/agents/` · `docs/agents/crew/` pour Codex »).
  // Sous claude-code, ce dossier n'existe pas — et n'a pas à exister : la phrase dit à qui il est.
  const LEGENDE = 'docs/agents/crew/';
  assert.equal(AGENTS_DIR.codex, 'docs/agents/crew',
    'l\'exception ne tient que tant que la légende dit vrai : si Codex change de dossier, cette ligne devient un vrai renvoi mort');

  const morts = cites.filter((c) => c !== LEGENDE && !fs.existsSync(path.join(dir, c)));
  const ou = (m) => Object.entries(parSource).filter(([, l]) => l.includes(m)).map(([nom]) => nom).join(', ');
  assert.deepEqual(morts, [], [
    'La documentation livrée dans un projet ADOPTÉ renvoie vers des fichiers que `--adopt` ne pose pas :',
    ...morts.map((m) => `  ${m}   ← cité par ${ou(m)}`),
    '',
    'Un renvoi mort est relu à CHAQUE message. Soit le parcours pose le fichier (setup.mjs), soit',
    'la phrase est substituée — SUBSTITUTIONS_ADOPTE (agents-file.mjs) pour le bloc AGENTS.md,',
    'adapterGlossaireAdopte (adoption.mjs) pour le glossaire. Jamais laissée en l\'état.',
  ].join('\n'));
});

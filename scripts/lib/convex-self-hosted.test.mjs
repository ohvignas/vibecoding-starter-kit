// scripts/lib/convex-self-hosted.test.mjs
// CONVEX AUTO-HÉBERGÉ : LA DOC OFFICIELLE + LE SKILL DES PIÈGES PAYÉS.
//
// Décision d'Antoine (2026-10-13) : les erreurs d'un vrai backend Convex self-hosted (index sur une
// table qui grossit → 8 h de panne, base SQLite qui enfle, `.collect()` non bornés, pas d'alerte)
// ne doivent PAS pouvoir se répéter chez les utilisateurs du kit. Deux choses, et pas une :
//   1. le guide officiel d'auto-hébergement est TRANSPORTÉ par le kit (`ai-context/convex/`), parce
//      que le cloud ne le couvre pas ;
//   2. un skill du kit (`convex-self-hosted`) porte les leçons — livré au projet et dans le plugin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitOwnedFiles } from './kit-owned.mjs';
import { resolveAssets } from './matrix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const SKILL = '.claude/skills/convex-self-hosted/SKILL.md';

test('self-hosted — le guide officiel est transporté par le kit et téléchargé par le script', () => {
  assert.ok(exists('ai-context/convex/self-hosting.md'), 'le guide d\'auto-hébergement doit être dans ai-context/convex/');
  assert.match(read('ai-context/convex/self-hosting.md'), /Self-hosting Convex/, 'c\'est bien le guide officiel');
  assert.match(read('scripts/download-ai-context.sh'), /convex-backend\/main\/self-hosted\/README\.md/,
    'le script de mise à jour doit re-télécharger le guide d\'auto-hébergement');
});

test('self-hosted — le skill porte les 10 pièges payés, pas une version édulcorée', () => {
  const t = read(SKILL);
  assert.match(t, /^---\n[\s\S]*?name: convex-self-hosted/m, 'frontmatter : name');
  assert.match(t, /^---\n[\s\S]*?description:/m, 'frontmatter : description (quand le charger)');
  for (const [motif, piege] of [
    [/index sur une table qui grossit/i, '1. index + backfill'],
    [/\.collect\(\)`? sans borne/i, '2. collect non borné'],
    [/db\.sqlite3.{0,40}grossit|grossit en silence/i, '3. sqlite qui enfle'],
    [/DOCUMENT_RETENTION_DELAY[^]*?courte à une valeur longue/i, '4. rétention irréversible'],
    [/EXPORT_STORAGE_GET_CONCURRENCY/, '5. exports (concurrence + préchargement)'],
    [/start_period/, '6. healthcheck / cold start'],
    [/instance-secret/, '7. secret dans docker top'],
    [/pendant que le backend tourne/i, '8. sqlite ouvert pendant l\'exécution'],
    [/documents[^]*?indexes|LES DEUX/i, '9. purge SQLite (deux tables)'],
    [/cgroup/, '10. la vérité mémoire vient du cgroup'],
  ]) assert.match(t, motif, `le skill doit couvrir le piège ${piege}`);
});

test('self-hosted — le skill impose la lecture d\'abord, aucun secret, la preuve, 3 tentatives', () => {
  const t = read(SKILL);
  assert.match(t, /READ-ONLY par défaut|lecture d'abord/i, 'audit read-only par défaut');
  assert.match(t, /Aucun (\*\*)?secret imprimé/i, 'aucun secret imprimé');
  assert.match(t, /masquer toute valeur ≥ 16|16 car/i, 'masquer les valeurs longues');
  assert.match(t, /ne pas toucher aux autres projets/i, 'ne pas toucher aux autres projets du serveur');
  assert.match(t, /Preuve obligatoire/i, 'chaque finding a sa preuve');
  assert.match(t, /3 tentatives max/i, '3 tentatives max puis BLOQUÉ');
  assert.match(t, /VACUUM INTO/, 'la procédure de sauvegarde exacte');
  assert.match(t, /quick_check/, 'vérifier la sauvegarde (quick_check)');
  // Le livrable : l'état des lieux, les findings P1/P2/P3, le verdict.
  for (const m of [/P1/, /P2/, /PROUVÉ/]) assert.match(t, m, `le skill doit exiger ${m}`);
});

test('self-hosted — livré au projet (Claude, stacks Convex) ET dans le plugin', () => {
  // Au scaffold, pour les stacks qui utilisent Convex.
  for (const s of ['saas', 'vitrine', 'mobile']) {
    assert.ok(resolveAssets(s, 'claude-code').copies.some((c) => c.from === '.claude/skills/convex-self-hosted'),
      `${s}/claude-code : le skill doit être copié dans le projet`);
  }
  assert.ok(!resolveAssets('desktop', 'claude-code').copies.some((c) => c.from === '.claude/skills/convex-self-hosted'),
    'desktop n\'utilise pas Convex : pas de skill self-hosted');
  // Au `--refresh`, pour les mêmes stacks.
  assert.ok(kitOwnedFiles('saas', 'claude-code').some((p) => p.to === '.claude/skills/convex-self-hosted/SKILL.md'),
    'saas : --refresh doit régénérer le skill');
  assert.ok(!kitOwnedFiles('desktop', 'claude-code').some((p) => p.to.includes('convex-self-hosted')),
    'desktop : rien à régénérer');
  // Dans le plugin (les 3 assistants en profitent via le dossier).
  assert.ok(exists('plugin/skills/convex-self-hosted/SKILL.md'), 'le plugin doit embarquer le skill (relance node scripts/build-plugin.mjs)');
  assert.equal(read('plugin/skills/convex-self-hosted/SKILL.md'), read(SKILL), 'copie exacte de la source');
});

test('self-hosted — les règles de stack y renvoient (saas · vitrine, les deux assistants)', () => {
  for (const f of ['stacks/saas/AGENTS.md', 'stacks/vitrine/AGENTS.md', '.claude/skills/stack-saas/SKILL.md', '.claude/skills/stack-vitrine/SKILL.md']) {
    assert.match(read(f), /convex-self-hosted/, `${f} : doit pointer vers le skill d'auto-hébergement`);
  }
});

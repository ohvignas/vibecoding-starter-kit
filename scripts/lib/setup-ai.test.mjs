import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStackManifest, SUPERPOWERS } from './matrix.mjs';
import { renderSetupAi } from './setup-ai.mjs';

const call = (stack, assistant) => renderSetupAi({
  stack, assistant, manifest: resolveStackManifest(stack, assistant),
  superpowersCmd: SUPERPOWERS[assistant],
});

test('SETUP-AI : plugins, skills, MCP, superpowers, design auto', () => {
  const md = call('saas', 'claude-code');
  assert.match(md, /\/plugin install convex@claude-plugins-official/);
  assert.match(md, /skills add better-auth\/skills.*-a claude-code/);
  assert.match(md, /shadcn/);
  assert.match(md, /plugin install superpowers/);           // section superpowers
  assert.match(md, /déjà installés par le wizard/i);        // section design
  assert.match(md, /shadcnblocks/i);                        // note shadcnblocks
  // Stitch (maquette IA) : section design avec clé API + MCP au niveau utilisateur (hors dépôt).
  assert.match(md, /clé API Stitch/i);
  assert.match(md, /MCP Stitch au niveau utilisateur/i);
  assert.match(md, /claude mcp add stitch/);              // commande user-scope pour claude-code
});

test('SETUP-AI mobile : MCP expo login requis', () => {
  assert.match(call('mobile', 'claude-code'), /expo.*login requis/);
});

test('SETUP-AI --no-skills : liste les commandes à lancer, ne ment pas', () => {
  const md = renderSetupAi({
    stack: 'saas', assistant: 'claude-code', manifest: resolveStackManifest('saas', 'claude-code'),
    superpowersCmd: SUPERPOWERS['claude-code'], skillsInstalled: false,
  });
  assert.ok(!md.includes('déjà installés par le wizard'), 'aucun faux ✅');
  assert.match(md, /PAS installés/);
  assert.match(md, /\[ \] `npx -y skills add better-auth\/skills/);          // skills stack en cases à cocher
  assert.match(md, /\[ \] `npx -y skills add github\.com\/anthropics\/skills/); // skills design en cases à cocher
});

test('SETUP-AI Cursor : jamais /mcp ni claude mcp add, mais Settings MCP', () => {
  const md = call('saas', 'cursor');
  assert.doesNotMatch(md, /lance `\/mcp`/);
  assert.doesNotMatch(md, /claude mcp add/);
  assert.match(md, /Settings.*MCP/i);
  assert.match(md, /superpowers:brainstorming/); // ligne de vérification du plugin superpowers (v6 : skill préfixé, plus de commande /brainstorm)
});

test('SETUP-AI Claude Code : /mcp reste correct', () => {
  const md = call('saas', 'claude-code');
  assert.match(md, /\/mcp/);
});

// ── LE MUR DE LA SECTION « Scripts package.json » ─────────────────────────────────────────────
// Mesuré : l'élève coche `"typecheck": "npm run typecheck --workspaces"` dans un `package.json`
// qui ne déclare pas de champ `workspaces` → `npm error No workspaces found!`, puis le hook
// affiche « ⚠ check typecheck : problème détecté ». Il a suivi la case à la lettre, et le kit
// accuse son code — exactement ce que le commentaire de `checks.mjs` interdit (« l'outil n'a pas
// démarré » ≠ « l'outil a trouvé un problème »). La case manquante est celle du champ lui-même.
test('SETUP-AI : une stack à deux applications fait déclarer `workspaces` AVANT ses scripts', () => {
  const md = call('vitrine', 'claude-code');
  const m = resolveStackManifest('vitrine', 'claude-code');
  assert.ok(m.workspaces.length, 'montage : la vitrine doit déclarer sa disposition');
  assert.match(md, /No workspaces found/, 'la case doit dire ce qui casse sans elle');
  // La liste vient du manifeste, elle n'est pas recopiée dans le rendu.
  assert.match(md, new RegExp(`"workspaces": ${JSON.stringify(m.workspaces).replace(/[[\]]/g, '\\$&')}`));
  // …et l'ordre compte : la case du champ doit précéder les cases de scripts qui en dépendent.
  assert.ok(md.indexOf('"workspaces"') < md.indexOf(`"typecheck": "${m.scripts.typecheck}"`), 'le champ doit être posé avant les scripts qui l\'exigent');
  // L'autre moitié du mur : une application qui ne déclare pas son script fait échouer la racine.
  assert.match(md, /doit déclarer \*\*ses\*\* scripts `typecheck` et `lint`/);
});

test('SETUP-AI : une stack mono-application ne parle jamais de workspaces', () => {
  for (const s of ['saas', 'mobile', 'desktop']) {
    assert.doesNotMatch(call(s, 'claude-code'), /workspaces/, `${s} : une seule application, la case n'a aucun sens`);
  }
});

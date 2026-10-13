// scripts/lib/hostinger.test.mjs
// DÉPLOIEMENT VPS (HOSTINGER) — ET LA RÈGLE QUI VA AVEC LE LIEN D'AFFILIATION.
//
// Décision d'Antoine (2026-10-13) : le VPS recommandé est Hostinger, via un lien d'affiliation
// (code AV10, 10 % de réduction). Deux propriétés, et la seconde n'est pas négociable :
//   1. les skills officiels Hostinger sont installés (web), les MCP sont proposés HORS du projet,
//      et la marche à suivre SSH/Docker/HTTPS existe — dans `/deploy`, dans le guide, et dans le
//      projet (`docs/A-FAIRE.md`) ;
//   2. le lien d'affiliation n'apparaît JAMAIS sans sa mention. Un lien affilié non déclaré est
//      une trahison de la confiance du lecteur : on le vérifie là où le lien est publié.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveStackManifest, SUPERPOWERS, HOSTINGER } from './matrix.mjs';
import { cheminRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const aFaire = (stack, assistant) => renderSetupAi({ stack, assistant, manifest: resolveStackManifest(stack, assistant), superpowersCmd: SUPERPOWERS[assistant] });

test('Hostinger — la source du lien : affiliation déclarée, code et réduction', () => {
  assert.match(HOSTINGER.url, /^https:\/\//, 'le lien doit être en HTTPS');
  assert.equal(HOSTINGER.code, 'AV10', 'le code de réduction');
  assert.match(HOSTINGER.reduction, /10\s*%/, 'la réduction annoncée');
  assert.match(HOSTINGER.disclosure, /affiliation/i, 'la mention d\'affiliation est obligatoire');
  assert.match(HOSTINGER.disclosure, /pas payé|pas de paiement/i, 'dire qu\'il n\'est pas payé pour le lien');
});

// Un lien affilié publié sans sa mention = tromperie. Le contrôle est de PROXIMITÉ : la mention
// doit se trouver dans les ~900 caractères qui précèdent le lien (la section qui le publie), pas
// perdue ailleurs dans la page.
function verifieLienDeclare(rel, texte) {
  const i = texte.indexOf(HOSTINGER.url);
  assert.ok(i > -1, `${rel} : le lien ${HOSTINGER.url} n'est pas publié`);
  const avant = texte.slice(Math.max(0, i - 900), i);
  assert.match(avant, /affiliation/i, `${rel} : le lien est publié SANS sa mention d'affiliation juste avant`);
  assert.ok(texte.includes(HOSTINGER.code), `${rel} : le code de réduction (${HOSTINGER.code}) n'accompagne pas le lien`);
}

test('Hostinger — le lien est publié AVEC sa mention, dans README, guide et /deploy', () => {
  verifieLienDeclare('README.md', read('README.md'));
  verifieLienDeclare('guides/05-deploy-vps-hostinger.md', read('guides/05-deploy-vps-hostinger.md'));
  verifieLienDeclare(cheminRunbook('deploy'), read(cheminRunbook('deploy')));
});

test('Hostinger — /deploy porte la marche à suivre SSH complète', () => {
  const t = read(cheminRunbook('deploy'));
  for (const [motif, quoi] of [
    [/VPS Hostinger \(SSH\)/, 'une section dédiée'],
    [/ssh (root@|deploy@)|clé SSH/i, 'l\'accès par clé SSH'],
    [/ufw|pare-feu/i, 'le durcissement (pare-feu)'],
    [/fail2ban/i, 'le durcissement (fail2ban)'],
    [/get\.docker\.com|Docker Compose/i, 'Docker'],
    [/Caddy/, 'le reverse-proxy HTTPS'],
    [/A\b.*IP du VPS|enregistrement \*\*A\*\*/, 'le DNS'],
    [/sauvegarde/i, 'les sauvegardes'],
    [/ssh-mcp/, 'le MCP SSH (documenté, optionnel)'],
    [/mcp\.hostinger\.com/, 'le MCP officiel Hostinger'],
  ]) assert.match(t, motif, `/deploy, section VPS : il manque ${quoi}`);
});

test('Hostinger — skills officiels installés sur les stacks WEB, absents ailleurs', () => {
  for (const s of ['saas', 'vitrine']) {
    const spec = resolveStackManifest(s, 'cursor').skills.find((k) => k.repo === 'hostinger/hostinger-agent-skills');
    assert.ok(spec, `${s} : le skill officiel Hostinger doit être installé`);
    assert.deepEqual(spec.skills, ['vps', 'dns', 'domains'], `${s} : seuls les 3 domaines utiles, jamais --all`);
  }
  for (const s of ['mobile', 'desktop']) {
    assert.equal(resolveStackManifest(s, 'cursor').skills.some((k) => k.repo === 'hostinger/hostinger-agent-skills'), false, `${s} : pas de skill Hostinger (pas de VPS pour ce type d'app)`);
  }
});

test('Hostinger — les MCP restent HORS du projet (jeton, accès SSH : jamais commités)', () => {
  for (const s of ['saas', 'vitrine']) {
    const m = resolveStackManifest(s, 'cursor');
    assert.equal('hostinger' in m.mcp, false, `${s} : le MCP Hostinger n'entre pas dans .mcp.json`);
    assert.equal('ssh' in m.mcp, false, `${s} : le MCP SSH n'entre pas dans .mcp.json`);
  }
});

test('Hostinger — le projet reçoit le lien (web seulement), avec la mention', () => {
  for (const s of ['saas', 'vitrine']) {
    const t = aFaire(s, 'cursor');
    verifieLienDeclare(`A-FAIRE ${s}`, t);
    assert.match(t, /Déploiement sur un VPS/i, `${s} : la section déploiement doit exister`);
    assert.match(t, /skills .*(déjà installés|DÉJÀ installés)/i, `${s} : dire que les skills sont déjà posés`);
  }
  for (const s of ['mobile', 'desktop']) {
    assert.doesNotMatch(aFaire(s, 'cursor'), /hostg\.xyz|Hostinger/, `${s} : pas de déploiement VPS (pas de serveur pour cette stack)`);
  }
});

// ── « METTRE EN LIVE » = OUVRIR LA PAGE ────────────────────────────────────────────────────────
// Exigence d'Antoine (2026-10-13) : quand l'utilisateur demande de mettre son app en ligne, l'IA
// ne se contente pas de citer le lien — elle OUVRE la page. Sur les trois surfaces qui la pilotent
// (`/deploy`, le guide, et `docs/A-FAIRE.md` dans le projet), l'ordre doit être explicite, avec les
// commandes d'ouverture des trois OS. Sans cette exigence, « voici le lien » reprend le dessus.
test('Hostinger — déployer OUVRE la page (exigence explicite sur les 3 surfaces)', () => {
  const nu = (t) => t.replace(/[*_`]/g, ''); // la mise en forme ne doit pas casser le contrôle
  const surfaces = [
    ['/deploy', read(cheminRunbook('deploy'))],
    ['guide', read('guides/05-deploy-vps-hostinger.md')],
    ['A-FAIRE', aFaire('saas', 'cursor')],
  ];
  for (const [nom, brut] of surfaces) {
    const t = nu(brut);
    assert.match(t, /ouvre/i, `${nom} : doit dire d'OUVRIR la page`);
    assert.match(t, /\bopen\b/, `${nom} : la commande « open » (macOS) doit être donnée`);
    assert.match(t, /xdg-open/, `${nom} : la commande « xdg-open » (Linux) doit être donnée`);
    assert.match(t, /hostg\.xyz\/SHK4I/, `${nom} : le lien exact`);
  }
  // L'interdit de « simplement citer » : porté par les surfaces qui dictent le geste à l'IA.
  for (const [nom, brut] of [surfaces[0], surfaces[2]]) {
    assert.match(nu(brut), /contentes?\s+(?:pas|jamais)\s+de\s+(?:la\s+)?citer|citation/i,
      `${nom} : interdire de se contenter de citier/citer le lien`);
  }
});

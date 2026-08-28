import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('00-project.mdc est une règle Always minuscule', () => {
  const t = fs.readFileSync('templates/cursor/rules/00-project.mdc', 'utf8');
  assert.match(t, /alwaysApply:\s*true/);
  assert.match(t, /secret/i);
  assert.ok(t.split('\n').length < 25, 'règle courte');
});

// ⛔ CE CONTRÔLE A ÉTÉ ÉCRIT MENTEUR, ET C'EST LE 13ᵉ INSTRUMENT MENTEUR DU CHANTIER.
// Il annonçait « frontmatter globs » et ne pouvait pas échouer pour cette raison-là, par DEUX
// causes qui s'additionnaient :
//   1. `assert.match(t, /globs:/)` est satisfait par une clé `globs:` **VIDE** — une règle qui ne
//      s'attache à RIEN passait le test qui prétend vérifier son attachement ;
//   2. le needle était cherché dans TOUT LE FICHIER, pas sur la ligne `globs:` — or `dashboard/`
//      et `site/` figurent aussi dans le CORPS des règles.
// Mesuré, globs vidés une règle à la fois : `build-time.mdc`, `convex.mdc` et `better-auth.mdc`
// restaient VERTES. `build-time.mdc` est la règle qui protège le SEO de la stack : elle pouvait
// perdre son attachement sans qu'un test bronche. Et les trois qui rougissaient le faisaient PAR
// ACCIDENT — leur needle n'existait simplement pas dans le corps.
// On lit donc LA LIGNE, et c'est elle qu'on interroge.
const ligneGlobs = (texte) => texte.split('\n').find((l) => /^globs:/.test(l))?.replace(/^globs:/, '').trim() ?? '';
const globsDe = (texte) => ligneGlobs(texte).split(',').map((g) => g.trim()).filter(Boolean);

test('règles auto-attachées : frontmatter globs + alwaysApply:false', () => {
  const cases = [
    ['saas/convex.mdc', 'convex/\\*\\*'],
    ['saas/tanstack.mdc', 'src/routes/\\*\\*'],
    ['mobile/expo.mdc', 'app/\\*\\*'],
    ['desktop/electron-security.mdc', 'preload'],
    ['vitrine/astro.mdc', 'astro\\.config'],
    ['vitrine/shadcn-islands.mdc', 'src/components'],
    ['vitrine/seo-geo.mdc', 'src/pages'],
    // La règle qui protège le SEO de la vitrine (lecture Convex au BUILD). Ses globs portent les
    // DEUX applications : c'est la frontière `site/` ↔ `dashboard/` qu'elle enseigne, et une règle
    // attachée à une seule des deux ne dirait que la moitié de la consigne.
    ['vitrine/build-time.mdc', 'site/'],
    // Les deux règles reprises de `saas/` : sans globs, elles ne s'attachent à rien et la stack
    // livrerait un backend et une auth que Cursor ne charge jamais. Leurs globs visent
    // `dashboard/` — c'est là que vivent le schéma Convex et Better Auth.
    ['vitrine/convex.mdc', 'dashboard/convex'],
    ['vitrine/better-auth.mdc', 'dashboard/'],
  ];
  for (const [f, needle] of cases) {
    const t = fs.readFileSync(`templates/cursor/rules/${f}`, 'utf8');
    assert.match(t, /alwaysApply:\s*false/, f);
    const globs = ligneGlobs(t);
    assert.ok(globs.length, `${f} : clé \`globs:\` absente ou VIDE — Cursor ne chargera jamais cette règle`);
    assert.match(globs, new RegExp(needle), `${f} : la LIGNE globs (« ${globs} ») ne vise pas ${needle}`);
  }
});

// ── LES GLOBS DE LA VITRINE VISENT UNE APPLICATION, JAMAIS LA RACINE ──────────────────────────
// La stack porte DEUX applications (`site/` et `dashboard/`) : depuis, la racine ne contient plus
// ni `src/`, ni `public/`, ni `astro.config`. Trois règles y ont survécu avec des globs
// racine-relatifs (`src/**`, `src/pages/**`, `src/components/**`) — livrées, et attachées à AUCUN
// fichier. Rien ne confrontait un glob à la disposition réelle du projet : les remettre
// aujourd'hui laisserait la suite entière verte. C'est ce trou-là que ce test ferme.
test('vitrine : chaque glob vise `site/` ou `dashboard/`, jamais la racine', () => {
  const dir = 'templates/cursor/rules/vitrine';
  const regles = fs.readdirSync(dir).filter((f) => f.endsWith('.mdc')).sort();
  assert.ok(regles.length >= 6, `montage : ${regles.length} règle(s) lue(s) dans ${dir} — le scan ne porte sur rien`);
  const fautes = [];
  for (const f of regles) {
    const globs = globsDe(fs.readFileSync(`${dir}/${f}`, 'utf8'));
    if (!globs.length) { fautes.push(`${f} : clé \`globs:\` absente ou vide`); continue; }
    for (const g of globs) {
      // `**/…` traverse les deux applications sans les nommer (`typescript.mdc`) : c'est la seule
      // forme racine-relative qui s'attache encore à quelque chose.
      if (g.startsWith('**/')) continue;
      if (!/^(site|dashboard)\//.test(g)) fautes.push(`${f} : « ${g} » ne vise ni \`site/\` ni \`dashboard/\``);
    }
  }
  assert.deepEqual(fautes, [], `Globs qui ne s'attacheront à rien — la racine ne porte plus l'application :\n${fautes.join('\n')}`);
});

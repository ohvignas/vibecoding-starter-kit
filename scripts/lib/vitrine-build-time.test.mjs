// scripts/lib/vitrine-build-time.test.mjs
// TÂCHE 4 — LA RÈGLE QUI PROTÈGE LE SEO, ET LE GARDE QUI LA TIENT.
//
// La stack vitrine porte DEUX applications sur la même base Convex : `site/` (Astro, public) et
// `dashboard/` (TanStack Start, privé). Le contenu se lit donc des deux côtés — mais pas de la
// même façon, et c'est la seule erreur de ce lot qui coûterait vraiment cher :
//
//   · `site/`      → au BUILD, client serveur (`ConvexHttpClient`), frontmatter `.astro` ou
//                    `getStaticPaths()`. Le HTML part du serveur DÉJÀ REMPLI.
//   · `dashboard/` → `useQuery` / `ConvexProvider`, le temps réel du navigateur. Personne
//                    n'indexe cette page, elle a le droit d'arriver vide et de se remplir après.
//
// Un `useQuery` dans une page publique ne casse rien de visible : la page s'affiche, l'humain qui
// la regarde voit son contenu. Ce qui tombe, c'est ce que personne ne regarde — le HTML SERVI est
// vide, le crawler lit une coquille, et le JSON-LD que la stack met un point d'honneur à écrire
// n'a plus rien à décrire. Or le SEO EST la raison d'être de cette stack : la panne est totale et
// silencieuse.
//
// ⛔ CE GARDE CITE LA RAISON, IL N'INTERDIT PAS UNE CHAÎNE. Deux tests distincts, parce que ce
// sont deux défauts distincts :
//   1. aucun fichier livré pour la vitrine n'ENSEIGNE le hook côté public (le scan) ;
//   2. la règle est ÉCRITE aux deux endroits que l'IA lit, et elle dit POURQUOI (le contenu).
// Sans le (2), quelqu'un de bien intentionné qui trouve la règle trop verbeuse la réduirait à
// « n'utilise pas useQuery » — une interdiction sans motif se contourne à la première bonne
// raison. Le (2) rougit si le motif disparaît.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { puceDeStack, SCAFFOLD_MD } from './puce-scaffold.mjs';

const RACINE = path.resolve(import.meta.dirname, '..', '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

// Les deux API de NAVIGATEUR de Convex. Elles ne sont pas « mauvaises » : elles sont mauvaises
// ICI. C'est pourquoi le garde ne peut pas être un simple `doesNotMatch` sur tout le dépôt —
// `stacks/saas`, `stacks/mobile` et leurs règles les enseignent, à raison.
const CLIENT_NAVIGATEUR = /\buseQuery\b|\bConvexProvider\b/;
// Ce qui désigne le SITE PUBLIC — le seul endroit où ces deux API sont une faute.
const PUBLIC = /site\/|pages? publiques?|\.astro\b|getStaticPaths|frontmatter/i;
// Ce qui fait d'une ligne une INTERDICTION plutôt qu'un enseignement.
const INTERDIT = /⛔|jamais|interdit|proscri|banni/i;
// `dashboard/` AVEC SA BARRE : le répertoire de l'application, pas le nom commun. Mesuré :
// « Pour afficher les articles publiés depuis le dashboard, lis-les avec `useQuery` » passait
// VERTE — « le dashboard » y est la SOURCE des données, pas la destination du code.
const DASHBOARD_DIR = /`?dashboard\//;
// …et il doit être RATTACHÉ au hook, par l'une des deux seules formes qui disent où le hook VIT :
const LOCALISE = /^[\s\-*\d.•⛔ℹ️⚠️`*]*dans\s+`?dashboard\//i;   // « Dans `dashboard/`, … »
const CONFINE = /\b(r[ée]serv|uniquement|seulement|exclusivement)/i; // « réservé au `dashboard/` »

// ⛔ LA POSITION ET LE RATTACHEMENT FONT LE SENS, PAS LA PRÉSENCE DES MOTS. Trois exonérations
// ont été mesurées contournables, chacune par une ligne qui ENSEIGNE :
//   « Dans `site/…`, lis les articles avec `useQuery` — le même code que dans le dashboard. »
//   « Dans `site/…` : `useQuery(api.articles.list)` — jamais besoin de rebuild. »
//   « Pour afficher les articles publiés depuis le dashboard, lis-les avec `useQuery`. »
// Le mot d'exonération était là ; il ne portait pas sur le hook.
//
// ⚠️ ET C'EST UNE LISTE BLANCHE, PAS UNE LISTE NOIRE — l'asymétrie est tout le sujet. Une liste
// noire ne clôt jamais une classe : il reste une infinité de façons de nier ou de contourner.
// Une liste blanche, si : le DÉFAUT est la faute, et seules deux formes étroites exonèrent.
// Une formulation légitime non reconnue rougit — faux rouge, le bon côté de l'erreur ici.
function legitime(l) {
  const hook = l.search(CLIENT_NAVIGATEUR);
  const interdit = l.search(INTERDIT);
  const pub = l.search(PUBLIC);
  // 1. la règle qui nomme ce qu'elle refuse : l'interdiction précède le hook.
  if (interdit >= 0 && interdit < hook) return true;
  // 2. le hook rattaché à l'app privée — et le site public n'est pas nommé avant lui.
  if (pub >= 0 && pub < hook) return false;
  return DASHBOARD_DIR.test(l) && (LOCALISE.test(l) || CONFINE.test(l));
}

// `lignes` = [[numéro, texte]] — le périmètre est décidé par l'appelant (fichier entier, ou
// seulement les paragraphes qui parlent du site public), le verdict est le même partout.
function fautes(nom, lignes) {
  return lignes
    .filter(([, l]) => CLIENT_NAVIGATEUR.test(l) && !legitime(l))
    .map(([n, l]) => `${nom}:${n} — ${l.trim().slice(0, 120)}`);
}

function marcher(rel, acc = []) {
  const abs = path.join(RACINE, rel);
  if (!fs.existsSync(abs)) return acc;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) marcher(r, acc);
    else if (/\.(md|mdc|yml|json)$/.test(e.name)) acc.push(r);
  }
  return acc;
}
// Tout ce que le kit livre POUR la vitrine — dérivé du chemin, jamais recopié : les fichiers que
// les tâches suivantes ajouteront (règles Cursor, exemple, doc de lancement) entreront tout seuls.
const KIT = () => [
  ...marcher('stacks'), ...marcher('templates'), ...marcher('.claude/skills'),
  ...marcher('playbook'), ...marcher('guides'), ...marcher('cursor-plugin'),
];
const numerotees = (t) => t.split('\n').map((l, i) => [i + 1, l]);

// 🔴 LE CORPUS EST UNE CLASSE, PAS UNE LISTE DE FICHIERS — et c'est la deuxième fois qu'il fallait
// le monter d'un cran. Version 1 : les fichiers dont le CHEMIN dit « vitrine » — `07-scaffold.md`
// en était absent (il ne porte « vitrine » que dans son contenu). Version 2 : les mêmes, plus la
// puce vitrine de `07-scaffold.md` — le corpus avait grandi d'UN FICHIER, pas d'une classe, et la
// même phrase restait VERTE dans `build.md`, `new-feature.md`, `06-roadmap.md`,
// `init-vibecoding/02-scaffold.md`, `subagents/critique-donnees.md`. Le pire étant `build.md` :
// `07-scaffold.md` INSTALLE, `build.md` ÉCRIT LES PAGES — c'est là que le `useQuery` atterrit
// vraiment dans `site/src/pages/*.astro`. Porte du garage fermée, porte d'entrée ouverte.
//
// La classe, maintenant : TOUT fichier livré, et dans chacun TOUT PASSAGE QUI PARLE DU SITE
// PUBLIC. Deux périmètres, parce que le contexte n'est pas connu de la même façon :
//   · un fichier de la vitrine (chemin `vitrine`, ou la puce vitrine du runbook) → lu EN ENTIER :
//     tout y parle de cette stack, une ligne sans contexte y est déjà une faute ;
//   · tout autre fichier livré → seulement les PARAGRAPHES qui référencent le site public. Les
//     stacks saas et mobile enseignent `useQuery` à raison ; on ne juge que ce qui vise `site/`.
function sourcesVitrine() {
  const parChemin = KIT().filter((f) => /vitrine/.test(f));
  return [
    ...parChemin.map((f) => [f, numerotees(lire(f))]),
    [`${SCAFFOLD_MD} (puce vitrine)`, puceDeStack(RACINE, 'vitrine').map((l, i) => [i + 1, l])],
  ];
}
// Les paragraphes d'un texte qui référencent le site public. Un paragraphe = des lignes
// consécutives non vides : c'est l'unité qui porte le contexte (« Pour la vitrine, dans `site/` :
// … lis avec `useQuery` » se juge en entier, alors qu'une lecture ligne à ligne raterait la
// seconde). Factorisé pour être jouable sur une chaîne en mémoire : c'est ce qui permet de
// prouver la CLASSE sans dépendre de ce qu'un fichier contient aujourd'hui.
export function passagesSitePublic(texte) {
  const retenues = [];
  let para = [];
  const vider = () => {
    if (para.some(([, l]) => PUBLIC.test(l))) retenues.push(...para);
    para = [];
  };
  for (const e of numerotees(texte)) { if (e[1].trim()) para.push(e); else vider(); }
  vider();
  return retenues;
}
function sourcesQuiParlentDuSitePublic() {
  return KIT().filter((x) => !/vitrine/.test(x))
    .map((f) => [`${f} (passages sur le site public)`, passagesSitePublic(lire(f))])
    .filter(([, l]) => l.length);
}
const SOURCES = () => [...sourcesVitrine(), ...sourcesQuiParlentDuSitePublic()];

const REGLE = ['stacks/vitrine/AGENTS.md', 'templates/cursor/rules/vitrine/build-time.mdc'];

// ── LE GARDE SAIT-IL ÉCHOUER ? ────────────────────────────────────────────────────────────────
// Le scan ci-dessous porte sur des fichiers qui, aujourd'hui, ne contiennent AUCUN des deux
// hooks : il est vert sans rien avoir eu à juger. C'est la forme exacte du défaut récurrent de ce
// dépôt — un garde qui ne peut pas échouer pour la raison qu'il annonce. On lui donne donc de
// quoi échouer, écrit ici, et on exige qu'il le voie.
test('T4 — le détecteur voit le piège, et laisse passer les deux emplois légitimes', () => {
  const piegés = [
    ['une page publique qui lit en direct', 'const articles = useQuery(api.articles.list) ?? [];'],
    ['un layout public enveloppé', '<ConvexProvider client={convex}><Layout /></ConvexProvider>'],
    ['une consigne, sans code', 'Dans `site/src/pages/blog.astro`, lis les articles avec `useQuery`.'],
    // LES DEUX CONTOURNEMENTS MESURÉS de la version « liste blanche de mots » : elles ENSEIGNENT
    // le hook pour le site public tout en citant, plus loin sur la ligne, un mot qui exonérait.
    ['un enseignement qui cite `dashboard` en fin de ligne', 'Dans `site/src/pages/blog.astro`, lis les articles avec `useQuery` — le même code que dans le dashboard.'],
    ['un enseignement qui cite `jamais` APRÈS le hook', 'Dans `site/…` : `useQuery(api.articles.list)` — jamais besoin de rebuild.'],
    ['une consigne du runbook de scaffold', 'Dans `site/`, lis les articles avec `const articles = useQuery(api.articles.list)` et enveloppe la page dans `<ConvexProvider>`.'],
    ['un hook sans aucun contexte — l\'ambiguïté compte comme une faute', 'Lis les articles avec `useQuery`.'],
    // `dashboard` y est la SOURCE des données, pas la destination du code : le marqueur est
    // présent, il n'est pas rattaché au hook. Mesuré vert avant le rattachement.
    ['`dashboard` comme source, pas comme destination', 'Pour afficher les articles publiés depuis le dashboard, lis-les avec `useQuery`.'],
    ['la même, avec la barre mais toujours sans rattachement', 'Pour afficher les articles publiés depuis le `dashboard/`, lis-les avec `useQuery`.'],
  ];
  for (const [quoi, ligne] of piegés) {
    assert.deepEqual(fautes('faux.md', [[1, ligne]]).length, 1, `le détecteur laisse passer ${quoi} :\n  ${ligne}`);
  }
  const legitimes = [
    'Dans `dashboard/`, lis les données avec `useQuery` (réactif).',
    '⛔ Jamais `useQuery` ni `ConvexProvider` dans une page publique.',
    '`useQuery` / `ConvexProvider` = `dashboard/` uniquement : privé, temps réel, jamais indexé.',
  ];
  for (const ligne of legitimes) {
    assert.deepEqual(fautes('faux.md', [[1, ligne]]), [], `le détecteur rougit sur un emploi légitime :\n  ${ligne}`);
  }
});

// ── LE SCAN ───────────────────────────────────────────────────────────────────────────────────
test('T4 — aucun fichier livré pour la vitrine n\'enseigne `useQuery`/`ConvexProvider` côté public', () => {
  const sources = SOURCES();
  const noms = sources.map(([n]) => n);
  // Garde de montage : un corpus vide rendrait le scan vert à vide. On exige les fichiers de la
  // stack, dont la puce vitrine du runbook de scaffold. ⚠️ AUCUN fichier tiers n'est nommé ici :
  // `build.md` ne parle pas du site public AUJOURD'HUI, donc il n'est pas dans le corpus — il y
  // entre à la seconde où quelqu'un y écrit `site/`. C'est précisément la classe, et elle est
  // prouvée par le test « la CLASSE » ci-dessous, pas par une liste de noms qui se périme.
  for (const f of [...REGLE, 'templates/examples/vitrine.md', `${SCAFFOLD_MD} (puce vitrine)`]) {
    assert.ok(noms.includes(f), `montage : ${f} n'est pas dans le corpus scanné (${noms.length} sources)`);
  }
  const trouvees = sources.flatMap(([n, l]) => fautes(n, l));
  assert.deepEqual(trouvees, [], [
    'Un fichier livré pour la vitrine enseigne un hook de NAVIGATEUR pour le site public :',
    ...trouvees.map((t) => `  ${t}`),
    '',
    'POURQUOI c\'est interdit, et pas seulement « une chaîne bannie » : `useQuery` et',
    '`ConvexProvider` ne s\'exécutent que dans le navigateur. Le contenu arrive APRÈS le',
    'chargement ; le HTML servi au crawler est vide, et le JSON-LD n\'a plus rien à décrire.',
    'Le SEO est la raison d\'être de cette stack : cette page ne serait indexée par personne.',
    '',
    'Ce qu\'il faut écrire à la place : lecture AU BUILD, client serveur `ConvexHttpClient`,',
    'dans le frontmatter `.astro` ou `getStaticPaths()`. `useQuery` reste bon dans `dashboard/`.',
  ].join('\n'));
});

// ── LA CLASSE, PAS UNE LISTE DE FICHIERS ──────────────────────────────────────────────────────
// Deux fois le corpus a grandi d'UN fichier au lieu d'une classe. Ce test-ci ne nomme aucun
// fichier : il prend un runbook qui ne parle PAS du site public aujourd'hui, y injecte le passage
// piégé, et exige que le périmètre l'attrape. Un runbook ajouté demain est couvert sans qu'on
// touche à quoi que ce soit — c'est ce qu'une liste de noms ne peut pas promettre.
test('T4 — tout passage qui parle du site public entre dans le périmètre, quel que soit son fichier', () => {
  const tiers = 'templates/commands/build.md';
  const texte = lire(tiers);
  assert.deepEqual(fautes(tiers, passagesSitePublic(texte)), [], `montage : ${tiers} est déjà en faute`);

  const piege = `${texte}\n\n## Écrire une page\nDans \`site/src/pages/blog.astro\`, lis les articles avec \`useQuery(api.articles.list)\`\net enveloppe la page dans \`<ConvexProvider>\`.\n`;
  const vues = fautes(tiers, passagesSitePublic(piege));
  assert.equal(vues.length, 2, `le passage piégé injecté dans ${tiers} doit être vu (2 lignes fautives), vu : ${JSON.stringify(vues)}`);

  // …et le même passage SANS référence au site public reste hors périmètre : ce garde ne bannit
  // pas `useQuery` du kit, il protège les pages publiques. `saas` et `mobile` l'enseignent à raison.
  const horsSujet = `${texte}\n\nDans \`dashboard/\`, lis les données avec \`useQuery\` (réactif).\n`;
  assert.deepEqual(fautes(tiers, passagesSitePublic(horsSujet)), [], 'un passage sur l\'app privée ne doit pas être jugé');
});

// ── LA RÈGLE EST ÉCRITE, ET ELLE DIT POURQUOI ─────────────────────────────────────────────────
// CHAQUE fichier, pas leur concaténation : une IA n'en lit souvent qu'un seul (Cursor charge la
// règle `.mdc` par ses globs, Claude Code lit `AGENTS-stack.md`). Un contrôle sur la somme
// laisserait la consigne disparaître de l'un des deux sans un mot.
//
// …ET DANS LA SECTION, PAS DANS LE FICHIER. Mesuré : en retirant « le JSON-LD n'aurait plus rien
// à décrire » de la règle d'`AGENTS.md`, le test restait VERT — le fichier parle de JSON-LD
// ailleurs (section GEO), et un contrôle à l'échelle du fichier créditait la règle du vocabulaire
// de ses voisines. Une règle doit se suffire à elle-même : l'IA qui la charge ne lit que sa
// section. On isole donc le bloc qui porte l'interdiction, et c'est LUI qu'on interroge.
function blocDeLaRegle(rel) {
  const texte = lire(rel);
  // Un `.mdc` est mono-sujet : tout le corps est la règle. Un `.md` de stack est découpé en
  // sections `##` — on garde celle qui porte l'interdiction.
  const morceaux = /^#{1,3} /m.test(texte) ? texte.split(/^(?=#{1,3} )/m) : [texte];
  const porteurs = morceaux.filter((m) => CLIENT_NAVIGATEUR.test(m));
  assert.equal(porteurs.length, 1, `${rel} : la règle build-time doit vivre dans UNE section, trouvée ${porteurs.length} fois`);
  return porteurs[0];
}

test('T4 — la règle build-time est écrite aux DEUX endroits, avec son motif', () => {
  const EXIGE = [
    [/useQuery/, 'nommer le hook interdit'],
    [/ConvexProvider/, 'nommer le provider interdit'],
    [/au\s+build/i, 'dire QUAND le site public lit Convex'],
    [/frontmatter|getStaticPaths/, 'dire OÙ : frontmatter `.astro` ou `getStaticPaths()`'],
    [/dashboard\//, 'dire où `useQuery` reste bon — sinon la règle se lit comme « Convex est interdit »'],
    // ⚠️ `\b` OBLIGATOIRE : « vide » est un morceau de « ConvexPro**vide**r ». Sans les bornes, le
    // motif était satisfait par le nom de l'API qu'il interdit — retirer la raison laissait le
    // garde vert (mesuré). L'instrument mentait sur ce qu'il mesurait.
    [/HTML/, 'LE MOTIF : nommer ce qui casse — le HTML servi'],
    [/\bvide\b/i, 'LE MOTIF : ce HTML serait vide'],
    [/JSON-LD/, 'LE MOTIF : le JSON-LD n\'aurait plus rien à décrire'],
  ];
  const manques = [];
  for (const f of REGLE) {
    const t = blocDeLaRegle(f);
    for (const [re, pourquoi] of EXIGE) if (!re.test(t)) manques.push(`${f} : ${pourquoi} (${re})`);
  }
  assert.deepEqual(manques, [], [
    'La règle qui protège le SEO a perdu une pièce :',
    ...manques.map((m) => `  ${m}`),
    '',
    'Une interdiction sans motif se contourne à la première bonne raison. Celle-ci doit dire',
    'ce qu\'elle refuse, par quoi le remplacer, et ce qui casse si on passe outre.',
  ].join('\n'));
});

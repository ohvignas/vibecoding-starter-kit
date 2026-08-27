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

const RACINE = path.resolve(import.meta.dirname, '..', '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

// Les deux API de NAVIGATEUR de Convex. Elles ne sont pas « mauvaises » : elles sont mauvaises
// ICI. C'est pourquoi le garde ne peut pas être un simple `doesNotMatch` sur tout le dépôt —
// `stacks/saas`, `stacks/mobile` et leurs règles les enseignent, à raison.
const CLIENT_NAVIGATEUR = /\buseQuery\b|\bConvexProvider\b/;
// Deux emplois légitimes dans un fichier de la vitrine, et deux seulement :
//   · la ligne parle du `dashboard/` — l'app privée, où le temps réel est le bon outil ;
//   · la ligne EST l'interdiction — une règle doit pouvoir nommer ce qu'elle refuse, sinon le kit
//     ne peut plus mettre en garde contre rien (même exception que MISE_EN_GARDE, faits-stacks).
// Tout le reste — un extrait de code, un exemple de page, un « puis lis avec useQuery » — est un
// enseignement destiné au site public, et c'est exactement ce qu'on refuse.
const LEGITIME = /dashboard|jamais|interdit|⛔|réserv/i;

function fautes(nom, texte) {
  const out = [];
  texte.split('\n').forEach((l, i) => {
    if (!CLIENT_NAVIGATEUR.test(l) || LEGITIME.test(l)) return;
    out.push(`${nom}:${i + 1} — ${l.trim().slice(0, 120)}`);
  });
  return out;
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
const FICHIERS_VITRINE = () => [
  ...marcher('stacks'), ...marcher('templates'), ...marcher('.claude/skills'),
  ...marcher('playbook'), ...marcher('guides'), ...marcher('cursor-plugin'),
].filter((f) => /vitrine/.test(f));

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
  ];
  for (const [quoi, ligne] of piegés) {
    assert.deepEqual(fautes('faux.md', ligne).length, 1, `le détecteur laisse passer ${quoi} :\n  ${ligne}`);
  }
  const legitimes = [
    'Dans `dashboard/`, lis les données avec `useQuery` (réactif).',
    '⛔ Jamais `useQuery` ni `ConvexProvider` dans une page publique.',
    '`useQuery` / `ConvexProvider` sont réservés à l\'application privée.',
  ];
  for (const ligne of legitimes) {
    assert.deepEqual(fautes('faux.md', ligne), [], `le détecteur rougit sur un emploi légitime :\n  ${ligne}`);
  }
});

// ── LE SCAN ───────────────────────────────────────────────────────────────────────────────────
test('T4 — aucun fichier livré pour la vitrine n\'enseigne `useQuery`/`ConvexProvider` côté public', () => {
  const fichiers = FICHIERS_VITRINE();
  // Garde de montage : un corpus vide rendrait le scan vert à vide, et il rétrécit tout seul si
  // quelqu'un renomme un dossier. On exige les trois fichiers que la règle vise vraiment.
  for (const f of [...REGLE, 'templates/examples/vitrine.md']) {
    assert.ok(fichiers.includes(f), `montage : ${f} n'est pas dans le corpus scanné (${fichiers.length} fichiers)`);
  }
  const trouvees = fichiers.flatMap((f) => fautes(f, lire(f)));
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

// scripts/lib/promesses-livrees.test.mjs
// CE QU'UN FICHIER LIVRÉ PROMET DOIT EXISTER CHEZ CELUI QUI LE LIT.
//
// Le kit a deux mondes qui se ressemblent : le DÉPÔT (où vivent `scripts/`, `templates/`,
// `stacks/`) et le PROJET GÉNÉRÉ (où rien de tout ça n'arrive). Un fichier écrit dans le dépôt et
// livré dans le projet hérite du vocabulaire du dépôt — et personne ne le voit, parce que le
// chemin cité EXISTE, ici. Il ne manque que chez l'utilisateur.
//
// Quatre défauts de cette famille ont traversé 418 tests verts, tous mesurés le 2026-08-04 :
//   · `ai-context/README.md` disait « lance `bash scripts/download-ai-context.sh` » — script jamais
//     livré. C'était le SEUL moyen de mise à jour indiqué, et il ne marchait chez personne.
//   · trois `SKILL.md` de stack renvoyaient « (dans le dépôt du kit : `stacks/…/AGENTS.md`) ».
//   · `ai-context/electron/README.md` disait « Voir `stacks/desktop/README.md` » — sans même la
//     mention « dépôt du kit » : une instruction franche vers un fichier absent.
//   · `ai-context/` n'était rafraîchi par RIEN (voir le second test).
//
// D10 (`commands.test.mjs`) tient déjà cette propriété pour les runbooks. Elle vaut pour TOUT ce
// que le projet reçoit : skills de stack, README de contexte, templates. D'où ce fichier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAssets, AI_CONTEXT } from './matrix.mjs';
import { kitOwnedFiles } from './kit-owned.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STACKS = Object.keys(AI_CONTEXT);
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

const fichiersDe = (rel, out = [], base = rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const sous = `${rel}/${e.name}`;
    if (e.isDirectory()) fichiersDe(sous, out, base);
    else out.push(sous.slice(base.length + 1));
  }
  return out;
};

// La carte « ce que le projet reçoit » : chemin DANS LE PROJET → chemin DANS LE KIT.
// Les copies de type `dir` sont dépliées fichier par fichier — sinon un fichier livré à l'intérieur
// d'un dossier copié serait invisible à ce contrôle.
function livraison(stack, assistant) {
  const carte = new Map();
  for (const c of resolveAssets(stack, assistant).copies) {
    if (c.transform === 'dir') for (const f of fichiersDe(c.from)) carte.set(`${c.to}/${f}`, `${c.from}/${f}`);
    else carte.set(c.to, c.from);
  }
  for (const p of kitOwnedFiles(stack, assistant)) carte.set(p.to, p.from);
  return carte;
}

// Les dossiers SOURCES du kit. Un projet généré n'en reçoit aucun sous ce nom : ce sont les quatre
// racines qui n'existent que dans le dépôt.
// PAS DE BACKTICK EXIGÉ, et c'est le cœur du contrôle. Une première version réclamait le chemin
// COLLÉ à l'ouverture d'un code span — elle laissait passer `bash scripts/download-ai-context.sh`
// et tout bloc ```bash, c'est-à-dire la forme EXACTE du défaut d'origine. Mesuré : le garde restait
// vert sur le texte qu'il était censé refuser. Le chemin est donc cherché où qu'il soit dans la
// ligne ; l'antéposition interdit seulement de couper au milieu d'un chemin plus long.
const SOURCES_DU_KIT = /(?<![\w/.-])((?:scripts|templates|stacks|cursor-plugin)\/[A-Za-z0-9_./-]+)/g;

test('promesses — aucun fichier livré ne renvoie à un chemin du kit absent du projet', () => {
  const fautes = [];
  let lus = 0;
  for (const stack of STACKS) {
    for (const assistant of ASSISTANTS) {
      const carte = livraison(stack, assistant);
      for (const [dansLeProjet, dansLeKit] of carte) {
        if (!/\.(md|mdc)$/.test(dansLeProjet)) continue;
        const src = path.join(ROOT, dansLeKit);
        if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) continue;
        lus++;
        fs.readFileSync(src, 'utf8').split('\n').forEach((l, i) => {
          for (const [, cite] of l.matchAll(SOURCES_DU_KIT)) {
            // Livré sous le MÊME chemin : le lecteur peut vraiment l'ouvrir.
            if (carte.has(cite)) continue;
            fautes.push(`  ${stack}/${assistant} · ${dansLeProjet}:${i + 1} → « ${cite} » n'arrive pas dans le projet`);
          }
        });
      }
    }
  }
  // GARDE DE MONTAGE. Ce contrôle est NÉGATIF : sa seule façon de mentir est de ne plus rien lire.
  assert.ok(lus > 300, `montage : ${lus} fichiers lus sur 12 combinaisons — la carte de livraison est vide ou amputée`);
  assert.deepEqual([...new Set(fautes)], [], [
    'Des fichiers livrés renvoient à des chemins qui n\'existent que dans le dépôt du kit :',
    ...new Set(fautes),
    '',
    'Cite ce que l\'utilisateur peut OUVRIR (`AGENTS.md`, `AGENTS-stack.md`, `.claude/skills/…`,',
    '`docs/…`), jamais la source. Une note « dans le dépôt du kit : … » ne sauve rien : le débutant',
    'la suit quand même, et ne trouve rien.',
  ].join('\n'));
});

// `ai-context/` porte les `llms.txt` officiels. Sans mise à jour, un projet garde à vie les docs de
// sa date de création — exactement ce que son propre README annonce comme le pire cas (« sans eux,
// l'IA invente des fonctions périmées »). Il arrivait au scaffold puis ne bougeait PLUS JAMAIS :
// `--refresh` ne le connaissait pas, et le script qui l'aurait rafraîchi n'est pas livré.
test('mise à jour — `ai-context/` de la stack est régénéré par --refresh', () => {
  for (const stack of STACKS) {
    for (const assistant of ASSISTANTS) {
      const regeneres = new Set(kitOwnedFiles(stack, assistant).map((p) => p.to));
      assert.ok(regeneres.has('ai-context/README.md'), `${stack}/${assistant} : le README d'ai-context n'est pas régénérable`);
      for (const d of AI_CONTEXT[stack]) {
        const attendus = fichiersDe(`ai-context/${d}`);
        // Montage : une stack dont le dossier de contexte aurait disparu du kit rendrait la
        // boucle vide, et « tout est régénéré » serait vrai à vide.
        assert.ok(attendus.length > 0, `montage : ai-context/${d} est vide dans le kit`);
        for (const f of attendus) {
          assert.ok(regeneres.has(`ai-context/${d}/${f}`),
            `${stack}/${assistant} : ai-context/${d}/${f} arrive au scaffold mais --refresh ne le remet jamais à jour`);
        }
      }
    }
  }
});

// Le plancher Node. Le kit tourne dès 20.12, mais la stack vitrine (Astro 7) REFUSE de démarrer en
// dessous de 22.12. Le guide d'installation disait « installe la LTS » puis « doit afficher v20 ou
// plus » — un élève installait Node 20, croyait avoir fini, et se heurtait au mur 70 lignes plus
// bas, au moment de créer son site. Le chiffre doit être au point d'INSTALLATION, et il doit être
// le plus haut qu'une stack exige.
test('plancher Node — le guide d\'installation exige la version la plus haute qu\'une stack réclame', async () => {
  // `PINS` est la source unique des versions épinglées (`faits-stacks.test.mjs` y compare toute la
  // doc du kit). Lire le plancher ici, et pas un chiffre recopié, c'est ce qui fait que relever
  // Astro demain relève aussi le guide — ou rougit.
  const { PINS } = await import('./matrix.mjs');
  const planchers = Object.values(PINS).map((m) => m.node).filter(Boolean);
  assert.ok(planchers.length > 0, 'montage : aucun plancher Node déclaré dans PINS');
  const cmp = (a, b) => a.split('.').map(Number).reduce((acc, n, i) => acc || n - Number(b.split('.')[i] ?? 0), 0);
  const exige = planchers.sort(cmp).at(-1);

  const guide = fs.readFileSync(path.join(ROOT, 'guides/02-installer-les-outils.md'), 'utf8');
  const verif = guide.split('\n').find((l) => /node --version/.test(l));
  assert.ok(verif, 'le guide doit montrer `node --version` au moment de l\'installation');
  const annonce = verif.match(/v?(\d+\.\d+)/g)?.map((v) => v.replace(/^v/, ''));
  assert.ok(annonce?.length, `le guide ne chiffre pas la version attendue : ${verif.trim()}`);
  assert.ok(cmp(annonce.at(-1), exige) >= 0,
    `le guide annonce v${annonce.at(-1)} alors qu'une stack exige ${exige} — l'élève installera trop vieux : ${verif.trim()}`);
});

// Une règle Cursor est une TRADUCTION d'une règle source, pas une réécriture. Quand la source pose
// un interdit ABSOLU, la variante Cursor ne peut pas y ajouter une condition qui le relâche :
// `10-css-maquette.mdc` disait « Interdit … SANS vérifier l'équilibre des accolades » — donc
// autorisé si on vérifie — quand `css-maquette-rule.md` dit « **Jamais** ». Contradiction active
// sur Cursor seulement, et sur la règle qui protège le CSS de la maquette.
const ABSOLUS = [
  { source: 'templates/agents/css-maquette-rule.md', cursor: 'templates/cursor/rules/10-css-maquette.mdc', ancre: 'plages de lignes' },
];

test('une règle Cursor ne relâche pas un interdit que sa source pose comme absolu', () => {
  for (const { source, cursor, ancre } of ABSOLUS) {
    const ligneAvec = (f) => {
      const l = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').find((x) => x.includes(ancre));
      assert.ok(l, `montage : « ${ancre} » introuvable dans ${f} — l'ancre a bougé, ce contrôle ne compare plus rien`);
      return l;
    };
    const src = ligneAvec(source);
    assert.match(src, /Jamais/i, `montage : ${source} ne pose plus « ${ancre} » comme un absolu — revoir cette table`);
    assert.match(ligneAvec(cursor), /Jamais/i,
      `${cursor} : « ${ancre} » est un interdit ABSOLU dans ${source}. La variante Cursor doit le poser aussi fort — pas sous condition.`);
  }
});

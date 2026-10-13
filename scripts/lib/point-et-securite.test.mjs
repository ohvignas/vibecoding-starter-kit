// scripts/lib/point-et-securite.test.mjs
// DEUX AJOUTS, ET CE QU'ILS GARANTISSENT.
//
// 1. LE POINT D'ÉTAPE. Le premier contact (COLLE-MOI dans l'assistant, docs/A-FAIRE.md, l'étape 00
//    de /init-vibecoding) doit OBLIGER l'IA à faire l'inventaire « déjà là / à construire » et à
//    DEMANDER l'accord AVANT d'installer. Sans ça, « installe le projet » se lit « fonce », et une
//    étape sautée ne se voit nulle part. Vaut pour un projet NEUF comme pour un EXISTANT.
//
// 2. LE PENTEST IA OPTIONNEL (Shannon). Il doit être PRÉSENT là où il a un sens (web : saas,
//    vitrine), ABSENT ailleurs (mobile, desktop), toujours ANNONCÉ OPTIONNEL, et JAMAIS exigé. Le
//    workflow CI livré n'est pas posé dans le projet : c'est un modèle à copier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSetupAi } from './setup-ai.mjs';
import { renderColleMoi } from './colle-moi.mjs';
import { resolveStackManifest, SUPERPOWERS } from './matrix.mjs';
import { cheminEtape } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const aFaire = (stack, assistant) => renderSetupAi({ stack, assistant, manifest: resolveStackManifest(stack, assistant), superpowersCmd: SUPERPOWERS[assistant] });

// ── 1. LE POINT D'ÉTAPE ────────────────────────────────────────────────────────────────────────

test("point d'étape — le premier contact demande l'inventaire ET l'accord, avant d'installer", () => {
  for (const a of ['cursor', 'claude-code', 'codex']) {
    const prompt = renderColleMoi({ assistant: a, stack: 'saas' }).join('\n');
    assert.match(prompt, /fais le point/i, `${a} : COLLE-MOI doit commencer par « fais le point »`);
    assert.match(prompt, /(déjà là|ce qui est là)/i, `${a} : l'inventaire « ce qui est là » doit être demandé`);
    assert.match(prompt, /(attend|accord)/i, `${a} : l'accord de l'utilisateur doit être exigé avant d'installer`);
  }
  const aFaireTexte = aFaire('saas', 'cursor');
  assert.match(aFaireTexte, /Fais le point d'abord/i, 'A-FAIRE : le point d\'étape doit être annoncé');
  assert.match(aFaireTexte, /sans sauter/i, 'A-FAIRE : dire qu\'on ne saute pas les cases');
});

test("point d'étape — l'étape 00 d'/init-vibecoding le rend obligatoire, pour neuf ET existant", () => {
  const t = read(cheminEtape('init-vibecoding', '00-detecter-l-etat.md'));
  assert.match(t, /POINT D'ÉTAPE/i, "l'étape 00 doit porter le point d'étape");
  assert.match(t, /Inventorie/i, "l'inventaire doit être une consigne explicite");
  assert.match(t, /attends sa réponse|feu vert/i, "l'étape 00 doit EXIGER l'accord avant de lancer quoi que ce soit");
  assert.match(t, /neuf/i, 'et il doit valoir pour un projet neuf');
  assert.match(t, /existant/i, 'et pour un projet existant');
  assert.match(t, /Ne saute jamais une étape/i, 'interdire explicitement le saut d\'étape');
});

// ── 2. LE PENTEST IA OPTIONNEL ─────────────────────────────────────────────────────────────────

test('Shannon — proposé sur les stacks WEB (saas, vitrine), absent ailleurs (mobile, desktop)', () => {
  for (const s of ['saas', 'vitrine']) {
    const t = aFaire(s, 'cursor');
    assert.match(t, /Shannon/, `${s} : Shannon doit être proposé`);
    assert.match(t, /optionnel/i, `${s} : Shannon doit être annoncé OPTIONNEL`);
    assert.match(t, /Jamais sur la production|staging/i, `${s} : dire « staging seulement, jamais la prod »`);
    assert.match(t, /keygraph\/shannon/i, `${s} : la commande d'installation doit être donnée`);
  }
  for (const s of ['mobile', 'desktop']) {
    assert.doesNotMatch(aFaire(s, 'cursor'), /Shannon/, `${s} : Shannon est web — il ne doit pas apparaître`);
  }
});

test('Shannon — le workflow CI est un MODÈLE, jamais posé dans le projet', () => {
  const wf = read('templates/security/shannon.yml');
  assert.match(wf, /KeygraphHQ\/shannon-action/, 'le workflow doit utiliser l\'action officielle');
  assert.match(wf, /secrets\.SHANNON_AI_API_KEY/, 'la clé passe par un secret GitHub, jamais en clair');
  assert.match(wf, /optionnel|non posé par le kit/i, 'le fichier doit dire qu\'il n\'est PAS posé dans le projet');
  // Le copier dans un projet serait le câbler : le scaffold ne connaît que `secrets.yml`.
  const setup = read('scripts/setup.mjs');
  assert.doesNotMatch(setup, /shannon\.yml/, 'le scaffold ne doit pas poser le workflow Shannon (il échouerait sans secret)');
});

test('Shannon — le guide existe, et /deploy + security-reviewer ne l\'IMPOSENT pas', () => {
  const guide = read('guides/04-pentest-shannon.md');
  for (const m of [/Shannon/, /pas d'exploit/i, /staging/i, /Docker/]) assert.match(guide, m, `le guide doit couvrir ${m}`);

  const deploy = read('templates/commands/deploy.md');
  assert.match(deploy, /Shannon/, '/deploy doit tenir compte de Shannon s\'il est branché');
  assert.match(deploy, /optionnel/i, '/deploy : Shannon reste optionnel, ce n\'est pas un gate obligatoire');
  assert.match(deploy, /Jamais.*production/i, '/deploy : rappeler « jamais la production »');

  const sec = read('templates/agents/subagents/security-reviewer.md');
  assert.match(sec, /Shannon/, 'security-reviewer doit connaître l\'escalade');
  assert.match(sec, /proposes/i, 'security-reviewer PROPOSE l\'escalade, il ne l\'impose pas');
});

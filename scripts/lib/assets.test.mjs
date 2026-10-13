// scripts/lib/assets.test.mjs
// LES PASTILLES DE TITRE DES ILLUSTRATIONS CONTIENNENT LEUR TEXTE.
//
// Défaut visuel signalé par Antoine (2026-10-13) : dans presque toutes les illustrations, le
// rectangle arrondi du titre (« CE QUI SE PASSE »…) s'arrêtait AVANT la fin du texte. Le texte
// débordait de la pastille — la faute ne se voyait ni dans le SVG (du XML), ni dans un test : le
// texte est simplement dessiné par-dessus le fond.
//
// On ne peut pas mesurer une police en Node. On vérifie donc une BORNE BASSE fiable : à 13 px
// gras avec l'interlettrage de la charte, aucun caractère ne descend sous ~8 unités de large
// (mesuré sur les 14 illustrations : de 8,5 à 11). La borne est volontairement large — elle
// attrape un débordement franc, jamais une pastille un peu juste à 2 px près.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, '.github/assets');

// Le texte de la pastille et sa position : `class="t eyebrow"` n'apparaît qu'une fois par fichier.
const PASTILLE_TEXTE = /<text class="t eyebrow" x="(\d+)"[^>]*>([^<]+)<\/text>/;
// Le fond de la pastille : le PREMIER rectangle de hauteur 32 (les bandeaux du bas sont plus bas
// dans le fichier, donc jamais rencontrés en premier).
const PASTILLE_FOND = /<rect x="(\d+)"[^>]*width="(\d+)"[^>]*height="32"/;
const CAR = 8;      // largeur minimale d'un caractère (borne basse)
const MARGE = 22;   // marge à droite, entre le texte et le bord de la pastille

test('assets — chaque pastille de titre va jusqu\'au bout de son texte', () => {
  const svgs = fs.readdirSync(DIR).filter((n) => n.endsWith('.svg'));
  assert.ok(svgs.length >= 12, `montage : ${svgs.length} illustrations lues — le dossier est vide ou incomplet`);
  let vues = 0;
  const fautes = [];
  for (const f of svgs.sort()) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    const t = PASTILLE_TEXTE.exec(svg);
    if (!t) continue;
    const p = PASTILLE_FOND.exec(svg);
    assert.ok(p, `${f} : pastille de texte sans fond — le garde ne juge rien`);
    vues++;
    const [, textX, label] = t;
    const [, pillX, pillW] = p;
    const besoin = Number(textX) - Number(pillX) + label.trim().length * CAR + MARGE;
    if (Number(pillW) < besoin) fautes.push(`${f} : pastille de ${pillW}px pour « ${label.trim()} » — il faut ≈ ${besoin}px`);
  }
  assert.ok(vues >= 12, `montage : ${vues} pastilles jugées — le motif ne trouve plus les titres`);
  assert.deepEqual(fautes, [], ['Des pastilles s\'arrêtent avant la fin de leur texte :', ...fautes].join('\n'));
});

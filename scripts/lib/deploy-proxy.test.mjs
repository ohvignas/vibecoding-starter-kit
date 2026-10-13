// scripts/lib/deploy-proxy.test.mjs
// LE ROUTAGE ET LE HTTPS : CADDY PAR DÉFAUT, TRAEFIK QUAND IL FAUT.
//
// Question d'Antoine (2026-10-13) : « le routage et le SSL, et ce que fait Traefik — est-ce qu'on
// l'utilise, et pourquoi c'est bien ? ». Réponse honnête : les deux font le routage ET le HTTPS
// automatique ; le choix dépend du NOMBRE de projets sur le VPS. Le kit ne doit donc pas taire
// Traefik (il l'aurait fait croire inutile) ni le mettre par défaut (il ajoute un Docker socket —
// accès root — et 5 concepts pour un débutant). Ce test verrouille les deux, et la prudence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cheminRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('proxy — /deploy dit CADDY par défaut ET quand prendre Traefik', () => {
  const t = read(cheminRunbook('deploy'));
  assert.match(t, /Caddy/, '/deploy : Caddy doit rester le chemin montré');
  assert.match(t, /Traefik/, '/deploy : Traefik doit être expliqué (sinon il passe pour inutile)');
  // Le CRITÈRE — c'est lui qui décide, pas une préférence.
  assert.match(t, /plusieurs projets/i, '/deploy : dire quand Traefik gagne (plusieurs projets sur le VPS)');
  assert.match(t, /un projet|un\*\* projet/i, '/deploy : et quand Caddy suffit');
  // Sa force réelle, et ce qu'on paie pour l'avoir.
  assert.match(t, /labels/i, '/deploy : la force de Traefik = la config par labels');
  assert.match(t, /traefik\.http\.routers/, '/deploy : un exemple de labels concret, pas un renvoi à la doc');
  assert.match(t, /\/var\/run\/docker\.sock/, '/deploy : nommer le socket Docker qu\'il faut monter');
  assert.match(t, /accès (équivalent )?root|équivalent root/i, '/deploy : dire que le socket Docker = root');
  assert.match(t, /:ro/, '/deploy : exiger la lecture seule sur le socket');
});

test('proxy — le guide compare les deux, sur le même critère', () => {
  // La mise en forme (`**plusieurs** projets`) ne doit pas cacher le critère au contrôle.
  const g = read('guides/05-deploy-vps-hostinger.md').replace(/[*_`]/g, '');
  assert.match(g, /Traefik/, 'le guide doit parler de Traefik');
  assert.match(g, /Caddy/, 'et de Caddy');
  assert.match(g, /plusieurs projets/i, 'le critère doit y être aussi');
  assert.match(g, /Docker socket|docker\.sock/i, 'et l\'avertissement sur le socket');
});

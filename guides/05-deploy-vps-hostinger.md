# Déployer sur un VPS (Hostinger, SSH)

> **Optionnel.** Le kit n'oblige à rien : une app `saas` ou `vitrine` peut partir sur Vercel/Netlify
> (voir `/deploy`). Ce guide est pour le jour où tu veux **tout héberger toi-même** — ton serveur,
> ton Docker, tes certificats — sur le VPS que le kit recommande.

---

## Le VPS recommandé : Hostinger

> ⚠️ **Lien d'affiliation.** Antoine n'est **pas payé** pour mettre ce lien ici, mais il touche une
> **commission** si tu passes par là — et **tu as 10 % de réduction**. Il le recommande parce qu'il le
> trouve **simple, pas cher et cool** à utiliser, pas parce qu'il est sponsorisé.

**Ouvre cette page dans ton navigateur** — c'est la **première action** du déploiement, pas une
citation : l'IA **ouvre** la page (commande `open` sur macOS, `xdg-open` sur Linux, `start` sur
Windows — ou son outil navigateur) et te la **montre**.

👉 **https://www.hostg.xyz/SHK4I**

Puis **saisis le code `AV10`** au moment de la commande → **10 % de réduction**.

## Ce que le kit a déjà fait pour toi

Le wizard a installé les **skills officiels Hostinger** (`hostinger/hostinger-agent-skills`) :

| Skill | Ce qu'il sait faire |
|---|---|
| `vps` | gérer un VPS Hostinger (API, redémarrage, ressources) |
| `dns` | poser les enregistrements DNS (A, CNAME, TXT…) |
| `domains` | gérer le domaine, les sous-domaines, les redirections |

Demande à ton assistant de **les charger** quand tu touches au serveur : il ne devinera pas l'API.

## La marche à suivre, en 7 temps

Elle vit dans la commande **`/deploy`**, section « **VPS Hostinger (SSH)** » — avec les commandes
exactes : clé SSH, durcissement, Docker, Caddy + HTTPS, DNS, sauvegardes, supervision. Ouvre-la et
suis-la dans l'ordre ; ne saute pas le **durcissement** (étape 2) : un VPS neuf est attaqué en
quelques minutes.

## Les MCP (optionnels)

Deux serveurs MCP rendent le déploiement plus agréable. **Aucun n'est obligatoire**, et **aucun ne
va dans le dépôt** (jeton, clés SSH, accès : jamais commités).

| MCP | À quoi ça sert | Install |
|---|---|---|
| **Hostinger officiel** | piloter VPS, DNS et domaines depuis ton assistant | `https://mcp.hostinger.com` (jeton ou OAuth) · ou `npm i -g @hostinger/mcp` + `HOSTINGER_API_TOKEN` |
| **SSH** (`ssh-mcp`) | exécuter des commandes **sur ton serveur** | `npm i -g ssh-mcp` |

> 🔴 **Sur le MCP SSH, lis ceci avant de l'activer** : il donne à l'IA un **shell sur une machine
> distante** (la « lethal trifecta »). Il classe les commandes et demande ton accord pour les
> destructrices — ⛔ **jamais de compte `root`**, **jamais** d'approbation `auto` sur un profil de
> production. Tu l'actives en connaissance de cause, et tu peux le retirer à tout moment.

## Pourquoi un VPS plutôt que Vercel/Netlify ?

| | Vercel / Netlify | VPS Hostinger |
|---|---|---|
| Mise en route | clic, instantanée | SSH, Docker, ~1 h la première fois |
| Coût | monte avec le trafic | **fixe**, souvent moins cher |
| Contrôle | limité (plateforme) | **total** (ton OS, ton Docker, ton DNS) |
| C'est fait pour | un lancement rapide | durer, et tout maîtriser |

Le kit ne te force pas à choisir : `/deploy` donne **les deux** chemins.

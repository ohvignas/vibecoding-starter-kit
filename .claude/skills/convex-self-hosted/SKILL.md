---
name: convex-self-hosted
description: Bonnes pratiques et AUDIT d'un backend Convex AUTO-HÉBERGÉ (Docker, VPS, SSH). À charger dès qu'on touche au self-hosting Convex — déploiement, index, rétention, sauvegardes, mémoire, mises à jour. Contient les PIÈGES PAYÉS (pannes de production réelles) à ne jamais reproduire, et une checklist d'audit en lecture seule.
---

# Convex auto-hébergé — bonnes pratiques & audit

Le kit utilise **Convex Cloud** par défaut. Ce skill sert quand on passe en **auto-hébergé**
(`get-convex/convex-backend`, Docker sur un VPS) : là, la base est **ton** fichier SQLite, la mémoire
est **ta** RAM, et une erreur de rétention ou d'index coûte une **panne de plusieurs heures**.

Guide officiel transporté par le kit : **`ai-context/convex/self-hosting.md`**.

## Régle n°0 — lecture d'abord

Un audit sur un backend qui tourne est **READ-ONLY par défaut**. Aucun `rm`, `docker rm/-f`, `up -d`,
`pull`, `restart`, purge, migration ni `VACUUM` **sans un oui explicite de l'utilisateur**. Tu
**proposes**, tu n'appliques pas.

## Les 10 pièges payés — à ne jamais reproduire

1. **Un index sur une table qui grossit = désastre.** Créer un index déclenche un **backfill** qui
   bloque le service (mesuré : ~1,3 ligne/s, un restart ne fait que *Rescribing backfill*). Règle :
   **purge / rétention en place ET backfill surveillé AVANT** de pousser un index sur une table déjà
   grosse. **Jamais d'index global sur une table append-only sans rétention.**
2. **`.collect()` sans borne = interdit** sur une table qui peut grossir. Cherche **tous** les
   `.collect()`, classe-les : **table bornée** (ok) vs **table qui grossit** (bug). Sur une table qui
   grossit : `.take(n)`, `.paginate()`, ou une **fenêtre** `.withIndex(...).gte/.lte`. Les **crons** et
   les *workflows* tournent en boucle : c'est là que ça fait le plus mal.
3. **`db.sqlite3` qui grossit en silence.** Le RSS au **cold start** peut atteindre **~3× la taille du
   fichier** (bug amont `get-convex/convex-backend#495`). Une base de 6 Go = cold start > 4 min =
   **healthcheck dépassé** = le service « ne démarre jamais » alors qu'il est juste **lent**.
   Surveille la taille du fichier — une base qui grossit sans rétention est un compte à rebours.
4. **`DOCUMENT_RETENTION_DELAY` : ne JAMAIS passer d'une valeur courte à une valeur longue**
   (issues `#458`→`#358`) : boucle de rétention irrécupérable, **OOM répétés même sans trafic**.
5. **Exports** : jamais `convex export --include-file-storage` sans
   `EXPORT_STORAGE_GET_CONCURRENCY=4` + `EXPORT_MAX_INFLIGHT_PREFETCH_BYTES=8388608`, **et un restart
   après** (fuite RAM, issue `#435`).
6. **Healthcheck** : `start_period` doit couvrir un **cold start réel** (~**360 s** si la base peut
   être lourde). Piège : bloqué après *Searchlight starting* = souvent une **durée**, pas la mémoire.
   Pour le prouver : **retirer le changement suspect** et voir si le symptôme reste.
7. **`docker top` / `ps aux` = secret.** La ligne de commande du binaire Convex contient
   l'`instance-secret`. **Ne jamais l'imprimer** dans un rapport, un log ou une sortie collée.
8. **Ouvrir `db.sqlite3` pendant que le backend tourne = risque de corruption.** Uniquement `sqlite3`
   avec `.timeout` sur une **copie**, ou **backend arrêté**.
9. **Purge SQLite manuelle** (si un jour nécessaire) : tout vit dans les tables **`documents` +
   `indexes`**, `table_id` est un **BLOB** (mapping nom→id dans les documents courts `$.name`, requête
   via `hex()`). Supprimer dans **LES DEUX** tables, sinon **documents fantômes**. **Jamais sans
   backup.**
10. **`os.totalmem()` / `process.memoryUsage().rss` mentent.** Le premier rend la RAM de l'**hôte**,
    le second l'executor **Node** — pas le backend **Rust**. Seule vérité :
    **`/sys/fs/cgroup/memory.{current,max,peak,events,pressure}`** (+ `oom_kill`).

## Checklist d'audit (lecture seule)

**A. État de la base** — taille de `db.sqlite3` + date de modif ; si > 1 Go, dire **qui** grossit ;
lister les tables du `convex/schema.ts` et classer (append-only sans purge ? événementielle ?) ;
vérifier qu'il existe un **cron de purge** pour chaque table qui grossit.

**B. Code** — tous les `.collect()` (`fichier:ligne`, table, borne présente ou non) ; index ajoutés
récemment (`git log` sur `convex/schema.ts`) et backfill en cours ; `.collect()` dans les **crons** et
**workflows**.

**C. Infra Docker** — `docker inspect` sur **chaque** conteneur : `HostConfig.Memory`/`MemorySwap`
(proposer des `mem_limit` : **≥ 3× le RSS actuel, plancher 1g**, après validation) ; image backend
**pinnée** (un `:latest` flottant = finding → proposer le pin par digest, **backup d'abord**, jamais
d'update sans accord) ; `start_period` suffisant ; `restart: unless-stopped` partout.

**D. Sauvegardes** — la bonne procédure :
`sqlite3 -cmd '.timeout 30000' db.sqlite3 "VACUUM INTO db.sqlite3.bak-<date>"` puis
`PRAGMA quick_check` **avant toute upgrade** (le `.timeout` est obligatoire, sinon `database is
locked`). Vieux backups : n'en garder qu'un **après** `quick_check` — **jamais supprimer sans
demander**. **Pas de `VACUUM` live**, pas de `docker kill`, pas de `rm` dans `/convex/data`.

**E. Monitoring** — un check **uptime HTTP** (`/version` + la page, mail sur échec) ; relever
`free -h`, `docker stats`, `memory.events` (`oom_kill`), `memory.current`/`max` ; seuils d'alerte :
`MemAvailable` < 1 Go, swap > 7 Go, disque > 90 %, `oom_kill` > 0.

## Règles non négociables

- **Lecture d'abord** (voir règle n°0). Zéro action destructive auto-validée.
- **Aucun secret imprimé** : `instance-secret`, clés API, `.env` — **masquer toute valeur ≥ 16 car.**.
- **Ne pas toucher aux autres projets du serveur** (autre compose, autres volumes, autre préfixe).
- **Preuve obligatoire** : chaque finding = **`fichier:ligne`** ou **commande + sortie brute collée**.
  Un constat sans preuve est **jeté**.
- **3 tentatives max** par problème. Au 3ᵉ échec : **BLOQUÉ** — dire ce qui échoue, ce qui a été
  essayé, l'hypothèse. Jamais de boucle « jusqu'à ce que ça marche ».

## Livrable

1. **État des lieux** (taille base, RSS, `mem_limit` présents/absents, image pinnée ou non, disque,
   RAM) **avec sorties brutes** ;
2. **Findings P1/P2/P3** (P1 = panne probable), chacun **avec sa preuve** ;
3. **Correctifs proposés** (code ou compose), prêts à appliquer mais **non appliqués** ;
4. **Plan de monitoring** concret ;
5. **Statut** : `PROUVÉ` (preuves collées) / `NON PROUVÉ` (quelle preuve manque) / `BLOQUÉ`.

## Références

- Guide d'auto-hébergement : `ai-context/convex/self-hosting.md` (transporté par le kit).
- Dépôt du backend : `get-convex/convex-backend` — issues `#495` (cold start ×3), `#458`/`#358`
  (rétention), `#435` (export + RAM), `self-hosted/README.md`.
- Règles officielles Convex : `ai-context/convex/convex_rules.txt` · MCP Convex.

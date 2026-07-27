# /next — Où j'en suis et quoi faire maintenant (runbook IA)

L'utilisateur est perdu ou reprend après une pause. Ne modifie RIEN. Lis, puis réponds **court et rassurant**.

1. Lis `docs/agents/state.yaml` **en premier** : si `status: blocked`, la réponse n'est **pas** « continue » → dis ce qui bloque (`blocked_reason`, `repair_attempts`) et envoie sur `/sos`.
2. Lis `docs/ROADMAP.md` → trouve le **1er jalon non coché** dont les dépendances sont cochées.
3. Lis `git status` (fichiers en cours) et `git log --oneline -3` (dernier travail).
4. Lis `docs/memory/index.md` (le dernier piège noté, s'il y en a un).

Réponds en **3 lignes maximum**, en français simple :
- **Où tu en es** : le dernier jalon terminé (ou « tu démarres », ou « bloqué sur … »).
- **Ta prochaine action** : le prochain jalon en une phrase concrète — ou, si l'état est bloqué, ce qu'il faut débloquer d'abord.
- **La commande à taper** : `/build` (continuer la roadmap), `/new-project` (rien n'existe encore), ou `/sos` (bloqué ou cassé).

Si rien n'existe encore (`docs/ROADMAP.md` absent) : dis-le et propose `/new-project`.
Ne récite pas le catalogue des commandes ici — c'est le rôle de `/help`, renvoie-y en une ligne si besoin.

# /next — Où j'en suis et quoi faire maintenant (runbook IA)

L'utilisateur est perdu ou reprend après une pause. Ne modifie RIEN. Lis, puis réponds **court et rassurant**.

1. Lis `docs/ROADMAP.md` → trouve le **1er jalon non coché** dont les dépendances sont cochées.
2. Lis `git status` (fichiers en cours) et `git log --oneline -3` (dernier travail).
3. Lis `docs/memory/index.md` (le dernier piège noté, s'il y en a un).

Réponds en **3 lignes maximum**, en français simple :
- **Où tu en es** : le dernier jalon terminé (ou « tu démarres »).
- **Ta prochaine action** : le prochain jalon en une phrase concrète.
- **La commande à taper** : `/build` (continuer la roadmap), `/new-project` (rien n'existe encore), ou `/sos` (quelque chose est cassé).

Si rien n'existe encore (`docs/ROADMAP.md` absent) : dis-le et propose `/new-project`.

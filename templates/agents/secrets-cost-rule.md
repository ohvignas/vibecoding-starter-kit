## Règle secrets & coûts

**Secrets**
- Clés / API / tokens → **uniquement** dans `.env` (gitignored). **Jamais** en dur, jamais côté client, jamais dans un commit.
- `.env.example` liste les **noms** de variables, **sans valeurs**. Ne pousse **jamais** `.env`.
- Le hook **pre-commit** bloque les secrets détectés : `--no-verify` interdit sauf raison explicite validée.
- **Demande avant toute action destructive** : suppression de données, `git push --force`, migration, `rm`.

**Coûts (tu dépenses de l'argent réel)**
- **Choix du modèle** : une seule référence, la « Règle sous-agents ».
- **Pas de fan-out inutile** : parallèle **seulement** si le travail est indépendant (« Règle sous-agents »).
- **3 tentatives ratées → STOP** (« Règle Preuve ») : s'acharner brûle des tokens sans rien corriger.

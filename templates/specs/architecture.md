# Template architecture — la structure à remplir dans la spec du projet

> Ce fichier est un **modèle**, pas ton architecture. `/new-project` le suit à l'étape `03-stack-et-architecture.md` et écrit le
> résultat dans **`docs/ARCHITECTURE.md`**. Ne le modifie pas.
>
> **Attribution** : structure **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC). Adaptée et
> traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).

Écris une **spine d'architecture** : on ne fixe QUE les **invariants** — les décisions durables
qu'un futur builder ne peut **pas** déduire du code. Le reste (arbre complet, détails) appartient
au code une fois écrit.

## Sections

1. **Paradigme de design** — nomme le pattern (un pattern connu charge tout un modèle gratuitement) + mappe ses couches aux dossiers/namespaces.
2. **Invariants & règles** — le cœur durable. Un bloc par décision `### AD-1 — {décision}` avec **Lie** (ce qui est concerné), **Empêche** (la divergence évitée), **Règle** (applicable). Ajoute un **diagramme de dépendances** (Mermaid, jamais vide).
3. **Conventions de cohérence** — là où des builders indépendants dériveraient : nommage (entités/fichiers/interfaces/events), formats (ids/dates/forme d'erreur/enveloppes), état & transverse (mutations/erreurs/logging/config/auth).
4. **Stack** — nom + version uniquement (graine ; le code en devient propriétaire ensuite).
5. **Graine structurelle** — les formes qu'il vaut la peine de fixer au démarrage : vue système, **déploiement & environnements + topologie infra externe** (ne PAS laisser silencieux), **ERD** cœur (entités + relations, pas les colonnes), arbre source minimal.
6. **Map capacité → architecture** — chaque capacité du PRD : *vit dans* / *gouvernée par*.
7. **Différé** — décisions repoussées, chacune avec la raison qu'elle peut attendre.

## Checklist (avant de faire valider)

Chaque `AD-n` est-il vraiment un invariant non-évident ? Le déploiement est-il explicite ?
La sécurité / conformité est-elle traitée (un `AD-n` ou un « différé » assumé — jamais le silence) ?

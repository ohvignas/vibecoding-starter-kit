# Tournage — « Créer un PRD et un tech spec avec le kit »

Déroulé vérifié sur le kit **0.15.0**. Le PRD est l'**étape 02** de `/new-project`, le tech spec
l'**étape 03**. Tu peux t'arrêter là : les étapes 04 à 08 (arborescence, maquette, roadmap,
scaffold) feront d'autres vidéos.

---

## AVANT de lancer l'enregistrement

Ces trois choses prennent 3 à 5 minutes et sont du temps mort à l'écran. Fais-les **avant**.

- [ ] **Node ≥ 22.12** — `node --version`. En dessous, la stack vitrine refuse de démarrer.
- [ ] **Un dossier vide**, quelque part de propre. Pas ton bureau encombré : la caméra le verra.
- [ ] **Ton assistant déjà ouvert** sur ce dossier, avec **superpowers déjà installé**
      (`/plugin install superpowers@claude-plugins-official` chez Claude Code). L'installation
      des plugins et l'autorisation des MCP sont indispensables mais ennuyeuses à filmer.

**Prépare ton idée en une phrase.** L'IA va la reformuler et creuser — c'est le cœur de la vidéo.
Prends quelque chose que ton public comprend sans explication. *« Une appli pour gérer les
inscriptions de mon club de sport »* marche mieux que n'importe quel exemple technique.

---

## Le tournage

### 1. L'installation — 1 min à l'écran

```bash
npm create vibecoding-kit@latest
```

Quatre à cinq questions : le type d'app, l'assistant, le nom, (le backend pour un SaaS), et le
**mode apprentissage**.

> **Dis-le à la caméra :** *« Je n'installe rien à la main. Je réponds à quatre questions et
> l'outil pose tout : les règles, la mémoire, les commandes, les vérifications. »*

⚠️ **L'installation des skills prend 1 à 2 minutes.** Coupe au montage, ou lance-la avant
d'enregistrer et reprends juste après.

### 2. Le contrôle — 20 secondes

Colle dans ton assistant le prompt affiché par le wizard (il est aussi dans
`COLLE-MOI-DANS-L-IA.md`), puis :

```
/doctor
```

Tu veux voir **« ✅ Ton environnement est prêt »**. C'est un bon plan : ça prouve que rien n'est
laissé au hasard.

### 3. Le lancement — le vrai début de la vidéo

```
/new-project « une appli pour gérer les inscriptions de mon club de sport »
```

**Ce qui se passe, et c'est LE moment à commenter :** l'IA ne code pas. Elle annonce d'abord le
parcours en français simple, puis te demande ton **mode de travail** :

| Mode | Ce que ça change | Pour la vidéo |
|---|---|---|
| **Rapide** | l'IA propose des brouillons complets avec ses suppositions taguées `[HYPOTHÈSE: …]`, tu corriges | **choisis celui-ci** — beaucoup moins de questions |
| **Pas à pas** | section par section, avec questions | vrai en formation, trop long à filmer |

> **Dis-le :** *« Remarquez : elle ne code pas. Elle refuse de coder tant qu'elle n'a pas compris.
> C'est exactement ce que 90 % des gens sautent. »*

### 4. Étape 01 — le cadrage *(aucun fichier écrit)*

L'IA creuse trois choses que personne ne pense à demander à une IA :

1. **Le problème** — ce qui ne va pas aujourd'hui, **sans jamais nommer ta solution**
2. **L'entreprise et ses utilisateurs** — à qui ça s'adresse vraiment
3. **Les objectifs commerciaux** — chiffrés et datés

> **Le moment fort de la vidéo :** le PRD porte un auto-test — *si ta description du problème
> décrit déjà ton application, elle est fausse.* Montre-le. C'est contre-intuitif et ça marque.

### 5. Étape 02 — le PRD → `docs/PRD.md`

L'IA ouvre `docs/templates/PRD.md` et le remplit. **12 sections :**

| | |
|---|---|
| 1. Problème | 7. Arborescence *(remplie à l'étape 04)* |
| 2. Vision | 8. Non-objectifs explicites |
| 3. Utilisateur cible | 9. Périmètre MVP |
| 4. Entreprise & objectifs commerciaux | 10. Métriques de succès |
| 5. Glossaire | 11. Questions ouvertes |
| 6. Fonctionnalités | 12. Index des hypothèses |

**Elle s'arrête et attend ta validation.** C'est un *gate* : elle ne passe pas à la suite sans
ton feu vert. Montre-le, c'est rassurant pour un débutant.

> **À montrer à l'écran :** ouvre `docs/PRD.md`. Insiste sur les **non-objectifs** (ce que le
> produit ne fera *pas*) et sur l'**index des hypothèses** — tout ce que l'IA a supposé, remonté
> en fin de document pour que tu confirmes. Rien n'est caché.

### 6. Étape 03 — le tech spec → `docs/ARCHITECTURE.md`

Deux choses à dire :

**La stack n'est pas rediscutée.** Elle a été choisie par le wizard, l'IA la lit dans `AGENTS.md`
et la confirme en une phrase. Elle ne te repose pas la question.

**Le tech spec ne documente QUE ce qu'on ne peut pas déduire du code :** le paradigme, les
décisions d'architecture `AD-*` avec leur diagramme de dépendances, les conventions de cohérence,
la graine structurelle, et ce qui est **volontairement différé**.

> **Dis-le :** *« Ce n'est pas de la documentation pour faire joli. C'est ce qu'un développeur qui
> arrive dans six mois ne pourrait pas deviner en lisant le code. »*

Deuxième gate. Deuxième validation.

### 7. Arrête-toi ici

Dis-le explicitement à l'IA, sinon elle enchaîne sur l'arborescence :

```
Parfait. On s'arrête après le tech spec — je ne fais pas les étapes 04 à 08 maintenant.
```

**Le plan de fin :** ouvre côte à côte `docs/PRD.md` et `docs/ARCHITECTURE.md`.

> *« Voilà. Zéro ligne de code écrite, et pourtant on sait exactement ce qu'on construit, pour
> qui, pourquoi, et comment. La suite — les écrans, la maquette, la feuille de route — c'est la
> prochaine vidéo. »*

---

## Les pièges de tournage

| Piège | Ce que tu fais |
|---|---|
| L'installation des skills : 1-2 min de silence | Coupe, ou lance-la avant d'enregistrer |
| Le mode **Pas à pas** pose beaucoup de questions | Choisis **Rapide** à l'étape 00 |
| L'IA enchaîne sur l'étape 04 sans prévenir | Dis-lui d'arrêter **avant** de valider le tech spec |
| Cursor ne substitue pas les arguments | Si `/new-project « … »` ne prend pas ton idée, elle te la demandera — c'est prévu, pas un bug |
| Node trop vieux | Vérifié avant l'enregistrement, pas pendant |

---

## Ce que tu montres, en une phrase

**Une IA qui refuse de coder tant qu'elle n'a pas compris, et qui te fait valider chaque document
avant de continuer.** Le reste — les 12 sections, les gates, les hypothèses taguées — n'est que la
mécanique de cette seule idée.

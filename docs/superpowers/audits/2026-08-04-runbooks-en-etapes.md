# Chantier « runbooks en étapes » — ce que le plan disait, ce qui a été fait (2026-08-04)

Plan : [`docs/superpowers/plans/2026-08-04-runbooks-en-etapes.md`](../plans/2026-08-04-runbooks-en-etapes.md).
Base : `ef0d741`. Sept paliers, sept commits. Verdict final : **`PROUVÉ`**.

Ce fichier existe pour une raison précise : le plan est **historique** (il porte ses v1 et v2
« gardées pour ne pas refaire les erreurs »). Le corriger a posteriori détruirait sa fonction —
montrer ce qu'on croyait avant de mesurer. Les écarts entre ce qu'il annonçait et ce qui a été
livré se consignent donc ici, comme `2026-07-27-revues-lots.md` l'a fait pour le chantier
précédent.

## Les commits

| Palier | Commit | Portée |
|---|---|---|
| P0 | `ef0d741` | les lecteurs de `templates/commands/` voient le sous-dossier d'étapes |
| P1 | `49a368d` | un dossier d'étapes livré dans le dossier natif de chaque assistant |
| P2/P3 | `3ca5ecf` | `/new-project` : entrée courte + 9 étapes |
| P4 | `174dcc9` | 3 ajouts PRD ; une étape se nomme par son fichier |
| P5 | `3daf9ab` | `/new-feature` et `/init-vibecoding` en étapes ; `/help` reste d'un bloc |
| P5bis | `40e533d` | `/doctor` réclame les étapes des découpés, et reste d'un bloc |
| P6 | `69331a5` | un chemin d'étape cité qui n'existe pas ne passe plus |
| P7 | `643c264` | un runbook livré ne cite plus un dossier du kit ; son numéro ne ment plus |

État final : **418 tests, 0 fail**, arbre propre, plugin Cursor à jour.

## Les deux écarts plan / réalisé

Le plan (`:150`) rangeait quatre commandes sous « P5 → dossier d'étapes » :
`new-feature` · `init-vibecoding` · **`help`** · **`doctor`**.

Les deux dernières ont été **laissées d'un bloc**, sur mesure. Ce n'est pas un manquement mais un
**résultat postérieur** à l'écriture de cette ligne :

- **`/help` est un catalogue**, pas une suite d'actions. Le motif du découpage impose une SORTIE
  par étape ; un catalogue n'en produit aucune.
- **`/doctor` ne produit aucun artefact** : ses items sont des lectures qui alimentent UN verdict
  unique, et ce verdict désigne ses items **par leur numéro**. Éclatés, ces numéros ne
  désigneraient plus aucun fichier ouvrable — l'identifiant « Phase N » que P4 a précisément aboli.
  De plus « mon environnement est-il prêt ? » exige TOUS les items : l'assistant rouvrirait chaque
  fragment à chaque fois, avec le risque nouveau d'en sauter un.

**La décision est verrouillée dans le code, pas seulement ici** : `commands.test.mjs` D6ter
(`etapesDuRunbook(ROOT, 'doctor')` doit rester vide) et D8 (idem pour `/help`), chacun précédé de
son argument. Quiconque les découpera demain obtient un rouge qui **nomme la raison**.

## Ce que la revue finale a trouvé, et que les six paliers avaient raté

**1. Un garde manquant — le seul défaut qui atteignait vraiment l'utilisateur.**
Des quatre propriétés statiques exigées par le plan, trois étaient tenues. La quatrième —
« chaque chemin d'étape cité existe » — ne l'était pas. `erreursChecklist` ne regarde qu'un sens
de la flèche : elle part des étapes **du disque** et vérifie que l'entrée les cite ; un chemin
**cité** que rien ne porte lui est invisible. Mesuré sur `40e533d`, 416 tests verts avec un
dossier mal orthographié, et 416 verts avec une 10ᵉ case vers une étape jamais livrée. Dans les
deux cas la commande démarre puis renvoie dans le vide dès sa première case — et l'item 7 de
`/doctor`, dont c'est exactement la procédure, aurait rendu un ✗ pour un fichier que le kit n'a
jamais posé. Fermé par `erreursRenvois` (`69331a5`), muté quatre fois.

**2. Deux affirmations fausses écrites pendant le chantier.** C'est le défaut que **toutes** les
revues de ce dépôt trouvent, sans exception.

- L'inventaire verbatim de `/new-project` se présentait comme « les 111 lignes du fichier d'avant
  le découpage ». Diff ligne à ligne contre `3ca5ecf^` : **19 des 111 avaient été réécrites
  depuis**, par P4. Son propre message d'échec exige de « dire laquelle et pourquoi » — contrat
  tenu pour `/new-feature` et `/init-vibecoding`, jamais ici. Les 19 sont désormais énumérées par
  catégorie.
- `runbook-executable.test.mjs` annonçait sa vérification par exécution « dans
  `docs/superpowers/audits/` ». **Le fichier n'y a jamais été déposé.** La preuve existe : elle est
  le corps du commit `6fd94c3` (forme complète jouée prompt par prompt, `[build] Complete!` +
  `dist/`). On cite maintenant où elle **est**.

**Aucune consigne perdue.** Les 19 lignes s'apparient une à une avec les 19 lignes d'origine, rien
d'orphelin d'un côté ni de l'autre. `/new-feature` : 3 réécrites, exactement les 3 déclarées.
`/init-vibecoding` : 0 réécrite, 0 perdue.

**3. Deux résidus cosmétiques, corrigés en P7.**

- Deux runbooks livrés citaient un dossier **source** du kit en note de provenance
  (`templates/agents/loop-section.md`, `templates/agents/design-rule.md`). `templates/` n'existe
  pas dans un projet généré : le débutant qui suit le renvoi cherche un dossier absent de chez
  lui. **Le garde qui l'exigeait était la cause** — `validate-commands.mjs` réclamait la chaîne
  `loop-section.md` dans l'entrée. Il exige maintenant la **destination** (la boucle + `AGENTS.md`),
  et le maillon vers la source est vérifié dans le test, sur le disque.
- Le numéro en gras de la checklist (`**05**`) n'était comparé à rien : le passer à `**04**`
  laissait 416 verts et affichait deux cases « 04 ». `erreursChecklist` les compare — sans imposer
  d'afficher un numéro, ce qui serait juger une formulation.

## Le parcours réel, joué

Personne ne l'avait fait de bout en bout **depuis** le découpage. 181 contrôles, 0 échec, sur les
12 combinaisons stack × assistant réellement scaffoldées :

- les **19 étapes** arrivent dans le dossier natif des 3 assistants — et exactement 19, aucune
  orpheline ;
- les 19 cases de checklist pointent 19 fichiers présents, chez les 3 ;
- **Codex** reçoit chaque étape **en entier** dans son fichier unique (comparaison octet à octet
  avec la source), plus le dossier livré à côté ;
- **`--refresh`** régénère une étape supprimée à l'identique du kit, sans toucher au code ni aux
  documents écrits par l'utilisateur ;
- **item 7 de `/doctor`**, exécuté à la lettre : ✓ sur les 12 projets sains, ✗ nommant le fichier
  sur un projet amputé d'une étape, ✗ nommant les 9 chemins sur un projet amputé du dossier.

Re-vérifié après P7 sur 3 projets (cursor · claude-code · codex) : 29 fichiers de commandes
chacun, **zéro** chemin source du kit, cadre boucle → `AGENTS.md` lisible partout.

## Ce qui reste ouvert

Rien de bloquant pour ce chantier. Les résiduels connus vivent dans
[`2026-08-04-ce-qui-reste.md`](../plans/2026-08-04-ce-qui-reste.md) — notamment : Windows n'a
jamais été exécuté, et les gardes du lot G ne survivent pas à une reformulation.

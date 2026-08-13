# Présenter le kit à des débutants complets

Texte prêt à dire. Prends ce qui te sert, coupe le reste.
Public visé : des gens qui n'ont **jamais** codé, ou qui ont essayé de « faire coder l'IA » et se sont plantés.

---

## 1. Le pitch en 30 secondes

> « Tu peux demander à une IA de coder ton application. Le problème, c'est qu'elle ne sait pas
> **où elle est**, **ce que tu veux vraiment**, ni **si ce qu'elle a écrit marche**. Alors elle
> invente, elle oublie, et au bout de trois jours tu as un truc qui ne démarre plus.
>
> Ce kit installe, en une commande, tout ce qui manque à ton IA pour travailler comme une vraie
> équipe de développement : un cadre, une mémoire, des règles, et quelqu'un qui vérifie son travail.
>
> Tu tapes une commande. Tu réponds à quatre questions. Et tu as un environnement de développement
> professionnel — sans savoir ce qu'est un environnement de développement. »

---

## 2. Le problème, expliqué avec des mots normaux

Fais-le sentir avant d'expliquer la solution. Trois histoires que tout le monde reconnaît :

**« L'IA invente des trucs qui n'existent pas. »**
Elle a appris sur des textes vieux de plusieurs mois. Elle te propose une fonction supprimée depuis.
Tu perds deux heures à comprendre pourquoi ça ne marche pas — alors que le code est juste périmé.

**« Elle oublie tout entre deux conversations. »**
Lundi tu décides « les boutons sont orange ». Jeudi elle te les fait bleus. Tu redis. Elle recommence.
Ce n'est pas de la mauvaise volonté : elle n'a **aucun souvenir** de lundi.

**« Elle dit que c'est fini, et ça ne marche pas. »**
Le plus dangereux. Elle affiche « ✅ terminé », tu la crois, tu passes à la suite. Trois jours plus
tard tu découvres que le bouton n'a jamais été branché à rien.

> **La phrase à retenir :** *« Une IA qui code n'est pas mauvaise. Elle est mal renseignée, sans
> mémoire, et personne ne relit son travail. Ce kit règle ces trois choses. »*

---

## 3. Ce que le kit fait, concrètement

Quatre choses. Pas plus.

### Il donne à l'IA la doc **officielle et à jour**
Le kit embarque les documentations réelles des technologies utilisées, dans un dossier que ton IA
lit avant d'écrire. Elle ne devine plus, elle vérifie.

### Il lui donne une **mémoire**
Chaque décision, chaque erreur rencontrée, chaque convention est écrite dans le projet. Au démarrage
de chaque session, l'IA les relit. Elle ne refait pas deux fois la même bêtise.

### Il lui donne une **méthode**
Pas « code-moi une appli ». Un ordre imposé : comprendre le problème → écrire ce qu'on va faire →
dessiner l'écran → **puis** coder, morceau par morceau. Chaque morceau est vérifié avant le suivant.

### Il lui met une **équipe de contrôle**
Sept relecteurs automatiques. Ils ne codent pas — ils vérifient. Un relit le code, un cherche les
failles de sécurité, un rejoue l'application en vrai pour voir si ça marche, un juge et tranche :
**PROUVÉ** ou **NON PROUVÉ**. L'IA n'a plus le droit de dire « c'est fini » toute seule.

---

## 4. Ce que tu peux construire

Quatre types d'applications. Tu choisis au début, le kit adapte tout le reste.

| Tu veux… | On appelle ça | Exemples |
|---|---|---|
| Un site à montrer | **Vitrine** | portfolio, site d'entreprise, blog |
| Une application dans le navigateur, avec des comptes | **SaaS / web** | outil de gestion, tableau de bord, plateforme |
| Une application sur téléphone | **Mobile** | iPhone et Android en même temps |
| Un logiciel à installer sur l'ordinateur | **Desktop** | Mac, Windows, Linux |

> **À dire :** *« Tu n'as pas à choisir les technologies. Elles sont déjà choisies, testées, et
> l'IA sait déjà s'en servir correctement. Toi tu choisis ce que tu veux construire. »*

---

## 5. Comment on s'en sert — les trois moments

Toute la démo tient en trois moments. Montre-les dans cet ordre.

### Moment 1 — Installer *(5 minutes, une fois)*

Dans un dossier vide, une commande :

```bash
npm create vibecoding-kit@latest
```

Quatre questions : quel type d'app, quel assistant IA, le nom du projet, et si tu veux le **mode
apprentissage**. C'est tout. Le kit pose absolument tout : les règles, la mémoire, les commandes,
les vérifications de sécurité, la doc.

Il te donne ensuite un texte à coller dans ton IA. Tu le colles. Il te reste **trois petits gestes
manuels** (l'IA te les fait faire elle-même) — installer deux ou trois extensions dans ton
assistant. Cinq minutes.

Puis, pour vérifier que tout est branché :

```
/doctor
```

Il répond « ✅ ton environnement est prêt », ou il te dit exactement ce qui manque.

### Moment 2 — Cadrer avant de coder *(la partie que tout le monde saute, et c'est l'erreur)*

```
/new-project « une appli pour gérer les inscriptions de mon club de sport »
```

L'IA ne code pas. Elle t'interviewe, en **neuf étapes**, une par une :

1. **Le problème** — ce qui ne va pas aujourd'hui, *sans* parler de ta solution
2. **Le PRD** — le document qui dit ce que le produit fait, pour qui, et pourquoi
3. **La technique** — comment c'est construit
4. **L'arborescence** — la carte de tous les écrans et comment on circule entre eux
5. **Le design** — les couleurs, les polices, puis la **maquette** de chaque écran
6. **La roadmap** — la liste des étapes de construction, tirée de la maquette
7. **Le squelette du projet** — l'IA crée le vrai projet

> **Le truc à faire comprendre :** *« Ce n'est pas de la paperasse. La maquette devient la roadmap :
> chaque écran que tu as vu dessiné devient une étape de construction. Tu sais toujours ce qui
> arrive ensuite, et à quoi ça ressemblera. »*

Tu n'as pas de maquette ? L'IA la dessine avec toi. Tu en as une ? Elle la prend.

### Moment 3 — Construire *(et voir l'app grandir)*

```
/build
```

L'IA construit **une étape à la fois**. À chaque étape :

- elle écrit le code,
- elle **lance ta vraie application** et prend une capture d'écran,
- elle compare avec la maquette,
- elle refait le parcours utilisateur en vrai, comme le ferait un humain,
- ses relecteurs passent : code, sécurité, fonctionnement,
- **puis** elle te demande « on continue ? ».

En **mode apprentissage**, elle t'explique ce qu'elle vient de faire, **pourquoi comme ça**, et te
donne le mot du jour — pris dans *ton* projet, pas un exemple générique. Puis elle l'écrit dans
`docs/APPRENTISSAGE.md`.

> **Insiste là-dessus, c'est ce qui plaît :** *« Elle ne vous interroge jamais. Vous n'avez pas
> d'examen à passer, vous construisez. Mais tout ce qu'elle vous apprend est écrit, numéroté, dans
> l'ordre. À la fin, ce carnet raconte la construction de votre app du début à la fin — et le jour
> où vous vous demandez "pourquoi c'est fait comme ça ?", la réponse est à la date où ça s'est
> décidé. »*

---

## 6. Les commandes — il y en a dix, tu en retiens une

```
/help
```

C'est la seule à mémoriser. Elle liste tout et te dit par où continuer.

| Commande | Quand tu la tapes |
|---|---|
| **`/help`** | « Je fais quoi ? » — l'aide-mémoire |
| **`/new-project`** | Démarrer un projet de zéro |
| **`/build`** | Construire, étape par étape |
| **`/new-feature`** | Ajouter une fonctionnalité à un projet qui existe |
| **`/edit-design`** | Changer l'apparence |
| **`/doctor`** | « Est-ce que tout est bien branché ? » |
| **`/next`** | « Je suis perdu, je fais quoi maintenant ? » |
| **`/sos`** | Ça casse → revenir au dernier moment où ça marchait |
| **`/deploy`** | Mettre en ligne |
| **`/init-vibecoding`** | Installer le kit dans un projet déjà existant |

> **À dire :** *« Tu ne mémorises rien. Tu tapes `/help` et il te dit quoi taper. »*

---

## 7. Les garde-fous — pourquoi tu ne peux pas te planter gravement

C'est l'argument qui rassure vraiment un débutant. Prends le temps.

**Règle Réalité — zéro faux-semblant.**
Interdiction absolue de faux boutons, de fausses données, de « je ferai ça plus tard ». Chaque
bouton doit vraiment marcher. Si l'IA prend un raccourci, la règle est violée et ça se voit.

**Règle Preuve — trois tentatives, puis stop.**
Si l'IA n'y arrive pas au bout de trois essais, elle s'arrête et écrit **BLOQUÉ** avec la raison.
Fini les boucles où elle casse en réparant. Tu es prévenu, pas embarqué.

**Points de sauvegarde.**
À chaque étape terminée, le kit pose un repère. Ça casse ? `/sos` te ramène au dernier moment vert.
Tu ne perds jamais plus d'une étape.

**Tes secrets ne partent jamais.**
Une vérification automatique bloque l'envoi si un mot de passe ou une clé traîne dans ton code.
Elle se déclenche toute seule, tu n'as rien à faire.

**Rien n'est jamais écrasé.**
Quand tu mets le kit à jour, il régénère ses propres fichiers — et **jamais** ton code, ni ton PRD,
ni ta maquette, ni tes notes.

---

## 8. La mise à jour — un argument fort, dis-le

```bash
npx create-vibecoding-kit@latest --refresh
```

Depuis ton projet. Le kit se met à jour : nouvelles règles, nouvelles commandes, **documentation
officielle rafraîchie**. Ton travail n'est pas touché.

> **À dire :** *« Ton projet ne vieillit pas tout seul dans son coin. Quand les technologies
> évoluent, tu récupères les nouveautés en une commande. »*

---

## 9. Sois honnête — ça inspire plus confiance que la promesse parfaite

Deux phrases à dire, franchement :

> *« Ça ne code pas à ta place sans que tu comprennes rien. Ça t'oblige à savoir ce que tu veux —
> et c'est justement le travail que la plupart des gens sautent. »*

> *« Ce n'est pas magique. L'IA se trompe encore. La différence, c'est qu'ici elle se trompe
> **visiblement** : quelqu'un relit, teste et refuse de valider. Une erreur vue est une erreur
> réparable. »*

---

## 10. Les questions qu'ils vont poser

**« Je dois savoir coder ? »**
Non. Tu dois savoir **dire ce que tu veux**. Le kit t'aide à le formuler, l'IA écrit le code.

**« Ça coûte quelque chose ? »**
Le kit est gratuit et ouvert. Ce que tu paies, c'est ton assistant IA — comme aujourd'hui.
Un guide dans le projet explique comment ne pas faire exploser la facture.

**« Ça marche avec quel outil ? »**
Cursor, Claude Code, ou Codex. Tu choisis au début, le kit s'adapte. Tu peux changer plus tard.

**« Et si je casse tout ? »**
`/sos`. Retour au dernier moment où ça marchait. C'est prévu, ce n'est pas un incident.

**« C'est quoi la différence avec juste demander à ChatGPT ? »**
ChatGPT te donne du code. Le kit donne à l'IA **le contexte de ton projet**, une mémoire, une
méthode, et des relecteurs. C'est la différence entre un stagiaire brillant sans consignes et une
équipe qui sait où elle va.

**« Ça marche sur Windows ? »**
Oui — Windows, Mac et Linux sont testés automatiquement à chaque modification du kit.
*(Note pour toi, formateur : teste quand même une installation sur un vrai poste Windows avant une
session en salle. C'est le point le moins éprouvé.)*

---

## 11. Prérequis à annoncer avant la session

Trois choses à installer **avant** d'arriver — ça fait gagner 30 minutes :

1. **Node.js version 22.12 ou plus** — sur https://nodejs.org, le gros bouton.
   Vérifier avec `node --version`.
2. **git**
3. **Un assistant IA** : Cursor, Claude Code ou Codex.

> Le guide complet est dans le kit : `guides/02-installer-les-outils.md`.

---

## 12. La démo de 10 minutes

Si tu n'as que dix minutes, fais exactement ça — et **ne saute pas la dernière ligne**.

1. Dossier vide → `npm create vibecoding-kit@latest` → quatre questions *(1 min)*
2. Montre ce qui a été créé — sans détailler, juste le volume *(1 min)*
3. Colle le prompt dans l'IA → `/doctor` → ✅ *(1 min)*
4. `/new-project « ton idée »` → laisse l'étape 1 tourner : **l'IA refuse de coder et pose des
   questions** *(3 min)*
5. Montre une maquette déjà faite et la roadmap qui en découle *(2 min)*
6. Lance `/build` sur une étape → montre la capture d'écran et le verdict des relecteurs *(2 min)*

> **La phrase de fin :** *« Vous venez de voir une IA refuser de coder tant qu'elle n'avait pas
> compris, puis refuser de dire "c'est fini" tant que ça n'avait pas été vérifié. C'est tout ce que
> fait ce kit — et c'est tout ce qui manque à 90 % des gens qui font du vibe coding. »*

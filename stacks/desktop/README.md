# 🖥️ Stack Desktop — Electron

> Pour construire une **application de bureau** (Windows, Mac, Linux) : un logiciel qu'on installe et qu'on lance depuis son ordinateur.

**Techno : Electron**

---

## C'est quoi Electron ? (expliqué simplement)

Electron te permet de créer des applications de bureau avec les technologies du **web** (HTML, CSS, JavaScript) — les mêmes qui font les sites internet. Pas besoin d'apprendre un langage différent pour Windows, un autre pour Mac : tu écris **une seule fois**, ça tourne partout.

Sous le capot, Electron assemble deux briques :
- **Chromium** (le moteur de Google Chrome) pour afficher ton interface,
- **Node.js** pour accéder à l'ordinateur (fichiers, réseau, menus…).

Des logiciels que tu connais sûrement sont faits avec Electron : **VS Code, Slack, Discord**. Une app Electron a un **main process** (le chef d'orchestre qui gère les fenêtres et le système) et un ou plusieurs **renderer process** (qui affichent chaque fenêtre, comme un onglet de navigateur).

**Pourquoi c'est bien pour débuter :** tu réutilises tes compétences web, tu obtiens une vraie app installable, et comme tout est du HTML/CSS/JS classique, l'IA génère et corrige le code très facilement.

---

## Démarrer un projet (commande officielle)

Electron se scaffolde via **Electron Forge** (l'outil officiel de création + packaging) :

```bash
npx create-electron-app@latest mon-app
cd mon-app
npm start
```

Version TypeScript + Vite (recommandée) :
```bash
npx create-electron-app@latest mon-app --template=vite-typescript
```

> Templates first-party disponibles : `webpack`, `webpack-typescript`, `vite`, `vite-typescript`.

Pour **empaqueter** ton app en installateur distribuable :
```bash
npm run make
```

---

## 📚 Documentation officielle (liens vérifiés)

| Ressource | Lien | À quoi ça sert |
|---|---|---|
| Accueil de la doc | https://www.electronjs.org/docs/latest | Le point d'entrée de toute la documentation Electron. |
| Tutoriel — prérequis | https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites | Ce qu'il faut installer/savoir avant de commencer. |
| Ta première app | https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app | Créer le projet, ouvrir une fenêtre, charger une page HTML. |
| Modèle de processus | https://www.electronjs.org/docs/latest/tutorial/process-model | Comprendre le main process vs le renderer process. |
| Sécurité (checklist 20 points) | https://www.electronjs.org/docs/latest/tutorial/security | Les bonnes pratiques indispensables pour ne pas exposer l'utilisateur. |
| Packaging / distribution | https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging | Transformer ton app en installateur pour Windows/Mac/Linux. |
| Electron Forge | https://www.electronforge.io | L'outil officiel de création, build et publication. |

**Repos GitHub officiels :**
- Framework : https://github.com/electron/electron
- Electron Forge : https://github.com/electron/forge
- Electron Fiddle (bac à sable pour tester) : https://github.com/electron/fiddle — téléchargeable sur https://www.electronjs.org/fiddle

---

## 🤖 Ressources IA — comment « donner Electron » à Claude

> ⚠️ Contrairement aux autres stacks, Electron **ne publie pas** de fichier `llms.txt` ni de serveur MCP officiel (vérifié : les URLs renvoient une erreur 404). **N'invente pas de lien `llms.txt` pour Electron** — il n'existe pas.

**La bonne nouvelle : tu as mieux.** Cet environnement Claude Code contient déjà des **skills Electron officiels et complets**. Ce sont des modules d'expertise que Claude charge tout seul quand tu parles d'Electron. Tu peux aussi les invoquer explicitement :

| Skill | Quand l'utiliser | Comment le déclencher |
|---|---|---|
| `electron:create-app` | Créer une nouvelle app sécurisée par défaut | « Utilise le skill electron:create-app pour démarrer mon app » |
| `electron:add-feature` | Ajouter tray, notifications, raccourci global, deep links… | « Ajoute une icône dans la barre système (skill electron:add-feature) » |
| `electron:add-ipc` | Faire communiquer l'interface et le système en sécurité | « Ajoute un canal IPC pour lire un fichier » |
| `electron:security` / `electron:security-audit` | Sécuriser / auditer l'app (checklist 20 points) | « Audite la sécurité de mon app Electron » |
| `electron:process-model-ipc` | Comprendre main vs renderer et l'IPC | « Explique-moi le modèle de processus » |
| `electron:distribution` / `electron:package` | Packaging, signature, notarisation, auto-update | « Prépare mon app pour la distribution Mac + Windows » |
| `electron:testing-debugging` | Tester et déboguer | « Mets en place des tests avec Playwright » |
| `electron:doctor` | Réparer une app cassée (fenêtre blanche, crash au démarrage) | « Mon app affiche une fenêtre blanche, aide-moi » |
| `electron:review` | Revue avant de livrer | « Fais une revue pré-livraison de mon app » |
| `electron:explain` | Expliquer un concept ou une erreur | « Explique-moi cette erreur Electron » |

> Autres skills dispo : `electron:app-lifecycle`, `electron:windows`, `electron:performance`, `electron:crash-diagnostics`, `electron:native-ui`, `electron:native-node-modules`, `electron:networking-protocol`, `electron:webcontents-navigation`, `electron:system-integration`.

👉 **Réflexe :** quand tu construis ta partie desktop, commence tes demandes par *« utilise les skills electron »*. Claude ira chercher la bonne expertise tout seul.

Un fichier `AGENTS.md` prêt à copier dans ton projet est fourni : `stacks/desktop/AGENTS.md`.

> 🔒 **Avant de distribuer ton app** : sécurité + coûts IA → [`guides/03-securite-et-couts.md`](../../guides/03-securite-et-couts.md) (+ le skill `electron:security-audit`).

---

## 👉 Prochaine étape

Ouvre **`stacks/desktop/prompts-de-demarrage.md`** pour les prompts prêts à copier-coller à ton IA.

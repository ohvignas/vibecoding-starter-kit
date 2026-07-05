# Prompts de démarrage — App desktop (Electron)

> Copie-colle ces prompts à ton IA (Claude Code de préférence, pour profiter des **skills Electron**), **dans l'ordre**. Adapte le texte entre `⟨crochets⟩`.

---

### 🅰️ Avant de commencer
1. Copie **`stacks/desktop/AGENTS.md`** de ce dépôt à la racine de ton futur projet.
2. Avec Claude Code, tu peux invoquer directement les skills `electron:*` (voir le README desktop).

---

### Prompt 1 — Créer l'app
```
Je démarre une app desktop (Windows/Mac/Linux) avec Electron. Je débute.
Utilise le skill electron:create-app pour scaffolder une app sécurisée par défaut
(contextIsolation activé, sandbox activé, un preload propre).
Version TypeScript + Vite si possible. Donne les commandes une par une et dis-moi
comment lancer l'app (npm start) et ce que je dois voir.
```

### Prompt 2 — Décrire mon app et l'interface
```
Mon app desktop sert à : ⟨décris en 2 phrases, ex. "un minuteur Pomodoro qui reste
au-dessus des autres fenêtres"⟩.

Construis l'interface principale (la fenêtre) en HTML/CSS simple et propre.
Explique-moi la différence entre ce que je vois (renderer) et le code système (main).
```

### Prompt 3 — Faire communiquer l'interface et le système
```
Je veux que l'app puisse ⟨ex. "lire et sauvegarder un fichier de notes sur le disque"⟩.
Utilise le skill electron:add-ipc pour créer un canal IPC SÛR
(preload + contextBridge côté renderer, ipcMain.handle côté main).
Ne désactive jamais contextIsolation. Explique le trajet d'un message.
```

### Prompt 4 — Ajouter une fonctionnalité native
```
Ajoute : ⟨ex. "une icône dans la barre système (tray) avec un menu", ou
"des notifications", ou "un raccourci clavier global"⟩.
Utilise le skill electron:add-feature. Explique-moi le code ajouté.
```

### Prompt 5 — Vérifier la sécurité
```
Fais un audit de sécurité de mon app avec le skill electron:security-audit
(checklist officielle 20 points). Liste ce qui va, ce qui ne va pas, et corrige
les points critiques. Explique chaque correction simplement.
```

### Prompt 6 — Packager pour distribution
```
Prépare mon app pour la distribution avec le skill electron:distribution / Electron Forge.
Je veux un installateur pour ⟨Windows et/ou Mac⟩. Explique les étapes,
et ce qu'il faut pour la signature (et pourquoi c'est important).
Commande de build attendue : npm run make.
```

---

### 🆘 Prompt de débogage
```
Mon app Electron ⟨affiche une fenêtre blanche / plante au démarrage / erreur X⟩.
Voici l'erreur complète :
⟨colle le message⟩

Utilise le skill electron:doctor pour diagnostiquer, puis corrige.
```

> 💡 Réflexe : commence tes demandes Electron par « utilise le skill electron:… ». Claude ira chercher la bonne expertise tout seul.

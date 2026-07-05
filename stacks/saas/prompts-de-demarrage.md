# Prompts de démarrage — SaaS (Convex + TanStack Start + Better Auth)

> Copie-colle ces prompts à ton IA (Claude Code ou Cursor), **dans l'ordre**, un par un. Attends que chaque étape marche avant la suivante. Adapte le texte entre `⟨crochets⟩`.

---

### 🅰️ Avant de commencer
1. Ouvre le dossier de ton projet dans Cursor (ou lance `claude` dedans).
2. Copie le fichier **`stacks/saas/AGENTS.md`** de ce dépôt à la racine de ton projet.
3. Copie le **`.mcp.json`** de ce dépôt à la racine (pour brancher les MCP Convex).
4. Lance `bash scripts/download-ai-context.sh` pour récupérer les `llms.txt`.

---

### Prompt 1 — Installer la stack
```
Je démarre un SaaS. Stack : Convex + TanStack Start + Better Auth.
Suis le guide officiel https://labs.convex.dev/better-auth/framework-guides/tanstack-start
et respecte les règles de mon fichier AGENTS.md.

Objectif de cette étape UNIQUEMENT : mettre en place le projet qui démarre
(page d'accueil vide qui s'affiche, backend Convex connecté).
Donne-moi les commandes une par une et dis-moi quoi vérifier à chaque fois.
Ne code pas de fonctionnalité pour l'instant.
```

### Prompt 2 — Décrire mon SaaS et modéliser les données
```
Mon SaaS sert à : ⟨décris en 2 phrases ce que fait ton app, ex. "gérer les
réservations d'un salon de coiffure"⟩.

Les utilisateurs connectés doivent pouvoir : ⟨liste 3-4 actions clés⟩.

Propose-moi le schéma de la base de données Convex (fichier convex/schema.ts)
correspondant, avec un mot d'explication par table. NE CODE PAS ENCORE le reste,
attends ma validation du schéma.
```

### Prompt 3 — Mettre en place l'authentification
```
Mets en place l'authentification avec Better Auth via @convex-dev/better-auth,
en suivant le guide officiel Convex Labs pour TanStack Start.
Je veux : inscription + connexion par email/mot de passe pour commencer.

Respecte la version de better-auth imposée par la doc Convex (pas @latest).
À la fin, donne-moi une page de connexion simple et explique-moi comment
créer un compte de test.
```

### Prompt 4 — Ma première vraie fonctionnalité
```
Construis la première fonctionnalité : ⟨ex. "l'utilisateur connecté voit la liste
de SES réservations et peut en ajouter une via un formulaire"⟩.

Utilise des fonctions Convex (query pour lire, mutation pour créer).
Assure-toi qu'un utilisateur ne voit que SES données.
Explique-moi le flux (front → mutation Convex → base → mise à jour temps réel).
```

### Prompt 5 — Soigner l'interface
```
Améliore l'apparence de ⟨la page X⟩ pour qu'elle soit propre et moderne,
responsive (mobile + desktop). Reste simple et lisible.
Explique-moi les choix de mise en page.
```

### Prompt 6 — Déployer
```
Je veux mettre mon SaaS en ligne. Guide-moi pour :
1) déployer le backend Convex en production,
2) déployer le front TanStack Start (propose une option simple, ex. Netlify).
Explique chaque étape et ce qu'il faut configurer (variables d'env, domaines).
```

---

### 🆘 Prompt de débogage (quand ça casse)
```
J'ai cette erreur :
⟨colle le message d'erreur COMPLET du terminal ou de la console⟩

Explique-moi ce qui se passe en une phrase simple, puis corrige.
Si tu n'es pas sûr, propose la piste la plus probable d'abord.
```

> 💡 Si l'IA tourne en rond après 2-3 essais : ouvre une **nouvelle conversation**, recolle ton `AGENTS.md` + l'objectif, et repars propre.

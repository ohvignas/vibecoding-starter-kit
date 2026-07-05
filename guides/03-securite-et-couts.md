# Sécurité & coûts (optionnel — quand tu montes en niveau)

> Ces deux sujets ne sont **pas** nécessaires pour démarrer. Reviens ici **quand tu approches de la publication** (sécurité) ou **quand ta facture IA grimpe** (coûts).

---

## 🔒 Partie 1 — Vérifier la sécurité avant de publier

Un débutant livre souvent une app avec des trous de sécurité sans le savoir. Avant d'ouvrir ton app à de vrais utilisateurs, fais un contrôle.

### Ce que tu as déjà dans le kit
- **SaaS / mobile** : **Better Auth** gère l'authentification proprement (sessions, mots de passe, OAuth) — ne réinvente pas l'auth à la main.
- **Desktop** : utilise le skill **`electron:security-audit`** (checklist officielle 20 points).
- **Toujours** : ne mets **jamais** de secret (clé API, token) dans le code envoyé au client ; utilise les variables d'environnement. Commit `.env` = jamais (vérifie ton `.gitignore`).

### Scan approfondi (optionnel, niveau avancé) — Strix
**Strix** est un agent IA qui teste ton app comme un vrai hacker et **prouve** les failles trouvées (open-source, licence Apache-2.0).

> ⚠️ **Niveau avancé.** Nécessite **Docker installé et démarré** + **ta propre clé API LLM** (OpenAI/Anthropic…), facturée à part de ton assistant de code. À faire **au moment de publier**, pas le premier jour.

Installation :
```bash
curl -sSL https://strix.ai/install | bash
```
Configuration (tes clés) :
```bash
export STRIX_LLM="openai/gpt-5.4"      # ou un modèle Anthropic
export LLM_API_KEY="ta-cle-api"
```
Lancer sur ton app :
```bash
strix --target ./mon-app          # un dossier de code local
strix --target https://mon-app.com # une app en ligne
```

> ⚠️ **Règle absolue (dans leur doc) :** *« Only test apps you own or have permission to test. »* Ne scanne **que** des apps qui t'appartiennent. C'est un outil offensif — l'utiliser sur le site de quelqu'un d'autre est illégal.

**Bonus SaaS — scan automatique à chaque Pull Request** (GitHub Actions) :
```yaml
name: strix-penetration-test
on:
  pull_request:
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Install Strix
        run: curl -sSL https://strix.ai/install | bash
      - name: Run Strix
        env:
          STRIX_LLM: ${{ secrets.STRIX_LLM }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
        run: strix -n -t ./ --scan-mode quick
```
Repo : https://github.com/usestrix/strix

---

## 💸 Partie 2 — Réduire tes coûts IA

Avant tout outil, les **vrais leviers** (gratuits, efficaces tout de suite) :

1. **Contexte léger.** Ne balance pas des fichiers énormes ou tout ton projet à l'IA. Donne juste ce qui est utile. *C'est le poste de coût n°1* (les tokens d'**entrée** dominent la facture).
2. **Une fonctionnalité à la fois**, puis **nouvelle conversation** quand ça part en vrille (une longue conversation coûte de plus en plus cher car tout l'historique est renvoyé à chaque message).
3. **Modèle moins cher pour les tâches simples** (renommer, formater, petites questions) ; garde le gros modèle pour l'architecture et le debug difficile.
4. **Commits fréquents** : tu évites de tout re-expliquer à l'IA après une erreur.

### Compresseur de sortie (optionnel) — caveman
**caveman** (MIT) fait parler l'IA en style « télégraphique » (supprime articles/tournures de politesse) pour réduire les **tokens de sortie**. Le **code, les commandes et les erreurs restent intacts**.

Installation universelle (configure Claude Code, Cursor, Codex… d'un coup) :
```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```
Claude Code (alternative via plugin) :
```
claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman
```
Usage : `/caveman` pour activer, « normal mode » pour couper. Niveaux : `lite`, `full`, `ultra`.

> ⚠️ **À savoir honnêtement (c'est écrit dans leur propre doc) :**
> - Ça ne réduit que la **sortie** — pas ton contexte/entrée, qui est le plus gros poste. Économie réelle par session ≈ **14-21 %**, et parfois **négative** sur des échanges courts.
> - Ça **coupe les explications** de l'IA. Or, quand tu **apprends**, ces explications sont précieuses.
> 👉 **Reco pour débuter :** garde les explications (n'active pas caveman au début). Essaie-le **plus tard**, quand tu es à l'aise, et vérifie avec `/caveman-stats` (ou le tableau de conso de ton fournisseur) que ça t'économise vraiment **sur ton usage à toi**.

Repo : https://github.com/JuliusBrussee/caveman

> 💡 L'installeur du kit peut poser caveman pour toi (question optionnelle, **défaut : non**). Tu peux aussi l'installer plus tard avec la commande ci-dessus.

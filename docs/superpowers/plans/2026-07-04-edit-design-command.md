# `/edit-design` — Implementation Plan (SP-C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer le runbook `/edit-design` (charge les 5 skills design + `design.md` AVANT toute édition UI, puis édite) + l'extension du validateur.

**Architecture:** Un runbook Markdown `templates/commands/edit-design.md` + une fonction `validateEditDesignCommand(root)` ajoutée à `scripts/lib/validate-commands.mjs`. Réutilise `templates/agents/design-rule.md` (déjà livré en SP-A). TDD sur le validateur ; contenu éditorial pour le runbook, garanti par le validateur.

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Markdown.

## Global Constraints

- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- Les 5 skills design (exacts) : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`. Le runbook DOIT charger ces 5 + lire `docs/design.md` **avant** d'éditer.
- Ne pas casser l'export existant `validateNewProjectCommand` de `scripts/lib/validate-commands.mjs`.
- Runbook source sous `templates/commands/` ; wiring installeur = SP-F (hors périmètre).

---

### Task 1 : `validateEditDesignCommand`

**Files:**
- Modify: `scripts/lib/validate-commands.mjs` (ajouter un export, ne rien changer d'existant)
- Test: `scripts/lib/validate-edit-design.test.mjs`

**Interfaces:**
- Consumes: rien.
- Produces: `validateEditDesignCommand(root) -> string[]` (vide si OK). Vérifie que `templates/commands/edit-design.md` existe + référence les 5 skills design + `design.md`.

- [ ] **Step 1 : Écrire le test qui échoue (fixtures temp)**

```js
// scripts/lib/validate-edit-design.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateEditDesignCommand } from './validate-commands.mjs';

const SKILLS = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines'];

function makeRoot({ omitSkill = null, omitDesignMd = false, omitRunbook = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-'));
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const skills = SKILLS.filter(s => s !== omitSkill).join(' ');
    const dmd = omitDesignMd ? '' : 'docs/design.md';
    fs.writeFileSync(path.join(root, 'templates/commands/edit-design.md'), `${skills}\n${dmd}\n`);
  }
  return root;
}

test('runbook complet → aucune erreur', () => {
  assert.deepEqual(validateEditDesignCommand(makeRoot()), []);
});
test('skill manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitSkill: 'shadcnblocks' })).some(e => /shadcnblocks/.test(e)));
});
test('design.md manquant → erreur', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitDesignMd: true })).some(e => /design\.md/.test(e)));
});
test('runbook absent → erreur unique', () => {
  assert.ok(validateEditDesignCommand(makeRoot({ omitRunbook: true })).some(e => /edit-design\.md/.test(e)));
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/validate-edit-design.test.mjs`
Expected: FAIL (`validateEditDesignCommand` non exporté).
*(Si bruit nvm : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.)*

- [ ] **Step 3 : Ajouter la fonction dans `scripts/lib/validate-commands.mjs`** (à la fin, sans toucher au reste)

```js
export function validateEditDesignCommand(root) {
  const errors = [];
  const rb = path.join(root, 'templates/commands/edit-design.md');
  if (!fs.existsSync(rb)) { errors.push('manquant : templates/commands/edit-design.md'); return errors; }
  const txt = fs.readFileSync(rb, 'utf8');
  const skills = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines', 'shadcnblocks', 'brand-guidelines'];
  for (const s of skills) if (!txt.includes(s)) errors.push(`edit-design : skill non référencé « ${s} »`);
  if (!txt.includes('design.md')) errors.push('edit-design : design.md non référencé');
  return errors;
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/validate-edit-design.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/validate-commands.mjs scripts/lib/validate-edit-design.test.mjs
git commit -m "feat(commands): validateEditDesignCommand"
```

---

### Task 2 : Le runbook `/edit-design`

**Files:**
- Create: `templates/commands/edit-design.md`
- Test: `scripts/lib/edit-design-runbook.test.mjs`

**Interfaces:**
- Consumes: `validateEditDesignCommand` (Task 1).
- Produces: le runbook. Test d'intégration = `validateEditDesignCommand(REPO_ROOT)` renvoie `[]`.

- [ ] **Step 1 : Écrire le test d'intégration (échoue tant que le runbook n'existe pas)**

```js
// scripts/lib/edit-design-runbook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEditDesignCommand } from './validate-commands.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le runbook /edit-design est cohérent (5 skills + design.md)', () => {
  assert.deepEqual(validateEditDesignCommand(ROOT), []);
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `node --test scripts/lib/edit-design-runbook.test.mjs`
Expected: FAIL (runbook absent).

- [ ] **Step 3 : Créer `templates/commands/edit-design.md`**

```markdown
# /edit-design — Éditer l'UI avec tout le contexte design (runbook IA)

Argument : `$ARGUMENTS` = ce qu'il faut changer dans l'UI.

**AVANT de toucher au moindre fichier d'interface**, charge le contexte design (sinon tu codes hors-charte) :

1. Charge les **5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`.
2. Lis **`docs/design.md`** (design system du projet : couleurs, typo, espacements, états, composants).
3. Prends un **screenshot** de l'état actuel de la page concernée (référence avant/après).

Puis seulement :

4. Édite l'UI demandée en **respectant le design system + la marque** (composants shadcn existants, tokens, espacements).
5. **Re-screenshot** et compare : le rendu respecte-t-il `docs/design.md` ? Sinon, corrige avant de conclure.

Rappel : la règle design permanente est déjà dans l'`AGENTS.md` du projet (issue de `templates/agents/design-rule.md`) — elle s'applique aussi hors de cette commande.
```

- [ ] **Step 4 : Lancer → succès**

Run: `node --test scripts/lib/edit-design-runbook.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Lancer toute la suite**

Run: `node --test`
Expected: PASS (suite + 2 nouveaux fichiers de test).

- [ ] **Step 6 : Commit**

```bash
git add templates/commands/edit-design.md scripts/lib/edit-design-runbook.test.mjs
git commit -m "feat(commands): runbook /edit-design (charge 5 skills + design.md)"
```

---

## Notes (hors périmètre SP-C)
- SP-F copiera `templates/commands/edit-design.md` vers `.claude/commands/` / `.cursor/commands/` et installera les 5 skills design.

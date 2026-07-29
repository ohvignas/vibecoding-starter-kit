// scripts/lib/run-doc.mjs — SOURCE UNIQUE de `docs/RUN.md` : le modèle de la stack, plus les
// deux notes que le scaffold y ajoutait à deux endroits différents (la note « backend en local »
// dans setup.mjs, la note « Codex n'a pas de hook d'édition » dans environment.mjs).
// Un seul rendu, sinon `--refresh` ne peut pas reproduire ce que le scaffold a écrit et
// re-signalerait le fichier comme modifié à chaque passage.
import { renderBackendNote } from './wizard.mjs';

export const NOTE_CODEX = "> Codex n'a pas de hook d'édition : lance `npm run typecheck` après tes modifications.";

export function renderRunDoc({ template, stack, assistant, backend }) {
  let out = template;
  const backendNote = renderBackendNote(stack, backend);
  if (backendNote) out = `${backendNote}\n${out}`;
  if (assistant === 'codex') out = `${NOTE_CODEX}\n\n${out}`;
  return out;
}

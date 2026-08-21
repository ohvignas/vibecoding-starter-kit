// scripts/lib/adoption.mjs — TOUT CE QUI EST PROPRE AU PARCOURS « PROJET EXISTANT ».
//
// Le kit crée des projets neufs sur 4 stacks connues. Sur un projet qui existe déjà, il ne peut
// prouver AUCUNE de ces 4 — et une règle Convex dans un projet Prisma est pire que pas de règle.
// `aucune` est donc la stack « je n'en revendique pas ».
//
// POURQUOI ELLE N'EST NI DANS `STACKS` NI DANS `AI_CONTEXT` : trois tests encodent l'invariant
// « toute clé de STACKS est une stack OFFERTE au débutant » (bannière README, guide 01, question
// de /init-vibecoding). `aucune` n'est pas une offre. L'y mettre rendait 5 tests rouges, dont 3
// pour la mauvaise raison — mesuré. Elle est donc un cas explicite, jamais une entrée de table.
export const STACK_AUCUNE = 'aucune';

export const estAdopte = (stack) => stack === STACK_AUCUNE;

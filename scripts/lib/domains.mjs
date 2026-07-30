// Catalogue de capacités métier partagées entre stacks + déclencheurs PRD.
// Valeurs vérifiées (juillet 2026). Les paquets d'implémentation par stack sont dans matrix.mjs (STACKS[stack].domains).
import { selectDomains } from './select-domains.mjs';

export const SHARED_DOMAINS = {
  payment:          { label: 'Paiement', mcp: { name: 'stripe', install: 'claude mcp add --transport http stripe https://mcp.stripe.com' }, note: 'Stripe (OAuth). Compte requis.' },
  email:            { label: 'Email transactionnel', mcp: { name: 'resend', install: 'claude mcp add --transport http resend https://mcp.resend.com' }, note: 'Resend. Tier gratuit.' },
  analytics:        { label: 'Analytics produit', mcp: { name: 'posthog', install: 'claude mcp add --transport http posthog https://mcp.posthog.com/mcp' }, note: 'PostHog.' },
  'error-tracking': { label: 'Suivi d\'erreurs', mcp: { name: 'sentry', install: 'claude mcp add --transport http sentry https://mcp.sentry.dev/mcp' }, note: 'Sentry (OAuth).' },
  docs:             { label: 'Docs à jour', mcp: { name: 'context7', install: 'claude mcp add context7 -- npx -y @upstash/context7-mcp' }, note: 'Context7.' },
  repo:             { label: 'Repo / PR', mcp: { name: 'github', install: 'voir github/github-mcp-server (PAT) ou endpoint Copilot' }, note: 'GitHub.' },
  e2e:              { label: 'Tests E2E', mcp: { name: 'playwright', install: 'npx @playwright/mcp@latest' }, note: 'Playwright (web). Electron : chrome-devtools-mcp.' },
};

export const DOMAIN_TRIGGERS = {
  payment:          /abonnement|premium|forfait|paywall|payer|paiement|checkout|réservation payante|acheter|panier d[\u0027\u2019]achat|ajouter au panier|passer (une |la )?commande|bon de commande/i,
  email:            /e-?mail\b|\bmail\b|magic link|newsletter|mot de passe oublié|réinitialis/i,
  storage:          /upload|télévers|fichier|image|avatar|photo de profil|pièce jointe|pdf|document/i,
  analytics:        /statistiques|analytics|suivi d[\u0027\u2019]usage|funnel|entonnoir|feature flag|a\/b/i,
  'error-tracking': /erreur|crash|monitoring|ça plante|exception|bug en prod/i,
  jobs:             /cron|tous les (jours|soirs)|chaque (jour|soir|nuit)|rappel automatique|relance|arrière-plan|planifi|file d[\u0027\u2019]attente/i,
  search:           /recherche|rechercher|filtrer|autocompl|catalogue/i,
  push:             /notification|push|alerte/i,
  camera:           /photo|caméra|appareil photo|scanner/i,
  maps:             /carte|\bmap\b|localisation|gps|à proximité|adresse/i,
  'auto-update':    /mise à jour|auto-?update|nouvelle version/i,
  licensing:        /licence|clé d[\u0027\u2019]activation|activation de licence|débloquer l[\u0027\u2019]app|essai gratuit|période d[\u0027\u2019]essai|trial/i,
  persistence:      /base (de données )?locale|offline|hors-?ligne|persistance|réglages|sauvegarde locale/i,
  forms:            /formulaire|nous contacter|formulaire de contact|demande de devis|devis en ligne/i,
  i18n:             /multilingue|plusieurs langues|traduction|version (anglaise|espagnole|allemande)|bilingue/i,
};

// Les secrets que les domaines de la stack DÉCLARENT (matrix.mjs). Ils étaient déclarés et
// n'atterrissaient nulle part : l'utilisateur découvrait la variable manquante au runtime.
// `deja` = le contenu actuel du .env.example → on ne redonne jamais ce qu'il contient déjà,
// et deux passages ne dupliquent pas le bloc.
export const MARQUE_SECRETS = '# --- Secrets des capacités métier (voir docs/DOMAINS.md) ---';
export function secretsBlock(domains, deja = '') {
  const lignes = [];
  for (const d of Object.values(domains)) {
    const aAjouter = (d.secrets ?? []).filter((s) => !deja.includes(`${s}=`) && !lignes.includes(`${s}=`));
    if (!aAjouter.length) continue;
    lignes.push(`# ${d.label}`, ...aAjouter.map((s) => `${s}=`));
  }
  if (!lignes.length) return '';
  return [MARQUE_SECRETS, '# Décommente ceux dont ton PRD a besoin. Rien ici n\'est obligatoire.', ...lignes, ''].join('\n');
}

// Les mots du PRD qui allument un domaine, tirés du regex lui-même : la table DOMAIN_TRIGGERS
// est ainsi LISIBLE dans docs/DOMAINS.md, au lieu de rester du code que personne n'exécute.
// C'est une liste d'INDICES pour un lecteur humain, pas une réécriture fidèle du regex : les
// alternatives internes (`version (anglaise|espagnole)`) se coupent en morceaux, et les classes
// d'apostrophes sont ramenées à une seule. Dernier filtre, le seul qui compte : on ne garde
// qu'un mot qui allume VRAIMENT le domaine (`re.test`). Afficher « soirs » comme déclencheur de
// `jobs` alors que le regex exige « tous les soirs » serait un mensonge de plus.
export function triggerWords(re, max = 8) {
  return String(re.source)
    .replace(/\[\\u0027\\u2019\]/g, "'")
    .replace(/\\b/g, '')   // AVANT de retirer les antislashs, sinon `\bmail\b` donne « bmailb »
    .split('|')
    .map((s) => s.replace(/[\\^$.*+?()[\]{}]/g, '').replace(/'{2,}/g, "'").replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 2 && re.test(s))
    .slice(0, max);
}

// Rend docs/DOMAINS.md : le catalogue de capacités de la stack que l'IA lit pour choisir selon le PRD.
// `triggers` + `prd` branchent `selectDomains` : les domaines allumés par le PRD sont marqués 🎯.
export function renderDomains({ stack, domains, shared, triggers = {}, prd = '' }) {
  const L = [];
  L.push(`# Capacités métier — stack ${stack}`);
  L.push('');
  L.push("L'IA lit ce catalogue pour choisir les capacités **selon le PRD** (elle n'invente pas). Règle : préférer le **built-in / officiel** ; n'ajouter une option externe que si le PRD le justifie. Les secrets vont dans `.env.example` (ou l'env Convex pour cette stack), jamais dans le code client.");
  L.push('');
  const allumes = selectDomains(prd, triggers);
  L.push(`**Comment se fait la sélection.** Chaque capacité liste ses **déclencheurs** : les mots qui, présents dans le PRD, l'allument. ${allumes.length
    ? `Appliqués au PRD de ce projet, ils allument : **${allumes.join(', ')}** (marqués 🎯 ci-dessous).`
    : `Aucun PRD n'a encore été écrit — rien n'est marqué. Applique-les toi-même au texte du PRD dès qu'il existe.`} Un déclencheur n'est pas un verdict : ajoute ce qu'il ne peut pas voir, retire ce que le PRD ne demande pas.`);
  L.push('');
  for (const [key, d] of Object.entries(domains)) {
    L.push(`## ${d.label}${allumes.includes(key) ? ' — 🎯 détecté dans ton PRD' : ''}`);
    for (const o of d.options) L.push(`- ${o}`);
    if (d.when) L.push(`- _Quand :_ ${d.when}`);
    const mots = triggers[key] ? triggerWords(triggers[key]) : [];
    if (mots.length) L.push(`- _Déclencheurs :_ ${mots.join(' · ')}`);
    if (d.secrets && d.secrets.length) L.push(`- _Secrets :_ ${d.secrets.join(', ')}`);
    if (d.mcp && shared[d.mcp]) L.push(`- _MCP :_ \`${shared[d.mcp].mcp.install}\``);
    L.push('');
  }
  return L.join('\n');
}

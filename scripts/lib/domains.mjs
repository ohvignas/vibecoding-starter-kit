// Catalogue de capacités métier partagées entre stacks + déclencheurs PRD.
// Valeurs vérifiées (juillet 2026). Les paquets d'implémentation par stack sont dans matrix.mjs (STACKS[stack].domains).

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
};

// Rend docs/DOMAINS.md : le catalogue de capacités de la stack que l'IA lit pour choisir selon le PRD.
export function renderDomains({ stack, domains, shared }) {
  const L = [];
  L.push(`# Capacités métier — stack ${stack}`);
  L.push('');
  L.push("L'IA lit ce catalogue pour choisir les capacités **selon le PRD** (elle n'invente pas). Règle : préférer le **built-in / officiel** ; n'ajouter une option externe que si le PRD le justifie. Les secrets vont dans `.env.example` (ou l'env Convex pour cette stack), jamais dans le code client.");
  L.push('');
  for (const [key, d] of Object.entries(domains)) {
    L.push(`## ${d.label}`);
    for (const o of d.options) L.push(`- ${o}`);
    if (d.when) L.push(`- _Quand :_ ${d.when}`);
    if (d.secrets && d.secrets.length) L.push(`- _Secrets :_ ${d.secrets.join(', ')}`);
    if (d.mcp && shared[d.mcp]) L.push(`- _MCP :_ \`${shared[d.mcp].mcp.install}\``);
    L.push('');
  }
  return L.join('\n');
}

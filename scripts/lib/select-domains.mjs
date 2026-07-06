// Sélectionne les domaines métier dont un déclencheur matche le texte du PRD.
// Retourne les clés triées et uniques. Utilisé par /new-project pour piocher dans le catalogue.
export function selectDomains(prd, triggers) {
  const text = String(prd || '');
  const hits = [];
  for (const [domain, re] of Object.entries(triggers)) {
    if (re.test(text)) hits.push(domain);
  }
  return [...new Set(hits)].sort();
}

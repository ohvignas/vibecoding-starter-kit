// Deeplink d'installation MCP Cursor (cursor.com/docs/context/mcp/install-links).
// N'inclut PAS les métas internes ni les serveurs à secret (clé jamais dans une URL).
export function cursorDeeplink(name, cfg) {
  const { needsAuth, apiKey, ...clean } = cfg;
  const b64 = Buffer.from(JSON.stringify(clean), 'utf8').toString('base64');
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${name}&config=${b64}`;
}

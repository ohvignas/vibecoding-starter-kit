#!/usr/bin/env bash
#
# download-ai-context.sh
# Télécharge tous les fichiers de contexte IA officiels (llms.txt + règles)
# de chaque techno, dans le dossier ai-context/.
# À relancer quand tu veux mettre à jour (les outils évoluent vite).
#
# Usage : bash scripts/download-ai-context.sh
#
set -uo pipefail

# Se placer à la racine du dépôt (dossier parent de scripts/)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/ai-context"

ok=0 ; fail=0

# fetch <url> <chemin-de-sortie>
fetch() {
  local url="$1" out="$2"
  mkdir -p "$(dirname "$out")"
  if curl -fsSL --retry 2 --max-time 60 "$url" -o "$out"; then
    printf '  ✅ %s\n' "${out#$ROOT/}"
    ok=$((ok+1))
  else
    printf '  ❌ ÉCHEC : %s\n' "$url"
    fail=$((fail+1))
  fi
}

echo "📥 Téléchargement du contexte IA officiel vers ai-context/ ..."
echo ""

echo "▸ Convex"
fetch "https://www.convex.dev/llms.txt"          "$DEST/convex/llms.txt"
fetch "https://docs.convex.dev/llms-full.txt"    "$DEST/convex/llms-full.txt"
fetch "https://convex.link/convex_rules.txt"     "$DEST/convex/convex_rules.txt"
fetch "https://convex.link/convex_rules.mdc"     "$DEST/convex/convex_rules.mdc"

echo "▸ TanStack Start"
fetch "https://tanstack.com/start/latest/llms.txt" "$DEST/tanstack-start/llms.txt"
fetch "https://tanstack.com/llms.txt"              "$DEST/tanstack-start/llms-tanstack-global.txt"

echo "▸ Better Auth"
fetch "https://better-auth.com/llms.txt"         "$DEST/better-auth/llms.txt"

echo "▸ React Native / Expo"
fetch "https://docs.expo.dev/llms.txt"           "$DEST/react-native-expo/expo-llms.txt"
fetch "https://docs.expo.dev/llms-full.txt"      "$DEST/react-native-expo/expo-llms-full.txt"
fetch "https://reactnative.dev/llms.txt"         "$DEST/react-native-expo/react-native-llms.txt"

echo "▸ Electron"
echo "  ℹ️  Electron ne publie pas de llms.txt officiel."
echo "     → Utilise les skills locaux 'electron:*' dans Claude Code (voir stacks/desktop/README.md)."

echo ""
echo "──────────────────────────────────────────"
printf "Terminé : %s fichier(s) OK, %s échec(s).\n" "$ok" "$fail"
if [ "$fail" -gt 0 ]; then
  echo "Les échecs sont souvent temporaires (réseau) ou une URL qui a changé."
  echo "Relance le script, ou récupère le fichier à la main depuis la doc officielle."
fi
echo ""
echo "👉 Donne ces fichiers à ton IA (glisse-les dans le chat, ou garde-les"
echo "   dans le projet et dis : « réfère-toi aux fichiers de ai-context/ »)."

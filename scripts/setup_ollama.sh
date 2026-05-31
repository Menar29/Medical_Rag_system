#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# CerviScan AI — Script de vérification et setup Ollama + Gemma 4
# Usage : bash scripts/setup_ollama.sh
# ────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }

echo "═══════════════════════════════════════════"
echo "  CerviScan AI — Setup Ollama + Gemma 4"
echo "═══════════════════════════════════════════"
echo ""

# ── 1. Check Ollama installed ──────────────────────────────────
if ! command -v ollama &>/dev/null; then
    warn "Ollama n'est pas installé."
    echo ""
    echo "Installation :"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  brew install ollama"
        echo "  ou : https://ollama.com/download"
    else
        echo "  curl -fsSL https://ollama.com/install.sh | sh"
    fi
    echo ""
    read -p "Installer Ollama maintenant via Homebrew ? (o/N) " ans
    if [[ "$ans" =~ ^[oO]$ ]]; then
        brew install ollama
        ok "Ollama installé"
    else
        err "Installer Ollama manuellement puis relancer ce script."
        exit 1
    fi
else
    ok "Ollama installé : $(ollama --version 2>/dev/null || echo 'version inconnue')"
fi

# ── 2. Start Ollama server if not running ─────────────────────
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    warn "Serveur Ollama non démarré — lancement…"
    ollama serve &>/dev/null &
    sleep 3
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        ok "Serveur Ollama démarré"
    else
        err "Impossible de démarrer Ollama. Lancez 'ollama serve' manuellement."
        exit 1
    fi
else
    ok "Serveur Ollama actif sur http://localhost:11434"
fi

# ── 3. Check / pull Gemma 4 ───────────────────────────────────
echo ""
echo "Vérification du modèle gemma4…"
if ollama list 2>/dev/null | grep -q "gemma4"; then
    ok "Modèle gemma4 déjà présent"
else
    warn "Modèle gemma4 absent — téléchargement (~5 GB)…"
    read -p "Télécharger gemma4 maintenant ? (o/N) " ans
    if [[ "$ans" =~ ^[oO]$ ]]; then
        ollama pull gemma4
        ok "gemma4 téléchargé"
    else
        warn "Téléchargez-le manuellement : ollama pull gemma4"
    fi
fi

# ── 4. Quick inference test ───────────────────────────────────
echo ""
echo "Test d'inférence rapide…"
RESPONSE=$(curl -s http://localhost:11434/api/generate \
    -d '{"model":"gemma4","prompt":"Réponds en un mot : capitale du Niger ?","stream":false}' \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','').strip())" 2>/dev/null || echo "")

if [[ -n "$RESPONSE" ]]; then
    ok "Inférence OK — réponse : \"$RESPONSE\""
else
    warn "Test d'inférence échoué (normal si gemma4 n'est pas encore téléchargé)"
fi

# ── 5. Summary ────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Résumé"
echo "═══════════════════════════════════════════"
echo "  Démarrer Ollama   : ollama serve"
echo "  Télécharger modèle: ollama pull gemma4"
echo "  Démarrer backend  : source venv/bin/activate"
echo "                      python3 -m uvicorn app.main:app --reload --port 8001"
echo "═══════════════════════════════════════════"

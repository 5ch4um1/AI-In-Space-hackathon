#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "============================================"
echo "  NI-IDEA - Setup"
echo "============================================"
echo ""

MODEL_DIR="$REPO_DIR/models"
SCENARIOS_DIR="$REPO_DIR/scenarios"

# ── Download models ──────────────────────────────────
echo ">>> Downloading expert models from HuggingFace..."
echo "    (requires 'hf' CLI: pip install huggingface-hub)"
echo ""

if ! command -v hf &>/dev/null; then
    echo "ERROR: 'hf' CLI not found. Install it with:"
    echo "  pip install huggingface-hub"
    exit 1
fi

mkdir -p "$MODEL_DIR"

echo "[1/4] Terrain Expert (EUROSAT)..."
hf download 5ch4um1/lfm2.5-vrsbench-EUROSAT-terrain-lora-450m \
    lfm2.5-vrsbench-terrain-expert-450m-q4_k_m.gguf \
    --local-dir "$MODEL_DIR" --quiet
mv "$MODEL_DIR/lfm2.5-vrsbench-terrain-expert-450m-q4_k_m.gguf" \
   "$MODEL_DIR/terrain-expert-q4_k_m.gguf"

echo "[2/4] Methane Expert (MethaneS2CM)..."
hf download 5ch4um1/lfm2.5-vrsbench-MethaneS2CM-methane-lora-450m \
    lfm2.5-vrsbench-methane-450m-q4_k_m.gguf \
    --local-dir "$MODEL_DIR" --quiet
mv "$MODEL_DIR/lfm2.5-vrsbench-methane-450m-q4_k_m.gguf" \
   "$MODEL_DIR/methane-expert-q4_k_m.gguf"

echo "[3/4] Marine Expert (MADOS)..."
hf download 5ch4um1/lfm2.5-vrsbench-mados-maritime-lora-450m \
    lfm2.5-vrsbench-mados-maritime-lora-450m-q4_k_m.gguf \
    --local-dir "$MODEL_DIR" --quiet
mv "$MODEL_DIR/lfm2.5-vrsbench-mados-maritime-lora-450m-q4_k_m.gguf" \
   "$MODEL_DIR/marine-expert-q4_k_m.gguf"

echo "[4/4] Fire Expert (FireWatch)..."
hf download 5ch4um1/lfm2.5-vrsbench-firewatch-sft-lora-450m \
    fire-expert-q4_k_m.gguf \
    --local-dir "$MODEL_DIR" --quiet

echo ""
echo "All models downloaded to $MODEL_DIR"

# ── Download scenarios ──────────────────────────────
echo ""
echo ">>> Downloading scenarios from simsat.5ch4um1.es..."
echo ""

SCENARIOS_ZIP_URL="https://simsat.5ch4um1.es/scenarios.zip"
SCENARIOS_TMP="/tmp/scenarios.zip"

if [ -d "$SCENARIOS_DIR" ]; then
    echo "Scenarios directory already exists, skipping download."
    echo "  (delete $SCENARIOS_DIR to force re-download)"
else
    echo "Downloading scenarios.zip..."
    curl -fSLk "$SCENARIOS_ZIP_URL" -o "$SCENARIOS_TMP"
    echo "Extracting..."
    unzip -q "$SCENARIOS_TMP" -d "$REPO_DIR"
    rm -f "$SCENARIOS_TMP"
    echo "Scenarios extracted to $SCENARIOS_DIR"
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Start the 4 expert models:  ./start.sh"
echo "  2. Start the app:              node server.js"
echo "  3. Open http://localhost:3000"

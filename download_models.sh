#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
MODEL_DIR="$REPO_DIR/models"
mkdir -p "$MODEL_DIR"

echo "============================================"
echo "  NI-IDEA - Download Expert Models"
echo "============================================"
echo ""
echo "This script downloads the 4 expert GGUF models"
echo "from HuggingFace. You need to be authenticated"
echo "with 'hf auth login' first."
echo ""

if ! command -v hf &>/dev/null; then
    echo "ERROR: 'hf' CLI not found. Install it with:"
    echo "  pip install huggingface-hub"
    exit 1
fi

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
ls -lh "$MODEL_DIR"/*.gguf

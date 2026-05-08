#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "============================================"
echo "  NI-IDEA - LLM Inference Servers"
echo "============================================"
echo "  This script launches the 4 expert models."
echo "  Point your browser to the remote server"
echo "  URL and enter this machine's IP in the"
echo "  'LLM Host' field."
echo "============================================"

# --- TERMINAL ---
if [ -z "$TERMINAL" ]; then
  echo ""
  echo "TERMINAL environment variable is not set."
  echo "Enter the terminal command to use for launching"
  echo "llama-server windows. Common options:"
  echo "  gnome-terminal  xterm  qterminal"
  echo "  konsole  alacritty  foot  kgx"
  echo ""
  read -p "Terminal: " TERMINAL
  if [ -z "$TERMINAL" ]; then
    echo "No terminal specified. Defaulting to xterm."
    TERMINAL="xterm"
  fi
fi
echo "Using terminal: $TERMINAL"

# --- LLAMA.CPP PATHS ---
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-$HOME/llama.cpp}"
LLAMA_SERVER="${LLAMA_SERVER:-$LLAMA_CPP_DIR/build/bin/llama-server}"
LLAMA_MMPROJ="${LLAMA_MMPROJ:-$LLAMA_CPP_DIR/models/mmproj-LFM2.5-VL-450m-F16.gguf}"

if [ ! -f "$LLAMA_SERVER" ]; then
  echo "ERROR: llama-server not found at $LLAMA_SERVER"
  echo "Set LLAMA_SERVER or LLAMA_CPP_DIR env var, or install llama.cpp at $LLAMA_CPP_DIR"
  exit 1
fi
echo "llama-server: $LLAMA_SERVER"

if [ ! -f "$LLAMA_MMPROJ" ]; then
  echo "ERROR: mmproj not found at $LLAMA_MMPROJ"
  echo "Set LLAMA_MMPROJ env var to the correct path"
  exit 1
fi
echo "mmproj: $LLAMA_MMPROJ"

# --- VERIFY MODELS ---
for model in terrain-expert-q4_k_m.gguf methane-expert-q4_k_m.gguf marine-expert-q4_k_m.gguf fire-expert-q4_k_m.gguf; do
  if [ ! -f "models/$model" ]; then
    echo "ERROR: models/$model not found"
    exit 1
  fi
done
echo "All model files present."

# --- LAUNCH LLAMA SERVERS ---
SERVER="$LLAMA_SERVER"
MODEL_DIR="$REPO_DIR/models"
MMPROJ_ARG="--mmproj $LLAMA_MMPROJ"
COMMON="-c 16384 --temp 0.1"

launch() {
  local title="$1"
  local cmd="$2"
  case "$TERMINAL" in
    gnome-terminal)
      "$TERMINAL" -- bash -c "$cmd" &
      ;;
    qterminal)
      "$TERMINAL" -e "bash -c '$cmd'" &
      ;;
    xterm)
      "$TERMINAL" -T "$title" -e bash -c "$cmd" &
      ;;
    konsole)
      "$TERMINAL" --new-tab -p tabtitle="$title" -e bash -c "$cmd" &
      ;;
    alacritty|foot|st|kgx)
      "$TERMINAL" -e bash -c "$cmd" &
      ;;
    *)
      "$TERMINAL" -e bash -c "$cmd" &
      ;;
  esac
}

echo ""
echo "Launching Terrain Expert on port 8001..."
launch "Terrain Expert" "$SERVER -m $MODEL_DIR/terrain-expert-q4_k_m.gguf $MMPROJ_ARG $COMMON --port 8001; echo; read -p 'Press Enter to close...'"
sleep 1

echo "Launching Methane Expert on port 8002..."
launch "Methane Expert" "$SERVER -m $MODEL_DIR/methane-expert-q4_k_m.gguf $MMPROJ_ARG $COMMON --port 8002; echo; read -p 'Press Enter to close...'"
sleep 1

echo "Launching Marine Expert on port 8003..."
launch "Marine Expert" "$SERVER -m $MODEL_DIR/marine-expert-q4_k_m.gguf $MMPROJ_ARG $COMMON --port 8003; echo; read -p 'Press Enter to close...'"
sleep 1

echo "Launching Fire Expert on port 8004..."
launch "Fire Expert" "$SERVER -m $MODEL_DIR/fire-expert-q4_k_m.gguf $MMPROJ_ARG $COMMON --port 8004; echo; read -p 'Press Enter to close...'"

echo ""
echo "All 4 llama-server instances launched."
echo "Open the remote NI-IDEA web app in your browser"
echo "and enter this machine's IP as the LLM Host."
echo ""
echo "Your IP: $(hostname -I 2>/dev/null | awk '{print $1}')"

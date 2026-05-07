# NI-IDEA - AI In Space Hackathon

Satellite Simulation & Image Analysis Platform with 4 fine-tuned LFM 2.5 VL expert models.

## Prerequisites

- **Node.js** (v18+) and **npm**
- **llama.cpp** built with `llama-server` binary (expected at `~/llama.cpp/build/bin/llama-server`)
- **mmproj** file at `~/llama.cpp/models/mmproj-LFM2.5-VL-450m-F16.gguf` (included with LFM 2.5 VL)

## Setup

```bash
git clone <repo-url>
cd AI-In-Space-hackathon
chmod +x start.sh
```

## Usage

```bash
export TERMINAL=qterminal   # or gnome-terminal, xterm, konsole, etc.
./start.sh
```

If `TERMINAL` is not set, the script will prompt you to enter one.

### Environment Variables

| Variable         | Default                                  | Description                    |
|------------------|------------------------------------------|--------------------------------|
| `TERMINAL`       | (required, prompted if not set)          | Terminal for server windows    |
| `LLAMA_SERVER`   | `$LLAMA_CPP_DIR/build/bin/llama-server`  | Path to llama-server binary    |
| `LLAMA_CPP_DIR`  | `$HOME/llama.cpp`                        | llama.cpp installation root    |
| `LLAMA_MMPROJ`   | `$LLAMA_CPP_DIR/models/mmproj-...`       | Path to mmproj file            |

The script will:
1. Launch 4 llama-server instances (ports 8001-8004) in terminal windows
2. Start the Node.js web server on port 3000
3. Open http://localhost:3000 in your browser

## Architecture

| Port | Expert            | Model File                               |
|------|-------------------|------------------------------------------|
| 8001 | Terrain           | `models/terrain-expert-q4_k_m.gguf`      |
| 8002 | Methane (Land)    | `models/methane-expert-q4_k_m.gguf`      |
| 8003 | Marine            | `models/marine-expert-q4_k_m.gguf`       |
| 8004 | Fire Risk         | `models/fire-expert-q4_k_m.gguf`         |

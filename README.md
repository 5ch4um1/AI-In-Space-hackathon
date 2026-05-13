# 🛰️ NI-IDEA

**Near Infrared Identification, Detection, Extraction & Analysis**

[![Hackathon](https://img.shields.io/badge/AI_In_Space-Hackathon-8B5CF6?style=for-the-badge)]()
[![LFM 2.5 VL](https://img.shields.io/badge/Base-LFM_2.5_VL-38bdf8?style=for-the-badge)](https://huggingface.co/liquidai)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github)](https://github.com/5ch4um1/AI-In-Space-hackathon)

> Satellite Simulation & Image Analysis Platform with 4 fine-tuned LFM 2.5 VL expert models for real-time multispectral satellite image analysis.

> **💡 Partially hosted version available:** See the [`split-architecture`](https://github.com/5ch4um1/AI-In-Space-hackathon/tree/split-architecture) branch — the frontend is hosted at [simsat.5ch4um1.es](https://simsat.5ch4um1.es/), you only run the 4 LLM servers locally.

---

## 🎥 Demo

[![Thumbnail of a youtube video, a 2 screen capture with a web app in the upper half and 4 terminal windows in the bottom half](https://img.youtube.com/vi/ftkAgWICKLY/0.jpg)](https://www.youtube.com/watch?v=ftkAgWICKLY)


---

## 🧠 Architecture

The system runs **4 fine-tuned LFM 2.5 VL expert models**, each a LoRA adapter applied to the [Liquid AI LFM 2.5 VL](https://huggingface.co/liquidai) base vision-language model that was itself trained with 2 epochs of LoRa fine-tuning on the [VRSBench](https://huggingface.co/datasets/xiang709/VRSBench) dataset, quantised to **Q4_K_M** and exported to GGUF format via `llama.cpp`.

| Port | Expert         | Task                              | Fine-Tuning Dataset                                                                 |
|------|----------------|------------------------------------|-------------------------------------------------------------------------------------|
| 8001 | **Terrain**    | Land cover classification          | [EUROSAT](https://huggingface.co/datasets/torchgeo/eurosat) — Sentinel-2 RGB + multi-spectral |
| 8002 | **Methane**    | Methane plume detection (land)     | [MethaneS2CM](https://huggingface.co/datasets/H1deaki/MethaneS2CM) — Sentinel-2 CH4 plumes |
| 8003 | **Marine**     | Maritime / algae / oil detection   | [MADOS](https://marine-pollution.github.io/) — maritime observation dataset |
| 8004 | **Fire Risk**  | Fire hotspot & volcanic detection  | [FireWatch SFT](https://huggingface.co/datasets/NuTonic/firewatch-sft-v1) — wildfire + volcanic thermal |

Each model was fine-tuned using **LoRA** on the LFM 2.5 VL 450M base, then merged and quantised. The GGUF files ship with corrected `feed_forward_length = 4608` metadata matching the base model tensor shapes.

**Routing logic** (`server.js`):

- Step 1 (terrain classification) → **port 8001**
- Step 2 secondary modes:
  - `fire_risk`, `volcanic` → **port 8004** (Fire Expert)
  - `oil_spill`, `algae`, `water` → **port 8003** (Marine Expert)
  - `methane`, `drought`, everything else → **port 8002** (Land Expert)

Two secondary processing steps run per primary classification cycle.

---

## 📋 Prerequisites

- **Node.js** v18+ and **npm**
- **llama.cpp** — must be built with the `llama-server` binary
- **mmproj** — the LFM 2.5 VL multimodal projector file (`mmproj-LFM2.5-VL-450m-F16.gguf`)

### Getting the mmproj

The mmproj file is **not** included in this repo. Get it from **Liquid AI's HuggingFace page** → [huggingface.co/liquidai](https://huggingface.co/liquidai)


Place it at `~/llama.cpp/models/mmproj-LFM2.5-VL-450m-F16.gguf` (or set `LLAMA_MMPROJ` to the correct path).

---

## 🚀 Quick Start

```bash
git clone https://github.com/5ch4um1/AI-In-Space-hackathon.git
cd AI-In-Space-hackathon
chmod +x start.sh

# Set your terminal emulator, then run:
export TERMINAL=qterminal    # or gnome-terminal, xterm, konsole, etc.
./start.sh
```

If `TERMINAL` is not set, the script will prompt you to enter one.

### Environment Variables

| Variable         | Default                                  | Description                    |
|------------------|------------------------------------------|--------------------------------|
| `TERMINAL`       | *(prompted if not set)*                  | Terminal for server windows    |
| `LLAMA_SERVER`   | `$LLAMA_CPP_DIR/build/bin/llama-server`  | Path to llama-server binary    |
| `LLAMA_CPP_DIR`  | `$HOME/llama.cpp`                        | llama.cpp installation root    |
| `LLAMA_MMPROJ`   | `$LLAMA_CPP_DIR/models/mmproj-...`       | Path to mmproj file            |

The script will:

1. Launch 4 `llama-server` instances (ports 8001–8004) in separate terminal windows
2. Install Node.js dependencies (`npm install`)
3. Start the web server on **http://localhost:3000**

---

## 📁 Repository Structure

```
AI-In-Space-hackathon/
├── setup.sh              ← Downloads models + scenarios (run first!)
├── start.sh              ← One-command launcher
├── server.js             ← Express backend / routing
├── package.json          ← Node.js dependencies
├── README.md             ← You are here
├── .gitignore
├── public/               ← Frontend (HTML, JS, CSS)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── models/               ← Expert model GGUFs (via setup.sh)
│   ├── terrain-expert-q4_k_m.gguf
│   ├── methane-expert-q4_k_m.gguf
│   ├── marine-expert-q4_k_m.gguf
│   └── fire-expert-q4_k_m.gguf
└── scenarios/            ← Mission data (videos + snapshots, via setup.sh)
    ├── Bilbao/
    ├── Canarias/
    ├── IndustrialEurope/
    ├── Norilsk/
    └── test_mission/
```

---

## 📜 License

This project was created for the **AI In Space Hackathon**. Models and datasets are used under their respective licenses.

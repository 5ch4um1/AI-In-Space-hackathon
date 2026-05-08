# 🛰️ NI-IDEA

**Near Infrared Identification, Detection, Extraction & Analysis**

[![Hackathon](https://img.shields.io/badge/AI_In_Space-Hackathon-8B5CF6?style=for-the-badge)]()
[![LFM 2.5 VL](https://img.shields.io/badge/Base-LFM_2.5_VL-38bdf8?style=for-the-badge)](https://huggingface.co/liquidai)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github)](https://github.com/5ch4um1/AI-In-Space-hackathon)

> Satellite Simulation & Image Analysis Platform with 4 fine-tuned LFM 2.5 VL expert models for real-time multispectral satellite image analysis.

---

## 🌐 Hosted App

**https://simsat.5ch4um1.es/**

The frontend, scenarios, and API are hosted on the remote server. You only need to run the 4 LLM inference servers locally.

---

## 🚀 Quick Start (for end users)

**Requirements:** llama.cpp built with `llama-server`, mmproj from [Liquid AI](https://huggingface.co/liquidai), HuggingFace auth.

```bash
git clone --branch split-architecture https://github.com/5ch4um1/AI-In-Space-hackathon.git
cd AI-In-Space-hackathon
chmod +x download_models.sh start.sh

# Authenticate with HuggingFace
hf auth login

# Download the 4 expert GGUF models (~920 MB total)
./download_models.sh

# Start the 4 llama-server instances (ports 8001-8004)
export TERMINAL=qterminal
./start.sh
```

Then open **https://simsat.5ch4um1.es/** in your browser, enter your machine's IP in the **LLM Host** field, select a mission, and click play.

---

## 🚀 Self-Hosted Setup (for running everything yourself)

```bash
git clone --branch split-architecture https://github.com/5ch4um1/AI-In-Space-hackathon.git
cd AI-In-Space-hackathon
chmod +x download_models.sh start.sh

# Install Node.js dependencies
npm install

# Download full mission data (videos, snapshots via Git LFS)
git lfs pull

# Download expert models from HuggingFace
hf auth login
./download_models.sh

# Start everything
export TERMINAL=qterminal
node server.js &
./start.sh
```

---

## 🏗️ Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  Remote Server              │     │  Your Machine                │
│  (simsat.5ch4um1.es)        │     │  (user provides compute)     │
│                             │     │                              │
│  ┌───────────────────────┐  │     │  ┌────────────────────────┐  │
│  │  Node.js Express      │  │     │  │  llama-server (8001)   │  │
│  │  · serves frontend    │  │     │  │  Terrain Expert        │  │
│  │  · serves scenarios   │  │     │  └────────────────────────┘  │
│  │  · scenario APIs      │  │     │  ┌────────────────────────┐  │
│  └──────────┬────────────┘  │     │  │  llama-server (8002)   │  │
│             │               │     │  │  Methane Expert        │  │
│             │ HTTP          │     │  └────────────────────────┘  │
│             ▼               │     │  ┌────────────────────────┐  │
│  ┌───────────────────────┐  │     │  │  llama-server (8003)   │  │
│  │  Browser (frontend)   │  │     │  │  Marine Expert         │  │
│  │  fetches scenarios    │──┼─────┼──┤                        │  │
│  │  from remote server   │  │     │  └────────────────────────┘  │
│  │  sends LLM requests   │──┼─────┼──► llama-server (8004)   │  │
│  │  to local llama-servers│  │     │  │  Fire Expert            │  │
│  └───────────────────────┘  │     │  └────────────────────────┘  │
└─────────────────────────────┘     └──────────────────────────────┘
```

## 🧠 Expert Models

| Port | Expert         | Task                              | Fine-Tuning Dataset                                                                 |
|------|----------------|------------------------------------|-------------------------------------------------------------------------------------|
| 8001 | **Terrain**    | Land cover classification          | [EUROSAT](https://huggingface.co/datasets/torchgeo/eurosat) |
| 8002 | **Methane**    | Methane plume detection (land)     | [MethaneS2CM](https://huggingface.co/datasets/H1deaki/MethaneS2CM) |
| 8003 | **Marine**     | Maritime / algae / oil detection   | [MADOS](https://marine-pollution.github.io/) |
| 8004 | **Fire Risk**  | Fire hotspot & volcanic detection  | [FireWatch SFT](https://huggingface.co/datasets/NuTonic/firewatch-sft-v1) |

## 📁 Repository Structure

```
AI-In-Space-hackathon/
├── start.sh              ← Launches 4 llama-server instances
├── download_models.sh    ← Downloads GGUFs from HuggingFace
├── server.js             ← Express backend (scenario serving only)
├── package.json
├── README.md
├── .gitattributes
├── .gitignore
├── public/               ← Frontend (HTML, JS, CSS)
├── models/               ← Downloaded GGUF files (gitignored)
└── scenarios/            ← Mission data (videos + snapshots)
```

## 📜 License

This project was created for the **AI In Space Hackathon**. Models and datasets are used under their respective licenses.

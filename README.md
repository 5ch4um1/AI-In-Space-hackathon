# 🛰️ NI-IDEA

**Near Infrared Identification, Detection, Extraction & Analysis**

[![Hackathon](https://img.shields.io/badge/AI_In_Space-Hackathon-8B5CF6?style=for-the-badge)]()
[![LFM 2.5 VL](https://img.shields.io/badge/Base-LFM_2.5_VL-38bdf8?style=for-the-badge)](https://huggingface.co/liquidai)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github)](https://github.com/5ch4um1/AI-In-Space-hackathon)

> Satellite Simulation & Image Analysis Platform with 4 fine-tuned LFM 2.5 VL expert models for real-time multispectral satellite image analysis. Frontend and scenarios are hosted at [simsat.5ch4um1.es](https://simsat.5ch4um1.es/) — you only run the 4 LLM inference servers locally.

---

## 🎥 Demo

[![Thumbnail of a youtube video, a 2 screen capture with a web app in the upper half and 4 terminal windows in the bottom half](https://img.youtube.com/vi/ih5mEV6bB0E/0.jpg)](https://www.youtube.com/watch?v=ih5mEV6bB0E)

---

## 🚀 Quick Start

**Requirements:** llama.cpp built with `llama-server`, mmproj from [Liquid AI](https://huggingface.co/liquidai), HuggingFace auth.

```bash
git clone --branch split-architecture https://github.com/5ch4um1/AI-In-Space-hackathon.git
cd AI-In-Space-hackathon
chmod +x download_models.sh start.sh

# Authenticate with HuggingFace and download models
hf auth login
./download_models.sh

# Start the 4 llama-server instances (ports 8001-8004)
export TERMINAL=qterminal    # or gnome-terminal, xterm, konsole, etc.
./start.sh
```

Then open **https://simsat.5ch4um1.es/** in your browser, select a mission, and click play. Use the **LLM Host** field to point to your machine (defaults to `localhost`).

---

## 🧠 Expert Models

| Port | Expert         | Task                              | Fine-Tuning Dataset                                                                 |
|------|----------------|------------------------------------|-------------------------------------------------------------------------------------|
| 8001 | **Terrain**    | Land cover classification          | [EUROSAT](https://huggingface.co/datasets/torchgeo/eurosat) |
| 8002 | **Methane**    | Methane plume detection (land)     | [MethaneS2CM](https://huggingface.co/datasets/H1deaki/MethaneS2CM) |
| 8003 | **Marine**     | Maritime / algae / oil detection   | [MADOS](https://marine-pollution.github.io/) |
| 8004 | **Fire Risk**  | Fire hotspot & volcanic detection  | [FireWatch SFT](https://huggingface.co/datasets/NuTonic/firewatch-sft-v1) |

---

## 📜 License

This project was created for the **AI In Space Hackathon**. Models and datasets are used under their respective licenses.

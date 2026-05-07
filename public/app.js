document.addEventListener('DOMContentLoaded', () => {
    const missionSelect = document.getElementById('mission-select');
    const flashOverlay = document.getElementById('flash-overlay');
    const processedImage = document.getElementById('processed-image');
    const boundingBoxesContainer = document.getElementById('bounding-boxes');
    const systemLog = document.getElementById('system-log');
    const popoutLogBtn = document.getElementById('popout-log-btn');
    let logWindow = null;
    const classificationBars = document.getElementById('classification-bars');

    const mainVideo = document.getElementById('main-video');
    const bandVideosContainer = document.getElementById('band-videos-container');
    
    let currentScenario = null;
    let scenarioConfig = null;
    let lastSecondaryMode = null;
    let baseLon = 0, baseLat = 0;
    let availableSnapshots = [];
    let processingCycleActive = false;
    let lastProcessedSecond = -1;
    let bandVideos = [];
    
    let landClasses = [
        {name: 'rural', secondary_mode: 'fire_risk'},
        {name: 'coastal', secondary_mode: 'algae'},
        {name: 'urban', secondary_mode: 'methane'}
    ];

    let allSecondaryModes = ['volcanic', 'fire_risk', 'methane', 'algae', 'oil_spill', 'drought'];

    const composites = {
        volcanic: { name: "Volcano Check", bands: ['swir22', 'swir16', 'blue'], maskMode: 'default', prompt: "Locate the single point of highest volcanic ash or thermal hotspot. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the point.", analysis_type: "Volcano Check" },
        fire_risk: { name: "Fire Risk", bands: ['nir08', 'swir16', 'red'], maskMode: 'default', prompt: "Locate the single point of highest fire risk or active heat. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the highest risk point.", analysis_type: "Fire Risk" },
        methane: { name: "Methane Leak", bands: ['swir22', 'nir08', 'red'], maskMode: 'default', prompt: "Locate the single point of highest methane (CH4) concentration plume source. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the plume source point.", analysis_type: "Methane Detection" },
        algae: { name: "Algae Bloom", bands: ['red', 'green', 'blue'], maskMode: 'water_only', prompt: "Locate the single point of highest algae or phytoplankton concentration in the water. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the bloom point.", analysis_type: "Algae Bloom Detection" },
        oil_spill: { name: "Oil Spill", bands: ['swir16', 'nir08', 'blue'], maskMode: 'oil_spill', prompt: "Locate the single point of highest oil spill or hydrocarbon contamination on water surface. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the spill point.", analysis_type: "Oil Spill Detection" },
        drought: { name: "Drought Index", bands: ['swir16', 'swir22', 'nir08'], maskMode: 'default', prompt: "Locate the single point of highest drought stress or moisture deficit in vegetation. Respond ONLY JSON: {\"detected\": boolean, \"bbox\": [x1,y1,x2,y2]}. The bbox must be a very small (0.05x0.05) square centered on the stress point.", analysis_type: "Drought Analysis" }
    };

    function initClassificationBars(classes) {
        classificationBars.innerHTML = '';
        classes.forEach(clsObj => {
            const cls = typeof clsObj === 'string' ? clsObj : clsObj.name;
            const container = document.createElement('div');
            container.className = 'class-bar-container';
            container.innerHTML = `
                <div class="class-bar-label">
                    <span style="text-transform: capitalize;">${cls}</span>
                    <span id="label-${cls}">0%</span>
                </div>
                <div class="class-bar-track">
                    <div class="class-bar-fill" id="bar-${cls}"></div>
                </div>
            `;
            classificationBars.appendChild(container);
        });
    }

    // Initialize with defaults
    initClassificationBars(landClasses);

    function logSystem(message) {
        const time = new Date().toISOString().split('T')[1].slice(0, -1);
        const html = `<div class="log-entry">[${time}] ${message}</div>`;
        systemLog.insertAdjacentHTML('beforeend', html);
        if (logWindow && !logWindow.closed) {
            logWindow.document.body.insertAdjacentHTML('beforeend', html);
            logWindow.scrollTo(0, logWindow.document.body.scrollHeight);
        }
        requestAnimationFrame(() => {
            systemLog.scrollTop = systemLog.scrollHeight;
        });
    }

    function logLLM(prompt, response) {
        const time = new Date().toISOString().split('T')[1].slice(0, -1);
        const html = `
            <div class="log-entry prompt">[${time}] <b>PROMPT:</b> ${prompt}</div>
            <div class="log-entry response">[${time}] <b>LLM:</b> ${JSON.stringify(response)}</div>
        `;
        systemLog.insertAdjacentHTML('beforeend', html);
        if (logWindow && !logWindow.closed) {
            logWindow.document.body.insertAdjacentHTML('beforeend', html);
            logWindow.scrollTo(0, logWindow.document.body.scrollHeight);
        }
        requestAnimationFrame(() => {
            systemLog.scrollTop = systemLog.scrollHeight;
        });
    }

    popoutLogBtn.onclick = () => {
        logWindow = window.open('', 'NI-IDEA_Log', 'width=800,height=600');
        logWindow.document.head.innerHTML = `<title>NI-IDEA System Log</title><style>
            body { background: #0f172a; color: #10b981; font-family: monospace; padding: 1rem; overflow-y: auto; }
            .log-entry { margin-bottom: 0.5rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.2rem; }
            .log-entry.prompt { color: #38bdf8; }
            .log-entry.response { color: #fef08a; }
        </style>`;
        logWindow.document.body.innerHTML = systemLog.innerHTML;
        logWindow.scrollTo(0, logWindow.document.body.scrollHeight);
    };

    function updateDownlink(data) {
        logSystem(`DOWNLINK TELEMETRY: ${JSON.stringify(data, null, 2)}`);
    }

    async function fetchScenarios() {
        try {
            const res = await fetch('/api/scenarios');
            const data = await res.json();
            if (data.scenarios && data.scenarios.length > 0) {
                missionSelect.innerHTML = '<option value="">-- Select Mission --</option>';
                data.scenarios.forEach(sc => {
                    const opt = document.createElement('option');
                    opt.value = sc;
                    opt.textContent = sc.replace(/_/g, ' ').toUpperCase();
                    missionSelect.appendChild(opt);
                });
                missionSelect.onchange = () => {
                    if (missionSelect.value) loadScenario(missionSelect.value);
                };
            } else {
                missionSelect.innerHTML = '<option value="">No scenarios found</option>';
            }
        } catch (e) {
            console.error("Error fetching scenarios", e);
        }
    }

    async function loadScenario(name) {
        if (mainVideo) {
            mainVideo.pause();
            mainVideo.src = "";
            mainVideo.load();
        }
        bandVideos.forEach(v => {
            v.pause();
            v.src = "";
            v.load();
        });

        // Clear the system log for the new mission
        systemLog.innerHTML = '';
        
        processingCycleActive = false;
        lastProcessedSecond = -1;
        lastSecondaryMode = null;
        logSystem(`Loading scenario: ${name}`);
        currentScenario = name;

        try {
            const res = await fetch(`/api/scenarios/${name}/config`);
            if (res.ok) {
                scenarioConfig = await res.json();
                baseLon = scenarioConfig.lon || 0;
                baseLat = scenarioConfig.lat || 0;

                if (scenarioConfig.land_classes) {
                    landClasses = scenarioConfig.land_classes;
                    initClassificationBars(landClasses);
                } else {
                    landClasses = [
                        {name: 'rural', secondary_mode: 'fire_risk'},
                        {name: 'forest', secondary_mode: 'fire_risk'},
                        {name: 'coastal', secondary_mode: 'oil_spill'},
                        {name: 'industrial', secondary_mode: 'drought'},
                        {name: 'urban', secondary_mode: 'methane'}
                    ];
                    initClassificationBars(landClasses);
                }
            }
            
            const assetsRes = await fetch(`/api/scenarios/${name}/assets`);
            if (assetsRes.ok) {
                const assets = await assetsRes.json();
                availableSnapshots = assets.snapshots || [];
                setupVideos(name, assets.videos || []);
            }
        } catch(e) {
            logSystem(`Error loading scenario ${name}: ${e.message}`);
        }
    }

    function setupVideos(scenario, videos) {
        bandVideosContainer.innerHTML = '';
        bandVideos = [];
        let visualVideoSrc = null;

        videos.forEach(v => {
            if (v.startsWith('visual_')) {
                visualVideoSrc = v;
            } else {
                const bandName = v.split('_')[0];
                const wrapper = document.createElement('div');
                wrapper.className = 'band-video-wrapper';
                
                const vid = document.createElement('video');
                vid.src = `/scenarios/${scenario}/videos/${v}`;
                vid.muted = true;
                vid.playsInline = true;
                vid.loop = false; // Do not repeat
                
                const label = document.createElement('div');
                label.className = 'band-video-label';
                label.textContent = bandName;
                
                wrapper.appendChild(vid);
                wrapper.appendChild(label);
                bandVideosContainer.appendChild(wrapper);
                bandVideos.push(vid);
            }
        });

        if (visualVideoSrc) {
            mainVideo.src = `/scenarios/${scenario}/videos/${visualVideoSrc}`;
            mainVideo.loop = false; // Do not repeat
            mainVideo.onplay = () => {
                bandVideos.forEach(v => v.play());
                processingCycleActive = true;
            };
            mainVideo.onpause = () => {
                bandVideos.forEach(v => v.pause());
                processingCycleActive = false;
            };
            mainVideo.onended = () => {
                bandVideos.forEach(v => v.pause());
                processingCycleActive = false;
                logSystem(`Mission ${scenario} completed.`);
            };
            mainVideo.ontimeupdate = handleVideoTimeUpdate;
            mainVideo.play().catch(e => logSystem("Autoplay prevented. Click to play."));
        }
    }

    function handleVideoTimeUpdate() {
        if (!processingCycleActive) return;
        
        const currentTime = Math.floor(mainVideo.currentTime);
        if (currentTime % 3 === 1 && currentTime !== lastProcessedSecond) {
            lastProcessedSecond = currentTime;
            runCycle(currentTime);
        }
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async function generateCompositeBase64(scenario, videoSecond, bandR, bandG, bandB, maskMode = 'default') {
        const getSrc = (band) => {
            const file = availableSnapshots.find(s => s.startsWith(band + '_') && s.endsWith(`_${videoSecond}s.png`));
            return file ? `/scenarios/${scenario}/snapshots/${file}` : null;
        };
        const srcR = getSrc(bandR);
        const srcG = getSrc(bandG);
        const srcB = getSrc(bandB);
        const srcSCL = getSrc('scl');
        
        if(!srcR || !srcG || !srcB) return null;

        try {
            const loadList = [loadImage(srcR), loadImage(srcG), loadImage(srcB)];
            if (srcSCL) loadList.push(loadImage(srcSCL));
            
            const imgs = await Promise.all(loadList);
            const [imgR, imgG, imgB, imgSCL] = imgs;
            
            const canvas = document.createElement('canvas');
            canvas.width = imgR.width; canvas.height = imgR.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            ctx.drawImage(imgR, 0, 0);
            const dataR = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            ctx.drawImage(imgG, 0, 0);
            const dataG = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            ctx.drawImage(imgB, 0, 0);
            const dataB = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            
            let dataSCL = null;
            if (imgSCL) {
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.drawImage(imgSCL, 0, 0);
                dataSCL = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            }

            const comp = ctx.createImageData(canvas.width, canvas.height);
            for(let i=0; i<comp.data.length; i+=4) {
                let r = dataR[i], g = dataG[i], b = dataB[i];
                
                if (dataSCL) {
                    const sclVal = dataSCL[i]; 
                    const isWater = (sclVal >= 110 && sclVal <= 145);
                    const isSnowOrCloud = (sclVal >= 180);
                    
                    if (maskMode === 'water_only') {
                        if (!isWater) {
                            const gray = (r + g + b) / 3 * 0.15;
                            r = gray; g = gray; b = gray;
                        } else {
                            r = Math.min(255, Math.max(0, r - 5) * 3.0);
                            g = Math.min(255, Math.max(0, g - 5) * 3.0);
                            b = Math.min(255, Math.max(0, b - 5) * 3.0);
                        }
                    }
                    if (maskMode === 'oil_spill') {
                        if (!isWater) {
                            const gray = (r + g + b) / 3 * 0.2;
                            r = gray; g = gray; b = gray;
                        } else {
                            const swir = dataR[i];
                            const nir = dataG[i];
                            const vis = dataB[i];
                            const oilIndex = (swir - nir) / 255;
                            const spread = Math.pow(oilIndex, 0.7) * 4.0;
                            r = Math.min(255, Math.max(0, 50 + (1 - oilIndex) * 80 + nir * 1.5));
                            g = Math.min(255, Math.max(0, 120 + vis * 0.8));
                            b = Math.min(255, Math.max(0, 180 + nir * 0.5 + oilIndex * 75));
                            r = Math.min(255, r * spread);
                            g = Math.min(255, g * spread);
                            b = Math.min(255, b * spread);
                        }
                    }
                    if (isSnowOrCloud) {
                        r = 0; g = 0; b = 0;
                    }
                }

                comp.data[i] = r;
                comp.data[i+1] = g;
                comp.data[i+2] = b;
                comp.data[i+3] = 255;
            }
            ctx.putImageData(comp, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.9);
        } catch(e) {
            console.error("Composite generation failed:", e);
            return null;
        }
    }

    async function triggerBandFlash(bands) {
        const wrappers = Array.from(bandVideosContainer.querySelectorAll('.band-video-wrapper'));
        wrappers.forEach(w => {
            const label = w.querySelector('.band-video-label').textContent.toLowerCase();
            if (bands.some(b => label.includes(b.toLowerCase()) || b.toLowerCase().includes(label))) {
                w.style.boxShadow = '0 0 15px 5px var(--accent)';
                w.style.borderColor = 'var(--accent)';
                setTimeout(() => {
                    w.style.boxShadow = '';
                    w.style.borderColor = '';
                }, 800);
            }
        });
    }

    let isProcessing = false;

    async function runCycle(videoSecond) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            flashOverlay.classList.add('flash');
            setTimeout(() => flashOverlay.classList.remove('flash'), 150);

            const timestamp = new Date().toISOString();
            const currentLon = (baseLon + (Math.random() - 0.5) * 0.01).toFixed(4);
            const currentLat = (baseLat + (Math.random() - 0.5) * 0.01).toFixed(4);
            
            const snapshotFile = availableSnapshots.find(s => s.startsWith('visual_') && s.endsWith(`_${videoSecond}s.png`));
            
            if (!snapshotFile) {
                logSystem(`[WARN] No snapshot found for T=${videoSecond}s`);
                isProcessing = false;
                return;
            }

            processedImage.src = `/scenarios/${currentScenario}/snapshots/${snapshotFile}`;
            processedImage.style.display = 'block';
            boundingBoxesContainer.innerHTML = '';

            const classNames = landClasses.map(c => typeof c === 'string' ? c : c.name);

            // Step 1: Terrain Classification
            // Reorder so "urban" is not the first JSON key (model drops it)
            const reordered = [...classNames].sort((a, b) => a === 'urban' ? 1 : b === 'urban' ? -1 : 0);
            const prompt1 = `Classify this satellite image into land cover percentages. Analyze what you see and distribute values between ${reordered.join(', ')}. The percentages should sum to 1.0. Avoid zeros and avoid equal distributions. Output ONLY JSON: {"classification": {${reordered.map(c => `"${c}": float`).join(', ')}}}.`;
            logSystem(`[STEP 1] Classifying scene at T=${videoSecond}s...`);
            
            const payload1 = { prompt: prompt1, timestamp, scenario: currentScenario, image: snapshotFile };

            const res1 = await fetch('/api/llm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) });
            if (!res1.ok) throw new Error(`LLM Classification failed: ${res1.status}`);

            const data1 = await res1.json();
            const result1 = JSON.parse(data1.content);
            logLLM(prompt1, result1);

            let classificationData = result1.classification || result1;
            classNames.forEach(cls => {
                let val = classificationData[cls] || 0;
                let pct = val > 1 ? Math.round(val) : Math.round(val * 100);
                const labelEl = document.getElementById(`label-${cls}`);
                const barEl = document.getElementById(`bar-${cls}`);
                if (labelEl) labelEl.textContent = `${pct}%`;
                if (barEl) barEl.style.width = `${pct}%`;
            });

            const getFrac = (key) => {
                let val = classificationData[key] || 0;
                return val > 1 ? val / 100 : val;
            };

            // Identify modes to process based on classification
            let candidates = [];
            
            landClasses.forEach(clsObj => {
                const name = typeof clsObj === 'string' ? clsObj : clsObj.name;
                const mode = typeof clsObj === 'string' ? null : clsObj.secondary_mode;
                
                if (getFrac(name) > 0.01) {
                    let mappedMode = mode;
                    if (!mappedMode) {
                         if (name.includes('urban') || name.includes('industrial')) mappedMode = 'methane';
                         else if (name.includes('coastal') || name.includes('water') || name.includes('ocean')) mappedMode = 'oil_spill';
                         else if (name.includes('volcanic') || name.includes('volcano')) mappedMode = 'volcanic';
                         else if (name.includes('desert') || name.includes('arid')) mappedMode = 'drought';
                         else mappedMode = 'fire_risk';
                     }
                    candidates.push({ name, mode: mappedMode });
                }
            });

            // Fallback if nothing detected
            if (candidates.length === 0) candidates.push({ name: classNames[0], mode: 'fire_risk' });

            // Sort by frac value for selection
            candidates.sort((a, b) => getFrac(b.name) - getFrac(a.name));

            // Run 2 secondary processing steps per primary cycle
            let bannedModes = [];
            if (lastSecondaryMode) bannedModes.push(lastSecondaryMode);

            for (let step = 0; step < 2; step++) {
                // Select a candidate with a mode not in bannedModes
                let candidate = candidates.find(c => !bannedModes.includes(c.mode));

                // If no valid candidate, pick any available mode not in bannedModes
                if (!candidate) {
                    const available = Object.keys(composites).filter(m => !bannedModes.includes(m));
                    const fallback = available[0] || 'fire_risk';
                    candidate = { name: (candidates[0] || {}).name || 'rural', mode: fallback };
                }

                bannedModes.push(candidate.mode);
                lastSecondaryMode = candidate.mode;

                const compConfig = composites[candidate.mode];
                if (!compConfig) continue;

                logSystem(`[STEP 2.${step + 1}] Secondary Processing: ${compConfig.analysis_type}...`);
                triggerBandFlash(compConfig.bands);
                const compB64 = await generateCompositeBase64(currentScenario, videoSecond, compConfig.bands[0], compConfig.bands[1], compConfig.bands[2], compConfig.maskMode);

                if (compB64) {
                    processedImage.src = compB64;
                    const b64Data = compB64.split(',')[1];
                    const payload2 = { prompt: compConfig.prompt, timestamp, scenario: currentScenario, base64Image: b64Data, secondary_mode: candidate.mode };

                    const res2 = await fetch('/api/llm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) });
                    if (res2.ok) {
                        const data2 = await res2.json();
                        const result2 = JSON.parse(data2.content);
                        logLLM(compConfig.prompt, result2);

                        if (result2.bbox && result2.bbox.length === 4) {
                            const [x1, y1, x2, y2] = result2.bbox;
                            const b = document.createElement('div');
                            b.className = 'bounding-box';
                            const boxColor = result2.detected ? 'var(--danger)' : 'var(--success)';
                            b.style.borderColor = boxColor;
                            b.style.backgroundColor = result2.detected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                            b.style.left = `${x1 * 100}%`; b.style.top = `${y1 * 100}%`;
                            b.style.width = `${(x2 - x1) * 100}%`; b.style.height = `${(y2 - y1) * 100}%`;

                            const labelDiv = document.createElement('div');
                            labelDiv.style.cssText = `position:absolute;top:0;left:0;background:${boxColor};color:white;font-size:10px;padding:2px 4px;font-weight:bold;text-transform:uppercase;`;
                            labelDiv.textContent = `${compConfig.analysis_type}: ${result2.detected ? 'DETECTED' : 'CLEAR'}`;
                            b.appendChild(labelDiv);
                            boundingBoxesContainer.appendChild(b);
                        }
                    }
                } else {
                    logSystem(`[ERROR] Failed to generate composite for ${candidate.mode}`);
                }
            }
        } catch (e) {
            logSystem(`[ERROR] Processing Cycle Failed: ${e.message}`);
        } finally {
            isProcessing = false;
        }
    }

    fetchScenarios();
});
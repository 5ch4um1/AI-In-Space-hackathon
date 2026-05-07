const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/scenarios', express.static(path.join(__dirname, 'scenarios')));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Discover Scenarios
app.get('/api/scenarios', (req, res) => {
    const scenariosDir = path.join(__dirname, 'scenarios');
    try {
        if (!fs.existsSync(scenariosDir)) {
            fs.mkdirSync(scenariosDir, { recursive: true });
        }
        const scenarios = fs.readdirSync(scenariosDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        res.json({ scenarios });
    } catch (error) {
        res.status(500).json({ error: "Failed to read scenarios" });
    }
});

// Get Scenario Config
app.get('/api/scenarios/:name/config', (req, res) => {
    const configPath = path.join(__dirname, 'scenarios', req.params.name, 'config.json');
    if (fs.existsSync(configPath)) {
        res.json(JSON.parse(fs.readFileSync(configPath, 'utf-8')));
    } else {
        res.status(404).json({ error: "Config not found" });
    }
});

// Get Scenario Assets
app.get('/api/scenarios/:name/assets', (req, res) => {
    const scenarioDir = path.join(__dirname, 'scenarios', req.params.name);
    try {
        const videosDir = path.join(scenarioDir, 'videos');
        const snapshotsDir = path.join(scenarioDir, 'snapshots');
        
        const videos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4')) : [];
        const snapshots = fs.existsSync(snapshotsDir) ? fs.readdirSync(snapshotsDir).filter(f => f.endsWith('.png')) : [];
        
        res.json({ videos, snapshots });
    } catch (error) {
        res.status(500).json({ error: "Failed to read assets" });
    }
});

app.post('/api/llm', async (req, res) => {
    const { prompt, scenario, image, secondary_mode } = req.body;

    // Load scenario config to get custom system prompts
    let customSystemPrompt = null;
    if (scenario) {
        const configPath = path.join(__dirname, 'scenarios', scenario, 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.system_prompts) {
                // Determine which prompt to use based on the prompt content
                const promptText = (prompt || '').toLowerCase();
                if (promptText.includes('classif') || promptText.includes('terrain')) {
                    customSystemPrompt = config.system_prompts.terrain;
                } else if (promptText.includes('methane')) {
                    customSystemPrompt = config.system_prompts.methane;
                } else if (promptText.includes('fire') || promptText.includes('drought')) {
                    customSystemPrompt = config.system_prompts.fire_risk || config.system_prompts.drought;
                } else if (promptText.includes('algae') || promptText.includes('oil') || promptText.includes('water')) {
                    customSystemPrompt = config.system_prompts.oil_spill || config.system_prompts.algae;
                }
            }
        }
    }

    // Determine which expert port to use based on the task
    // Primary (terrain classification) -> 8001
    // Secondary Land Expert (fire_risk, methane, volcanic, drought) -> 8002
    // Secondary Maritime Expert (oil_spill, algae, water) -> 8003
    let targetPort = 8002; // Default to land expert
    
    // Check if this is a primary classification request
    if (prompt && (prompt.toLowerCase().includes('identify percentages') || 
        prompt.toLowerCase().includes('classify') || 
        prompt.toLowerCase().includes('classification'))) {
        targetPort = 8001; // Primary: terrain classification
    }
    // Check if this is a maritime secondary request
    else if (secondary_mode) {
        const maritimeModes = ['oil_spill', 'algae', 'water', 'water_body', 'water_bodies'];
        if (maritimeModes.includes(secondary_mode)) {
            targetPort = 8003; // Maritime expert
        } else if (secondary_mode === 'fire_risk' || secondary_mode === 'volcanic') {
            targetPort = 8004; // Fire risk expert
        } else {
            targetPort = 8002; // Other land experts
        }
    }
    
    const activeUrl = `http://127.0.0.1:${targetPort}/v1/chat/completions`;
    
    console.log(`\n--- NEW LLM REQUEST ---`);
    console.log(`Routing to expert on port: ${targetPort}`);
    console.log(`Resolved Target LLM URL: [${activeUrl}]`);
    
    let base64Image = "";
    
    if (req.body.base64Image) {
        base64Image = req.body.base64Image;
    } else if (scenario && image) {
        const imagePath = path.join(__dirname, 'scenarios', scenario, 'snapshots', image);
        if (fs.existsSync(imagePath)) {
            const fileData = fs.readFileSync(imagePath);
            base64Image = fileData.toString('base64');
        } else {
            return res.status(404).json({ error: `Image file not found on server: ${image}` });
        }
    } else {
        return res.status(400).json({ error: "Missing scenario, image filename, or base64Image" });
    }
    
    try {
        const systemPrompt = customSystemPrompt || "Satellite image classifier. Output JSON only.";
        
        const payload = {
            model: "LFM2.5-VL-450M-Q4_0.gguf",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 300
        };

        const response = await fetch(activeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            console.error(`LLM returned HTTP ${response.status}: ${errText}`);
            return res.status(response.status).json({ error: `Vision LLM Error (HTTP ${response.status}): ${errText}` });
        }

        const data = await response.json();
        const llmReply = data.choices[0].message.content;
        console.log(`[LLM RAW REPLY]:\n${llmReply}\n-----------------------`);

        let jsonStr = llmReply;
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }

        jsonStr = jsonStr.replace(/```$/, '').trim();

        let firstBrace = jsonStr.indexOf('{');
        let lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        jsonStr = jsonStr.replace(/([{\[])\s*,/g, '$1');
        jsonStr = jsonStr.replace(/;\s*$/g, '');

        try {
            let parsed = JSON.parse(jsonStr);

            // Fix case where classification is a string instead of object
            if (parsed.classification && typeof parsed.classification === 'string') {
                const clsName = parsed.classification.toLowerCase();
                parsed.classification = { [clsName]: 1.0 };
            }

            if (parsed.bbox && Array.isArray(parsed.bbox)) {
                parsed.bbox = parsed.bbox.map(v => {
                    const n = Number(v);
                    return isNaN(n) ? 0 : Math.max(0, Math.min(1, n));
                });
                if (parsed.bbox.length !== 4) {
                    parsed.bbox = [0, 0, 0.1, 0.1];
                }
                if (parsed.detected === undefined) {
                    parsed.detected = true;
                }
            }

            jsonStr = JSON.stringify(parsed);
            res.json({ content: jsonStr });
        } catch (e) {
            console.error(`JSON Parse failed on LLM reply. Extracted string: ${jsonStr}`);
            return res.status(502).json({ error: `LLM generated an invalid JSON format`, raw_reply: llmReply });
        }
    } catch (error) {
        console.error(`LLM Network Request Failed: ${error.message}`);
        return res.status(500).json({ error: `Failed to connect to Vision LLM at ${activeUrl}. Is it running?` });
    }
});

// Spectral API Endpoint
app.get('/data/image/sentinel', (req, res) => {
    const { lon, lat, timestamp, spectral_bands } = req.query;
    console.log(`[API CALL] GET /data/image/sentinel - Bands: ${spectral_bands}`);
    res.json({
        success: true,
        message: "Image processed",
        metadata: { lon, lat, timestamp, spectral_bands },
        url: `/scenarios/default/images/processed_mock.png`
    });
});

app.listen(port, () => {
    console.log(`NI-IDEA Server running at http://localhost:${port}`);
});
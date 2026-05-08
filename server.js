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
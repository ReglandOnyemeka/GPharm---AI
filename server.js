const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. AI API ROUTE
app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AIzaSyBXUzwNGDO7XFrZPvBJVFYxw1tg30rqQNU;
    if (!GEMINI_KEY) return res.status(500).json({ error: "API Key missing in Render settings." });

    try {
        const { drugName, api, category } = req.body;
        const prompt = `You are a clinical pharmacist in Lagos. Suggest 3 substitutes for ${drugName} (${api}) in ${category} category for Nigeria. List average Lagos market prices. Concise bullets.`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: "AI communication failed." });
    }
});

// 2. SERVE FRONTEND FILES
app.use(express.static(__dirname));

// 3. SPA FALLBACK
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

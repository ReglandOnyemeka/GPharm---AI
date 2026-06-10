const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "API Key missing." });

    try {
        const { drugName, api, category } = req.body;
        const prompt = `You are a clinical pharmacist in Lagos. Analyze: ${drugName} (${api}) in ${category}. 
        1. 3 bio-equivalents in Lagos. 
        2. Average Lagos retail price range (₦). 
        3. Safety precaution. Concise bullets. Use <br> tags.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        res.json({ result: data.candidates[0].content.parts[0].text });
    } catch (error) { res.status(500).json({ error: "AI Busy." }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server live on ${PORT}`));

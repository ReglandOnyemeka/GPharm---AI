// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AI_API_KEY;

    if (!GEMINI_KEY) {
        console.error("ERROR: AI_API_KEY missing.");
        return res.status(500).json({ error: "API Key missing in Render settings." });
    }

    try {
        const { drugName, api, category } = req.body;
        
        // Safety settings tell Gemini not to block medical/clinical terms
        const payload = {
            contents: [{
                parts: [{ 
                    text: `You are a Senior Clinical Pharmacist in Lagos. Analyze: ${drugName} (${api}) in category ${category}. 
                    1. Suggest 3 bio-equivalents in Lagos. 
                    2. Estimate Lagos market price benchmark. 
                    3. Safety brief. 
                    Use concise bullet points.` 
                }]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // LOGGING THE RAW DATA FOR YOU IN RENDER CONSOLE
        console.log("RAW GEMINI RESPONSE:", JSON.stringify(data));

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const result = data.candidates[0].content.parts[0].text;
            res.json({ result });
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
            res.status(500).json({ error: `AI Blocked request: ${data.promptFeedback.blockReason}` });
        } else {
            res.status(500).json({ error: "AI returned an empty structure. Check Render logs for raw data." });
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ error: "AI communication failed." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`GPharm Server active on port ${PORT}`));

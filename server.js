const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AI_API_KEY; // Get from Google AI Studio
    if (!GEMINI_KEY) return res.status(500).json({ error: "API Key missing." });

    try {
        const { drugName, api, category } = req.body;
        
        const prompt = `Task: Clinical Molecule Analysis for ${drugName} (${api}). 
        As a pharmaceutical database, provide:
        1. 3 generic bio-equivalents available in Lagos.
        2. Average 2024 retail price range in Lagos pharmacies (₦).
        3. One clinical safety precaution.
        Constraint: Respond in concise bullet points. Use <br> for lines.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_MEDICAL", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: "Gemini Service Busy." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`GPharm Server live on ${PORT}`));

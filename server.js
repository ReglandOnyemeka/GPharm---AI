// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    // LOG: Check if the key exists in the environment
    console.log("AI Request Received. Checking API Key...");
    
    const GEMINI_KEY = process.env.AI_API_KEY;

    if (!GEMINI_KEY) {
        console.error("CRITICAL ERROR: AI_API_KEY is undefined in Render Environment.");
        return res.status(500).json({ error: "API Key missing in Render settings." });
    }

    try {
        const { drugName, api, category } = req.body;
        console.log(`Consulting Gemini for: ${drugName}`);
        
        const prompt = `You are a Senior Clinical Pharmacist in Lagos, Nigeria. 
        Analyze the drug: ${drugName} (${api}) in the ${category} category.
        1. Suggest 3 bio-equivalent substitutes available in the Lagos market.
        2. MARKET INTELLIGENCE: Estimate the average current retail price range for ${drugName} at major pharmacies in Lagos.
        3. Clinical safety brief.
        Respond with professional bullet points for staff use.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            const result = data.candidates[0].content.parts[0].text;
            console.log("AI Response Successful.");
            res.json({ result });
        } else {
            console.error("Gemini Error Response:", JSON.stringify(data));
            res.status(500).json({ error: "AI returned an invalid structure." });
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

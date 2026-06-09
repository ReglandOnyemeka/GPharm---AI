const express = require('express');
const path = require('path');
const app = express();
// Render provides the PORT automatically
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. SERVE API FIRST
app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AIzaSyBXUzwNGDO7XFrZPvBJVFYxw1tg30rqQNU;

    if (!GEMINI_KEY) {
        console.error("Missing AI_API_KEY");
        return res.status(500).json({ error: "Server AI Key not configured." });
    }

    try {
        const { drugName, api, category } = req.body;
        
        const prompt = `You are a Senior Clinical Pharmacist in Lagos, Nigeria. 
        Drug: ${drugName} (${api}) - Category: ${category}.
        1. Suggest 3 bio-equivalent substitutes available in Lagos.
        2. Estimate current retail price range for ${drugName} at major pharmacies like Medplus/HealthPlus.
        3. Clinical safety brief.
        Respond with concise professional bullets for staff.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            const result = data.candidates[0].content.parts[0].text;
            res.json({ result });
        } else {
            res.status(500).json({ error: "AI returned empty response." });
        }
    } catch (error) {
        console.error("Internal AI Error:", error.message);
        res.status(500).json({ error: "Failed to connect to Gemini." });
    }
});

// 2. SERVE STATIC FILES
app.use(express.static(path.join(__dirname, '/')));

// 3. FALLBACK TO INDEX (For Single Page App behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`GPharm Server running on port ${PORT}`));

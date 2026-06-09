const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    try {
        const { drugName, api, category } = req.body;
        const GEMINI_KEY = process.env.AI_API_KEY;
        
        const prompt = `You are a Senior Clinical Pharmacist in Lagos, Nigeria. 
        Analyze the drug: ${drugName} (${api}) in the ${category} category.
        1. Suggest 3 bio-equivalent substitutes available in the Lagos market.
        2. MARKET INTELLIGENCE: Estimate the average current retail price range for ${drugName} at major Lagos pharmacies (like HealthPlus or Medplus).
        3. Explain briefly why these substitutes are clinically safe.
        Respond with professional bullet points for internal staff use.`;

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
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`GPharm Server active on port ${PORT}`));

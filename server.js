const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY in Render." });

    try {
        const { drugName, api, category } = req.body;
        const prompt = `Lagos Pharmacist Analysis: Analyze ${drugName} (${api}) in ${category}. 1. 3 bio-equivalents in Lagos. 2. 2024 Lagos market price range in Naira (₦). 3. Brief safety tip. Use concise bullets and <br> tags.`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });

        res.json({ result: response.data.choices[0].message.content });
    } catch (error) {
        console.error("AI Error:", error.message);
        res.status(500).json({ error: "AI failed. Check OpenAI Credits/Billing." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server live on ${PORT}`));

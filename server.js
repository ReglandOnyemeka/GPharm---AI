const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "API Key missing in Render settings." });

    try {
        const { drugName, api, category } = req.body;
        const prompt = `You are a Senior Pharmacist in Lagos. Analyze ${drugName} (${api}) in ${category}. 1. 3 substitutes in Lagos. 2. Average price range (₦). 3. Brief clinical precaution. Concise bullets. Use <br> tags.`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });

        res.json({ result: response.data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: "Check OpenAI Credits/Billing balance." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`GPharm live on ${PORT}`));

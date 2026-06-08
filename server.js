const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // Serves index.html and app.js

// Gemini AI Route
app.post('/api/ai-assist', async (req, res) => {
    try {
        const { drugName, api, category, task } = req.body;
        const GEMINI_KEY = process.env.AI_API_KEY;
        
        const prompt = `You are a Lagos clinical pharmacist. Task: ${task === 'recommend' ? 'Suggest 3 clinical equivalents for' : 'Suggest a retail price for'} ${drugName} (${api}) in ${category} category for Nigeria. Concise bullets.`;
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

// Handle SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`GPharm Server running on port ${PORT}`));

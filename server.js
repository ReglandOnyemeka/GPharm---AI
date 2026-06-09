const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/ai-assist', async (req, res) => {
    const GEMINI_KEY = process.env.AI_API_KEY;

    if (!GEMINI_KEY) {
        return res.status(500).json({ error: "API Key missing in Render settings." });
    }

    try {
        const { drugName, api, category } = req.body;
        
        // Clean up data to avoid sending "undefined" to Google
        const dName = drugName || "Medicine";
        const dApi = api || "General Molecule";
        const dCat = category || "General Pharmacy";

        const url = `https://genergenerativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        // SAFETY SETTINGS: This is the most important part for medical apps
        const payload = {
            contents: [{
                parts: [{ 
                    text: `As a clinical pharmacy research assistant, analyze the drug molecule ${dApi} (Brand: ${dName}) in the ${dCat} category for the Nigerian market.
                    1. List 3 bio-equivalent generic alternatives available in Lagos.
                    2. Provide a 2024 price benchmark range in Naira.
                    3. Give a brief clinical use note.
                    Keep it professional and concise.` 
                }]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.1, // Lower temperature = more factual/less creative
                maxOutputTokens: 800
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // LOGGING (Check your Render terminal logs!)
        console.log("Gemini Payload Sent for:", dName);

        // Check for specific Gemini Response paths
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const result = data.candidates[0].content.parts[0].text;
            res.json({ result });
        } 
        else if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            res.status(500).json({ error: `Google API Error: ${data.error.message}` });
        }
        else {
            // This captures "Safety Filter" blocks specifically
            const blockReason = data.promptFeedback?.blockReason || "Safety Filter Block";
            console.error("Gemini Blocked:", blockReason);
            res.status(500).json({ error: `Google blocked this request due to: ${blockReason}. Try a different drug.` });
        }
    } catch (error) {
        console.error("Server Bridge Error:", error.message);
        res.status(500).json({ error: "Connection to AI service failed." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`GPharm Server active on port ${PORT}`));

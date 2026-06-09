/**
 * GPharm AI Lagos — Professional Node.js Backend
 * Handles OpenAI GPT-4o-mini Bridge & Web Serving
 */

const express = require('express');
const path = require('path');
const axios = require('axios'); // Ensure 'axios' is in your package.json
const app = express();

// Render provides the PORT environment variable automatically
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON data
app.use(express.json());

/**
 * 1. AI ASSISTANT ROUTE (OpenAI Bridge)
 * This endpoint is called by app.js to get clinical/market insights.
 */
app.post('/api/ai-assist', async (req, res) => {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    // Safety check for API Key
    if (!OPENAI_KEY) {
        console.error("CRITICAL: OPENAI_API_KEY is missing in Render environment variables.");
        return res.status(500).json({ error: "Server Configuration Error: AI Key missing." });
    }

    try {
        const { drugName, api, category } = req.body;
        console.log(`[AI Request] Analyzing: ${drugName} for staff consult.`);

        // The professional clinical prompt for the Lagos market
        const prompt = `You are a Senior Clinical Pharmacist in Lagos, Nigeria. 
        Analyze the drug: ${drugName} (API: ${api}) in the ${category} category.
        
        TASKS:
        1. Suggest 3 bio-equivalent generic substitutes available in the Lagos market.
        2. MARKET INTELLIGENCE: Estimate the current average retail price range for ${drugName} at major Lagos pharmacies (e.g., Medplus, HealthPlus, Nett).
        3. SAFETY: Provide a one-sentence clinical safety or dosage precaution.
        
        RESPONSE FORMAT:
        Use concise professional bullet points. Use HTML line breaks (<br>) between sections.`;

        // OpenAI API Call (Using the fast and cheap GPT-4o-mini model)
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional clinical pharmaceutical consultant in Lagos." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3 // Lower temperature ensures more factual/consistent pricing data
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResult = response.data.choices[0].message.content;
        console.log(`[AI Success] Response generated for ${drugName}`);
        
        res.json({ result: aiResult });

    } catch (error) {
        // Detailed error logging for Render Console
        console.error("AI Bridge Error:", error.response ? error.response.data : error.message);
        
        res.status(500).json({ 
            error: "AI communication failed. Please check OpenAI credits or API key status." 
        });
    }
});

/**
 * 2. STATIC FILE SERVING
 * This serves your index.html and app.js to the browser.
 */
app.use(express.static(path.join(__dirname, '/')));

/**
 * 3. SPA ROUTING FALLBACK
 * Ensures that if a user refreshes the page on a sub-route, 
 * the server always returns the main index.html file.
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 GPharm Server is live on port ${PORT}`);
    console.log(`🏥 Environment: Production (Lagos/Lagos)`);
    console.log(`-----------------------------------------`);
});

# 💊 GPharm AI Lagos
**Smart Pharmacy Inventory & POS System**

An AI-powered, cloud-synchronized pharmacy management tool built for retail pharmacies in Lagos, Nigeria. This system bridges the gap between traditional stock-taking and modern clinical decision support.

## 🚀 Key Features
- **AI Clinical Consult (Google Gemini):** Instantly suggests bio-equivalent substitutes based on API (Active Ingredient) when a brand is out of stock.
- **Cloud Database (Supabase):** Real-time synchronization across all devices. Update stock on a laptop and see it instantly on the cashier's APK.
- **WhatsApp Checkout:** Patients can order medications directly to their doorstep in Lagos via a structured WhatsApp payload.
- **Smart POS:** Handles split payments (Cash, Card, Transfer) and provides therapeutic upselling suggestions.
- **Inventory Control:** Bulk upload stock batches using Excel (.xlsx) files via SheetJS.

## 🛠️ Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Mobile-first).
- **Backend:** Node.js (Netlify/Vercel Serverless Functions).
- **AI:** Google Gemini 1.5 Flash API.
- **Database:** Supabase (PostgreSQL with Realtime enabled).

## 📦 Installation & Setup
1. **Clone the repo:** `git clone https://github.com/ReglandOnyemeka/GPharm-AI.git`
2. **Setup Environment Variables:**
   - `AI_API_KEY`: Your Google Gemini API Key.
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_KEY`: Your Supabase Anon/Public Key.
3. **Database Setup:** Run the provided SQL script in the Supabase SQL Editor to create the `products` table.

## ⚖️ Medical Disclaimer
*AI-generated suggestions are for informational and decision-support purposes only. They do not replace professional clinical judgment. A licensed pharmacist must verify all drug substitutions and clinical guidance.*

---
© 2024 GPharm Lagos.

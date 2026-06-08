// app.js
const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- 1. INITIALIZE ---
async function init() {
    console.log("GPharm Engine: Connecting to Cloud...");
    await loadData();
    
    // Real-time listener: When you add stock on one device, it shows on the other instantly
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log("Database update detected!");
        loadData();
    }).subscribe();

    // Attach Search listener
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderPublic(e.target.value);
        });
    }
}

async function loadData() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Supabase Load Error:", error.message);
    } else {
        products = data || [];
        console.log("Data successfully loaded:", products.length, "items");
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

// --- 2. SEARCH & RENDER ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;

    const filtered = products.filter(p => {
        const search = filter.toLowerCase();
        return (p.name || "").toLowerCase().includes(search) || 
               (p.api || "").toLowerCase().includes(search) ||
               (p.cat || "").toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; opacity:0.5;">No results found for "${filter}".</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <span class="badge">${p.cat} ${p.pom ? '• 🔴 POM' : ''}</span>
            <h3>${p.name}</h3>
            <p class="api-text">${p.api || ''}</p>
            <div class="price">₦${(p.price || 0).toLocaleString()}</div>
            <button class="btn-ai" onclick="window.triggerAI(${p.id})">Consult Gemini AI</button>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

// --- 3. MANUAL ENTRY FIX ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price) || isNaN(stock)) {
        alert("⚠️ Please fill in Name, Price, and Stock Quantity.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('products')
            .insert([{ name, api, price, stock, cat, pom }]);
            
        if (error) throw error;

        alert("✅ " + name + " saved to cloud!");
        window.closeModal('modal-add');
        loadData(); // This refreshes the screen instantly
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
};

// --- 4. NAVIGATION ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            window.showView('admin');
        } else { alert("❌ Invalid Access."); }
    } else {
        isAdminMode = false;
        document.getElementById('nav-btn-admin').innerText = "Pharmacy Login";
        window.showView('home');
    }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    isAdminMode ? renderAdmin() : renderPublic();
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();

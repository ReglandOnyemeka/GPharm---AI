/**
 * GPharm AI Lagos — Cloud Logic Engine
 */

const SUPABASE_URL = 'https://fyqtcnblyhknaiemxwrr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3JLIN7jRvr4pFBCy8vZykw_dfbHVyBT';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let posCart = [];
let isAdminMode = false;

// --- 1. INITIALIZATION ---
async function init() {
    try {
        console.log("Initializing GPharm...");
        await loadData();
        
        // Listen for Real-time sync
        supabaseClient.channel('any').on('postgres_changes', { 
            event: '*', schema: 'public', table: 'products' 
        }, () => loadData()).subscribe();

        // Search Bar Setup
        const searchInput = document.getElementById('input-search-public');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => renderPublic(e.target.value));
        }
    } catch (err) {
        console.error("Init Error:", err);
    }
}

async function loadData() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Supabase Error:", error.message);
        const grid = document.getElementById('public-grid');
        if (grid) grid.innerHTML = `<p style="color:red; text-align:center;">Failed to load data. Please check Supabase permissions.</p>`;
        return;
    }

    products = data || [];
    isAdminMode ? renderAdmin() : renderPublic();
    if (isAdminMode) renderPOS();
}

// --- 2. AI CONSULT (FIXED PATH) ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');

    if (!banner) return;
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    content.innerHTML = `🔄 analyzing Lagos market for ${drug.name}...`;

    try {
        // Correct path for Render
        const response = await fetch('/api/ai-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                drugName: drug.name, 
                api: drug.api, 
                category: drug.cat 
            })
        });
        
        if (!response.ok) throw new Error("Server responded with error");
        
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Clinical & Market Analysis</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) {
        content.innerHTML = "⚠️ AI offline. Make sure Render Environment Variables are set correctly.";
        console.error("AI Fetch error:", err);
    }
};

// --- 3. RENDERING ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge" style="font-size:0.6rem; color:#888;">${p.cat} ${p.pom ? '🔴' : '🟢'}</span>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="window.triggerAI(${p.id})">AI Consult</button>
        </div>
    `).join('');
    updateInsights();
};

// --- 4. STAFF AUTH ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            document.getElementById('nav-btn-admin').classList.add('active');
            window.showView('admin');
        } else { alert("❌ Invalid Code"); }
    } else {
        isAdminMode = false;
        document.getElementById('nav-btn-admin').innerText = "Pharmacy Login";
        document.getElementById('nav-btn-admin').classList.remove('active');
        window.showView('home');
    }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    if (view === 'admin') window.switchAdminTab('pos'); else window.renderPublic();
};

// --- REST OF YOUR FUNCTIONS (Cart, Excel, etc) ---
window.switchAdminTab = (tab) => {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('tab-pos').classList.toggle('active', tab === 'pos');
    document.getElementById('tab-inv').classList.toggle('active', tab === 'inv');
    if(tab === 'inv') renderInventory(); else renderPOS();
};

window.renderPOS = (f = "") => {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:#888;">Qty: ${p.stock}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="event.stopPropagation(); window.triggerAI(${p.id})">AI Check</button>
        </div>
    `).join('');
};

window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

window.updateCartUI = () => {
    const bar = document.getElementById('public-cart-bar');
    if (!bar) return;
    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = count;
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString();
    } else bar.style.display = 'none';
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    if(document.getElementById('stat-low')) document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    if(document.getElementById('stat-count')) document.getElementById('stat-count').innerText = products.length;
}

init();

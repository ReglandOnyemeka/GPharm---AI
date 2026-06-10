/**
 * GPharm AI Lagos — Cloud Sync Engine (Updated for 'sb_' Keys)
 */

const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH'; // <--- Paste your sb_ key here
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- INITIALIZATION ---
async function init() {
    await loadData();
    // Enable live device-to-device sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

// --- MANUAL STOCK ENTRY (FIXED) ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const api = document.getElementById('m-api').value.trim();
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("⚠️ Please enter Name and Price.");

    try {
        const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);
        if (error) throw error;
        alert("✅ " + name + " saved to Cloud!");
        window.closeModal('modal-add');
        loadData();
    } catch (e) {
        alert("❌ Database Blocked: " + e.message + "\nCheck Supabase SQL Editor permissions.");
    }
};

// --- STAFF AI CONSULT (GEMINI BYPASS) ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');

    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth' });
    content.innerHTML = `🔄 analyzing Lagos market for ${drug.name}...`;

    try {
        const res = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await res.json();
        content.innerHTML = `<strong>✨ AI Staff Analysis</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (e) {
        content.innerHTML = "⚠️ AI offline. Check Render Environment Variables.";
    }
};

// --- UI NAVIGATION ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            document.getElementById('nav-btn-admin').classList.add('active');
            window.showView('admin');
        }
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
    isAdminMode ? renderAdmin() : renderPublic();
};

window.renderPublic = function(f = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge">${p.cat || 'General'}</span>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    const tbody = document.getElementById('inventory-tbody');
    if (grid) grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="window.triggerAI(${p.id})">AI Consult</button>
        </div>
    `).join('');
    if (tbody) tbody.innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api}</td><td>₦${p.price.toLocaleString()}</td><td>${p.stock}</td></tr>`).join('');
    updateInsights();
};

window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p || p.stock <= 0) return alert("Out of stock!");
    publicCart.push({...p, qty: 1});
    window.updateCartUI();
    alert(p.name + " added to order.");
};

window.updateCartUI = () => {
    const bar = document.getElementById('public-cart-bar');
    if (publicCart.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = publicCart.length;
    } else bar.style.display = 'none';
};

window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name}</span><strong>₦${i.price.toLocaleString()}</strong></div>`).join('');
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    if (!name || phone.length !== 11) return alert("Enter receiver name and 11-digit Lagos phone.");
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent("*GPHARM ORDER*\n" + publicCart.map(i=>"• "+i.name).join("\n"))}`);
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.switchAdminTab = (tab) => { /* Sub-tab logic */ };

init();

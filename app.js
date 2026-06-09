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
    await loadData();
    supabaseClient.channel('any').on('postgres_changes', { 
        event: '*', schema: 'public', table: 'products' 
    }, () => loadData()).subscribe();

    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) { renderPOS(); updateInsights(); }
    }
}

// --- 2. POS CHECKOUT FIX ---
window.checkoutPOS = async function() {
    if (posCart.length === 0) return;
    
    const btn = document.getElementById('btn-checkout-pos');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        for (let item of posCart) {
            // Find latest stock from database to avoid errors
            const { data: latestProduct } = await supabaseClient.from('products').select('stock').eq('id', item.id).single();
            const currentStock = latestProduct ? latestProduct.stock : item.stock;
            
            const { error } = await supabaseClient
                .from('products')
                .update({ stock: currentStock - item.qty })
                .eq('id', item.id);
            
            if (error) throw error;
        }

        alert("✅ TRANSACTION COMPLETE: Inventory synchronized.");
        posCart = []; 
        window.updatePOSUI(); 
        await loadData();
    } catch (err) {
        alert("❌ POS Error: " + err.message + "\nCheck if RLS is Disabled in Supabase.");
    } finally {
        btn.innerText = "Complete Sale & SMS Receipt";
        btn.disabled = false;
    }
};

// --- 3. MANUAL ENTRY FIX ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("⚠️ Name and Price are required.");

    try {
        const { error } = await supabaseClient
            .from('products')
            .insert([{ name, api, price, stock, cat, pom }]);
            
        if (error) throw error;

        alert(`✅ SUCCESS: ${name} added to inventory.`);
        window.closeModal('modal-add');
        
        // Clear fields
        document.getElementById('m-name').value = "";
        document.getElementById('m-api').value = "";
        document.getElementById('m-price').value = "";
        document.getElementById('m-stock').value = "";
        
        await loadData();
    } catch (err) {
        alert("❌ Entry Failed: " + err.message + "\nEnsure RLS is disabled in Supabase Table Editor.");
    }
};

// --- 4. NAVIGATION & AUTH ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
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
    if (view === 'admin') window.switchAdminTab('pos'); else window.renderPublic();
};

window.switchAdminTab = function(tab) {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('tab-pos').classList.toggle('active', tab === 'pos');
    document.getElementById('tab-inv').classList.toggle('active', tab === 'inv');
    if(tab === 'inv') window.renderInventory(); else window.renderPOS();
};

// --- 5. RENDERERS ---
window.renderPublic = function(f = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge" style="font-size:0.6rem; color:#888;">${p.cat}</span>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    const tbody = document.getElementById('inventory-tbody');
    if (grid) {
        grid.innerHTML = products.map(p => `
            <div class="card">
                <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock}</div>
                <h3>${p.name}</h3>
                <div class="price">₦${p.price.toLocaleString()}</div>
                <button class="btn-ai" onclick="window.triggerAI(${p.id})">AI Consult</button>
            </div>
        `).join('');
    }
    if (tbody) {
        tbody.innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api}</td><td>₦${p.price.toLocaleString()}</td><td style="font-weight:700; color:${p.stock < 10 ? 'red' : 'green'};">${p.stock}</td></tr>`).join('');
    }
    updateInsights();
};

window.renderPOS = function(filter = "") {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:${p.stock < 10 ? 'red' : 'green'}; font-weight:700;">Stock: ${p.stock}</div>
            <h3 style="font-size:1.1rem; margin:5px 0;">${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="event.stopPropagation(); window.triggerAI(${p.id})">AI Consult</button>
        </div>
    `).join('');
};

// --- 6. AI & UTILS ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');
    banner.style.display = 'block';
    content.innerHTML = `🔄 Analyzing Lagos market for ${drug.name}...`;

    try {
        const response = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        content.innerHTML = `<strong>✨ Staff Clinical Advice</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) { content.innerHTML = "⚠️ AI Error: " + err.message; }
};

window.addToPOSCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p || p.stock <= 0) return alert("Out of stock!");
    const ex = posCart.find(x => x.id === id);
    if (ex) ex.qty++; else posCart.push({ ...p, qty: 1 });
    window.updatePOSUI();
};

window.updatePOSUI = () => {
    const container = document.getElementById('pos-cart-items');
    container.innerHTML = posCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
    document.getElementById('pos-total').innerText = "₦" + posCart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString();
    window.validatePOS();
};

window.validatePOS = () => {
    const total = posCart.reduce((a, b) => a + (b.price * b.qty), 0);
    const sum = (parseFloat(document.getElementById('pay-cash').value) || 0) + (parseFloat(document.getElementById('pay-transfer').value) || 0) + (parseFloat(document.getElementById('pay-card').value) || 0);
    const btn = document.getElementById('btn-checkout-pos');
    btn.disabled = (total <= 0 || sum < total);
    btn.style.opacity = btn.disabled ? "0.5" : "1";
};

window.handleExcelUpload = (i) => { /* logic stays same */ };
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    document.getElementById('stat-count').innerText = products.length;
}

init();

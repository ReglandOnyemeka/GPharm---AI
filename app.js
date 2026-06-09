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

// --- INITIALIZE ---
async function init() {
    await loadData();
    // Live Cloud Sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
        if (error) throw error;
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) { renderPOS(); updateInsights(); }
    } catch (e) {
        console.error("DB Load Error:", e.message);
    }
}

// --- STOREFRONT CART ---
window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

window.updateCartUI = function() {
    const bar = document.getElementById('public-cart-bar');
    if (publicCart.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = publicCart.reduce((a,b)=>a+b.qty, 0);
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString();
    } else { bar.style.display = 'none'; }
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const addr = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !addr) return alert("Fill all 11-digit Lagos details.");

    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name} (x${i.qty})`).join('\n') + `\n\nTotal: ₦${publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()}\nRecipient: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

// --- MANUAL STOCK ENTRY (Fixed ID Logic) ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const api = document.getElementById('m-api').value;
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("Name and Price required.");

    // NOTE: We do NOT send 'id' because Supabase generates it automatically
    const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);

    if (error) {
        alert("❌ Error: " + error.message);
    } else {
        alert("✅ " + name + " added to Cloud!");
        window.closeModal('modal-add');
        loadData();
    }
};

// --- POS CHECKOUT ---
window.checkoutPOS = async function() {
    try {
        for (let item of posCart) {
            await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
        }
        alert("✅ Sale Complete & Synced!");
        posCart = []; window.updatePOSUI(); loadData();
    } catch (e) { alert("POS Error: " + e.message); }
};

// --- UI HELPERS ---
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

window.renderPOS = (f="") => { 
    const grid = document.getElementById('pos-grid');
    if(!grid) return;
    grid.innerHTML = products.filter(p=>p.name.toLowerCase().includes(f.toLowerCase())).map(p=>`<div class="card" onclick="window.addToPOSCart(${p.id})"><h3>${p.name}</h3><div class="price">₦${p.price}</div></div>`).join('');
};

window.addToPOSCart = (id) => {
    const p = products.find(x=>x.id===id);
    const ex = posCart.find(x=>x.id===id);
    if(ex) ex.qty++; else posCart.push({...p, qty:1});
    window.updatePOSUI();
};

window.updatePOSUI = () => {
    document.getElementById('pos-total').innerText = "₦" + posCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString();
    document.getElementById('pos-cart-items').innerHTML = posCart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
    window.validatePOS();
};

window.validatePOS = () => {
    const total = posCart.reduce((a,b)=>a+(b.price*b.qty),0);
    const sum = (parseFloat(document.getElementById('pay-cash').value) || 0) + (parseFloat(document.getElementById('pay-transfer').value) || 0) + (parseFloat(document.getElementById('pay-card').value) || 0);
    const btn = document.getElementById('btn-checkout-pos');
    btn.disabled = (total <= 0 || sum < total);
    btn.style.opacity = btn.disabled ? 0.5 : 1;
};

window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Code:");
        if (code === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout Admin"; window.showView('admin'); }
    } else { isAdminMode = false; document.getElementById('nav-btn-admin').innerText = "Pharmacy Login"; window.showView('home'); }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    if (view === 'admin') window.switchAdminTab('pos'); else window.renderPublic();
};

window.switchAdminTab = (tab) => {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('tab-pos').className = (tab === 'pos' ? 'active' : '');
    document.getElementById('tab-inv').className = (tab === 'inv' ? 'active' : '');
    isAdminMode ? renderAdmin() : renderPublic();
};

window.triggerAI = async function(id) {
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');
    banner.style.display = 'block';
    content.innerHTML = `🔄 analyzing Lagos market for ${drug.name}...`;
    try {
        const res = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await res.json();
        content.innerHTML = `<strong>✨ Staff Advice:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (e) { content.innerHTML = "⚠️ AI offline."; }
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => document.getElementById('modal-checkout').style.display = 'flex';

init();

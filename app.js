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

async function init() {
    console.log("System Initializing...");
    await loadData();
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
    } catch (e) { console.error("Load Error:", e.message); }
}

// --- CLOUD ACTIONS ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    if (!name || isNaN(price)) return alert("⚠️ Name and Price required.");

    try {
        const { error } = await supabaseClient.from('products').insert([{ 
            name, api: document.getElementById('m-api').value, price, stock, cat: document.getElementById('m-cat').value, pom: document.getElementById('m-pom').checked 
        }]);
        if (error) throw error;
        alert("✅ Success: Added to Cloud!");
        window.closeModal('modal-add');
        loadData();
    } catch (e) { alert("❌ Error: " + e.message); }
};

window.checkoutPOS = async function() {
    try {
        for (let item of posCart) {
            await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
        }
        alert("✅ Sale Finalized!");
        posCart = []; window.updatePOSUI(); loadData();
    } catch (e) { alert("POS Error: " + e.message); }
};

// --- RENDERING ---
window.renderPublic = function(f = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge">${p.cat}</span>
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

// --- UI UTILS ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');
    banner.style.display = 'block';
    content.innerHTML = `🔄 analyzing ${drug.name}...`;
    try {
        const res = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await res.json();
        content.innerHTML = `<strong>✨ AI Staff Advice</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (e) { content.innerHTML = "⚠️ AI offline. Check Credits/Billing."; }
};

window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
    alert("Added to cart");
};

window.updateCartUI = () => {
    const bar = document.getElementById('public-cart-bar');
    if (publicCart.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = publicCart.length;
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a,b)=>a+b.price,0).toLocaleString();
    } else bar.style.display = 'none';
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    if (!name || phone.length !== 11) return alert("Enter receiver name and 11-digit Lagos phone.");
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent("*GPHARM ORDER*\n" + publicCart.map(i=>"• "+i.name).join("\n"))}`);
};

window.handleLogin = function() {
    const code = prompt("Pharmacy Code:");
    if (code === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout"; window.showView('admin'); }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    isAdminMode ? renderAdmin() : renderPublic();
};

window.switchAdminTab = (tab) => {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    isAdminMode ? renderAdmin() : renderPublic();
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => document.getElementById('modal-checkout').style.display = 'flex';
window.addToPOSCart = (id) => { const p = products.find(x=>x.id===id); posCart.push({...p, qty:1}); window.updatePOSUI(); };
window.updatePOSUI = () => { document.getElementById('pos-total').innerText = "₦" + posCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString(); window.validatePOS(); };
window.validatePOS = () => { document.getElementById('btn-checkout-pos').disabled = false; document.getElementById('btn-checkout-pos').style.opacity = 1; };
function updateInsights() { document.getElementById('stat-total').innerText = "₦" + (products.reduce((a,b)=>a+(b.price*b.stock),0)/1000).toFixed(1) + "k"; }

init();

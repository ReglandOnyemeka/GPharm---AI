/**
 * GPharm AI Lagos — Cloud Sync Engine (Updated for 'sb_' Keys)
 */

const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH'; // <--- Paste your sb_ key here
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let posCart = [];
let isAdminMode = false;

// --- 1. INITIALIZATION ---
async function init() {
    await loadData();
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? window.renderAdmin() : window.renderPublic();
        if (isAdminMode) window.renderPOS();
    }
}

// --- 2. STAFF POS LOGIC ---
window.renderPOS = function(filter = "") {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:${p.stock < 10 ? 'red' : 'green'}; font-weight:700;">Stock: ${p.stock}</div>
            <h3 style="font-size:1rem; margin:5px 0;">${p.name}</h3>
            <div class="price" style="font-size:1.1rem;">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="event.stopPropagation(); window.triggerAI(${p.id})">AI Check</button>
        </div>
    `).join('');
};

window.addToPOSCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p || p.stock <= 0) return alert("Out of stock!");
    const ex = posCart.find(x => x.id === id);
    if (ex) ex.qty++; else posCart.push({ ...p, qty: 1 });
    window.updatePOSUI();
};

window.updatePOSUI = () => {
    const total = posCart.reduce((a, b) => a + (b.price * b.qty), 0);
    document.getElementById('pos-total').innerText = "₦" + total.toLocaleString();
    document.getElementById('pos-cart-list').innerHTML = posCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
    window.validatePOS();
};

window.validatePOS = () => {
    const total = posCart.reduce((a, b) => a + (b.price * b.qty), 0);
    const sum = (parseFloat(document.getElementById('pay-cash').value) || 0) + (parseFloat(document.getElementById('pay-transfer').value) || 0) + (parseFloat(document.getElementById('pay-card').value) || 0);
    const btn = document.getElementById('btn-pos-checkout');
    btn.disabled = (total <= 0 || sum < total);
    btn.style.opacity = btn.disabled ? 0.5 : 1;
};

window.checkoutPOS = async function() {
    for (let item of posCart) {
        await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
    }
    alert("✅ SUCCESS: Sale finalized and cloud synced.");
    posCart = []; window.updatePOSUI(); loadData();
};

// --- 3. BULK EXCEL UPLOAD ---
window.handleExcelUpload = function(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const uploads = rows.map(r => ({
            name: r.Name || r.name, api: r.API || r.api, cat: r.Category || "General",
            price: parseInt(r.Price || 0), stock: parseInt(r.Quantity || 0), pom: (r.POM === "Yes")
        }));
        const { error } = await supabaseClient.from('products').insert(uploads);
        if (!error) { alert(`✅ SUCCESS: ${uploads.length} drugs synced to cloud!`); loadData(); }
        else { alert("Database error: " + error.message); }
    };
    reader.readAsArrayBuffer(file);
};

// --- 4. STAFF AUTH & TABS ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout Admin"; window.showView('admin'); }
    } else { isAdminMode = false; document.getElementById('nav-btn-admin').innerText = "Pharmacy Login"; window.showView('home'); }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    if (view === 'admin') window.switchStaffTab('pos'); else window.renderPublic();
};

window.switchStaffTab = function(tab) {
    document.getElementById('staff-pos-section').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('staff-inv-section').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('btn-tab-pos').classList.toggle('active', tab === 'pos');
    document.getElementById('btn-tab-inv').classList.toggle('active', tab === 'inv');
    if(tab === 'inv') window.renderInventory(); else window.renderPOS();
};

// --- 5. RENDERERS & AI ---
window.renderPublic = function(f = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge" style="font-size:0.6rem; font-weight:700; color:#888;">${p.cat}</span>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.renderAdmin = () => { window.renderInventory(); };

window.renderInventory = () => {
    const tbody = document.getElementById('inventory-tbody');
    if(tbody) tbody.innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api}</td><td>₦${p.price.toLocaleString()}</td><td style="color:${p.stock < 10 ? 'red' : 'green'}; font-weight:700;">${p.stock}</td></tr>`).join('');
};

window.triggerAI = async function(id) {
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
    } catch (e) { content.innerHTML = "⚠️ AI offline."; }
};

// --- 6. MANUAL ENTRY & UTILS ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    if (!name || isNaN(price)) return alert("Name and Price required.");
    const { error } = await supabaseClient.from('products').insert([{ name, api: document.getElementById('m-api').value, price, stock, cat: document.getElementById('m-cat').value, pom: document.getElementById('m-pom').checked }]);
    if (!error) { alert(`✅ SUCCESS: ${name} saved!`); window.closeModal('modal-add'); loadData(); }
};

window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (p.stock <= 0) return alert("Out of stock!");
    publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
    alert(p.name + " added to order.");
};

window.updateCartUI = () => {
    const bar = document.getElementById('public-cart-bar');
    if (publicCart.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = publicCart.length;
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a,b)=>a+b.price,0).toLocaleString();
    } else bar.style.display = 'none';
};

window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name}</span><strong>₦${i.price.toLocaleString()}</strong></div>`).join('');
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    if (!name || phone.length !== 11) return alert("Enter 11-digit Lagos phone.");
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent("*GPHARM ORDER*\n" + publicCart.map(i=>"• "+i.name).join("\n"))}`);
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();

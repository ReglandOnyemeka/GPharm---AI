/**
 * GPharm AI Lagos — Cloud Logic Engine
 */

const SUPABASE_URL = 'https://fyqtcnblyhknaiemxwrr.supabase.co';
const SUPABASE_KEY = 'sb_secret_Uy6SjTFDCgn5rXsKJ035lQ_Bcj9oQV6';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let posCart = [];
let isAdminMode = false;

// --- 2. INITIALIZATION ---
async function init() {
    console.log("GPharm Syncing...");
    await loadData();
    // Real-time Cloud Sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (error) {
        console.error("Supabase Error:", error.message);
    } else {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) { renderPOS(); updateInsights(); }
    }
}

// --- 3. FIX: MANUAL & BULK STOCK ENTRY ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const api = document.getElementById('m-api').value;
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("⚠️ Please enter Brand Name and Price.");

    try {
        const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);
        if (error) throw error;
        
        alert(`✅ SUCCESS: ${name} is now live in Cloud Inventory!`);
        window.closeModal('modal-add');
        loadData();
    } catch (e) {
        alert("❌ DATABASE ERROR: " + e.message + "\n\nMake sure RLS is DISABLED in Supabase.");
    }
};

window.handleExcelUpload = function(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const uploads = rows.map(r => ({
                name: r.Name || r.name, api: r.API || r.api, cat: r.Category || "General",
                price: parseInt(r.Price || 0), stock: parseInt(r.Quantity || 0), pom: (r.POM === "Yes")
            }));
            const { error } = await supabaseClient.from('products').insert(uploads);
            if (error) throw error;
            alert(`✅ BULK SUCCESS: ${uploads.length} drugs uploaded!`);
            loadData();
        } catch (err) { alert("❌ Excel Sync Failed: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
};

// --- 4. FIX: AI CONSULT ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');

    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth' });
    content.innerHTML = `🔄 Analyzing Lagos market data for ${drug.name}...`;

    try {
        const response = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        content.innerHTML = `<strong>✨ AI Clinical Advice</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) {
        content.innerHTML = `⚠️ <strong>AI Offline:</strong> ${err.message}. Ensure OpenAI credits are > $0.`;
    }
};

// --- 5. RENDERERS & POS ---
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
    grid.innerHTML = products.filter(p=>p.name.toLowerCase().includes(f.toLowerCase())).map(p=>`
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem;">Stock: ${p.stock}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price}</div>
        </div>`).join('');
};

// --- STAFF TOOLS ---
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
    if (view === 'admin') window.switchAdminTab('pos'); else window.renderPublic();
};

window.switchAdminTab = (tab) => {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('tab-pos').className = (tab === 'pos' ? 'active' : '');
    document.getElementById('tab-inv').className = (tab === 'inv' ? 'active' : '');
    isAdminMode ? renderAdmin() : renderPublic();
};

// --- CART & POS ENGINE ---
window.addToPOSCart = (id) => {
    const p = products.find(x=>x.id===id);
    if (!p || p.stock <= 0) return alert("Out of stock!");
    const ex = posCart.find(x=>x.id===id);
    if (ex) ex.qty++; else posCart.push({...p, qty:1});
    window.updatePOSUI();
};

window.updatePOSUI = () => {
    const container = document.getElementById('pos-cart-items');
    container.innerHTML = posCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
    document.getElementById('pos-total').innerText = "₦" + posCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString();
    window.validatePOS();
};

window.validatePOS = () => {
    const total = posCart.reduce((a,b)=>a+(b.price*b.qty),0);
    const sum = (parseFloat(document.getElementById('pay-cash').value) || 0) + (parseFloat(document.getElementById('pay-transfer').value) || 0) + (parseFloat(document.getElementById('pay-card').value) || 0);
    const btn = document.getElementById('btn-checkout-pos');
    btn.disabled = (total <= 0 || sum < total);
    btn.style.opacity = btn.disabled ? 0.5 : 1;
};

window.checkoutPOS = async function() {
    for (let item of posCart) {
        await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
    }
    alert("✅ SUCCESS: Sale synchronized across all APKs.");
    posCart = []; window.updatePOSUI(); loadData();
};

window.addToPublicCart = (id) => {
    const p = products.find(x=>x.id===id);
    publicCart.push({...p, qty:1});
    window.updateCartUI();
    alert("Added " + p.name + " to cart.");
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
    alert("✅ SUCCESS: Order generated. Opening WhatsApp.");
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent("*GPHARM ORDER*\n" + publicCart.map(i=>"• "+i.name).join("\n"))}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name}</span><strong>₦${i.price.toLocaleString()}</strong></div>`).join('');
};

init();

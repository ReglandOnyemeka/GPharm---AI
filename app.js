/**
 * GPharm AI Lagos - Robust Cloud Engine
 */

const SUPABASE_URL = 'https://fyqtcnblyhknaiemxwrr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3JLIN7jRvr4pFBCy8vZykw_dfbHVyBT'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let posCart = [];
let isAdminMode = false;

// --- 1. INITIALIZE ---
async function init() {
    await loadData();
    // Live Cloud Sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    
    // Search listener for public
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) renderPOS();
    }
}

// --- 2. ADMIN NAVIGATION ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            window.showView('admin');
        } else { alert("❌ Access Denied"); }
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
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    if (view === 'admin') window.switchAdminTab('pos'); else renderPublic();
};

window.switchAdminTab = function(tab) {
    document.getElementById('admin-pos-view').style.display = (tab === 'pos' ? 'block' : 'none');
    document.getElementById('admin-inv-view').style.display = (tab === 'inv' ? 'block' : 'none');
    document.getElementById('admin-nav-pos').classList.toggle('active', tab === 'pos');
    document.getElementById('admin-nav-inv').classList.toggle('active', tab === 'inv');
    if(tab === 'inv') renderInventory(); else renderPOS();
};

// --- 3. POS SYSTEM LOGIC ---
window.renderPOS = function(filter = "") {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const filtered = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    grid.innerHTML = filtered.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock}</div>
            <h3 style="font-size:1rem;">${p.name}</h3>
            <div class="price" style="font-size:1.1rem;">₦${p.price.toLocaleString()}</div>
        </div>
    `).join('');
};

window.addToPOSCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p || p.stock <= 0) return alert("Out of stock!");
    const ex = posCart.find(x => x.id === id);
    if (ex) ex.qty++; else posCart.push({ ...p, qty: 1 });
    window.updatePOSUI();
};

window.updatePOSUI = function() {
    const container = document.getElementById('pos-cart-items');
    let total = 0;
    container.innerHTML = posCart.map(i => {
        total += (i.price * i.qty);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`;
    }).join('');
    document.getElementById('pos-total').innerText = "₦" + total.toLocaleString();
    window.validatePOS();
};

window.validatePOS = function() {
    const total = posCart.reduce((a, b) => a + (b.price * b.qty), 0);
    const cash = parseFloat(document.getElementById('pay-cash').value) || 0;
    const transfer = parseFloat(document.getElementById('pay-transfer').value) || 0;
    const card = parseFloat(document.getElementById('pay-card').value) || 0;
    const btn = document.getElementById('btn-checkout-pos');
    
    btn.disabled = (total <= 0 || (cash + transfer + card) < total);
    btn.style.opacity = btn.disabled ? "0.5" : "1";
};

window.checkoutPOS = async function() {
    for (let item of posCart) {
        const { error } = await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
    }
    alert("✅ Sale Finalized. Inventory synced.");
    posCart = []; window.updatePOSUI();
};

// --- 4. BULK EXCEL UPLOAD ---
window.handleExcelUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const uploads = rows.map(r => ({
            name: r.Name || r.name,
            api: r.API || r.api,
            cat: r.Category || r.category || "General",
            price: parseInt(r.Price || r.price || 0),
            stock: parseInt(r.Quantity || r.stock || 0),
            pom: (r.POM === "Yes" || r.pom === "yes")
        }));

        const { error } = await supabaseClient.from('products').insert(uploads);
        if (error) alert("Excel Error: " + error.message);
        else { alert("✅ Successfully imported " + uploads.length + " items!"); loadData(); }
    };
    reader.readAsArrayBuffer(file);
};

// --- 5. STOREFRONT & CART ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const filtered = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <small class="cat">${p.cat}</small>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

window.updateCartUI = function() {
    const bar = document.getElementById('public-cart-bar');
    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    const sum = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = count;
        document.getElementById('cart-sum').innerText = "₦" + sum.toLocaleString();
    } else { bar.style.display = 'none'; }
};

window.openPublicCart = function() {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    if (!name || phone.length !== 11) return alert("Fill all 11-digit Lagos details.");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name} (x${i.qty})`).join('\n');
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
};

// --- 6. MANUAL ENTRY & UTILS ---
window.saveManualProduct = async function() {
    const newProd = {
        name: document.getElementById('m-name').value,
        api: document.getElementById('m-api').value,
        cat: document.getElementById('m-cat').value,
        price: parseInt(document.getElementById('m-price').value),
        stock: parseInt(document.getElementById('m-stock').value),
        pom: document.getElementById('m-pom').checked
    };
    const { error } = await supabaseClient.from('products').insert([newProd]);
    if (error) alert(error.message); else { window.closeModal('modal-add'); loadData(); }
};

function renderInventory() {
    document.getElementById('inventory-table-body').innerHTML = products.map(p => `<tr><td>${p.name}</td><td>${p.api}</td><td>${p.cat}</td><td>₦${p.price}</td><td>${p.stock}</td></tr>`).join('');
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();

/**
 * GPharm AI Lagos - Robust Cloud Engine
 */

// 1. CONFIG (Replace KEY with your eyJ... string)
const SUPABASE_URL = 'https://fyqtcnblyhknaiemxwrr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3JLIN7jRvr4pFBCy8vZykw_dfbHVyBT'; 

// Initialize Supabase safely
let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    alert("Supabase Library Error: Check index.html script tags.");
}

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// 2. INITIALIZE
async function init() {
    await loadData();
    
    // Search Listener
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.renderPublic(e.target.value);
        });
    }
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (error) {
        console.error("Load Error:", error.message);
        return;
    }
    products = data || [];
    isAdminMode ? window.renderAdmin() : window.renderPublic();
}

// 3. GLOBAL FUNCTIONS (Attached to window for HTML access)
window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    isAdminMode ? window.renderAdmin() : window.renderPublic();
};

window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Staff Access Code:");
        if (code === "1234") window.showView('admin');
        else alert("Invalid Code");
    } else {
        window.showView('home');
    }
};

window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const filtered = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;">No results found.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <small style="color:var(--green-mid); font-weight:700;">${p.cat || 'MEDICINE'}</small>
            <h3>${p.name}</h3>
            <div class="price">₦${(p.price || 0).toLocaleString()}</div>
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
        </div>
    `).join('');
    // Update simple stats
    document.getElementById('stat-total').innerText = "₦" + (products.reduce((a,b)=>a+(b.price*b.stock),0)/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p=>p.stock < 10).length;
};

window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);

    if (!name || isNaN(price)) { alert("Enter Name and Price"); return; }

    const { error } = await supabaseClient.from('products').insert([{ 
        name, 
        api: document.getElementById('m-api').value, 
        price, 
        stock, 
        cat: 'General' 
    }]);

    if (error) alert("Error: " + error.message);
    else { alert("Saved!"); window.closeModal('modal-add'); loadData(); }
};

window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

window.updateCartUI = function() {
    const bar = document.getElementById('public-cart-bar');
    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = count;
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString();
    } else { bar.style.display = 'none'; }
};

window.openPublicCart = () => document.getElementById('modal-checkout').style.display = 'flex';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    if (!name || phone.length !== 11) return alert("Enter receiver name and 11-digit Lagos phone.");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i=>`• ${i.name} (x${i.qty})`).join('\n');
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
};

init();

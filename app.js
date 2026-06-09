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
    await loadData();
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

// --- SUBMISSIONS & SUCCESS MESSAGES ---

window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("⚠️ Name and Price are required.");

    const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);
    if (error) {
        alert("❌ Error: " + error.message);
    } else {
        alert(`✅ SUCCESS: ${name} added to Cloud Inventory!`);
        window.closeModal('modal-add');
        loadData();
    }
};

window.handleExcelUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type: 'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const uploads = rows.map(r => ({
            name: r.Name || r.name, api: r.API || r.api,
            cat: r.Category || r.category || "General",
            price: parseInt(r.Price || r.price || 0),
            stock: parseInt(r.Quantity || r.stock || 0),
            pom: (r.POM === "Yes" || r.pom === "yes")
        }));
        const { error } = await supabaseClient.from('products').insert(uploads);
        if (error) alert(error.message); 
        else { alert(`✅ BULK SUCCESS: ${uploads.length} items imported!`); loadData(); }
    };
    reader.readAsArrayBuffer(file);
};

window.checkoutPOS = async function() {
    for (let item of posCart) {
        await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
    }
    alert("✅ TRANSACTION COMPLETE: Inventory updated.");
    posCart = []; window.updatePOSUI(); loadData();
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const addr = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !addr) return alert("Fill all details.");
    
    alert("✅ ORDER READY: Opening WhatsApp...");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name} (x${i.qty})`).join('\n');
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

// --- RENDERING & NAVIGATION ---

window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    const tbody = document.getElementById('inventory-tbody'); // FIXED ID
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
        tbody.innerHTML = products.map(p => `<tr><td>${p.name}</td><td>${p.api}</td><td>₦${p.price}</td><td>${p.stock}</td></tr>`).join('');
    }
    updateInsights();
};

window.triggerAI = async function(id) {
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');
    banner.style.display = 'block';
    content.innerHTML = `🔄 Analyzing ${drug.name}...`;

    try {
        const response = await fetch('/api/ai-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Result:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) { content.innerHTML = "⚠️ AI offline. Check Render Env Variables."; }
};

window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Code:");
        if (code === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout"; window.showView('admin'); }
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

// --- STUBS FOR MISSING FUNCTIONS ---
window.renderPOS = (f="") => { 
    const grid = document.getElementById('pos-grid');
    if(!grid) return;
    grid.innerHTML = products.filter(p=>p.name.toLowerCase().includes(f.toLowerCase())).map(p=>`<div class="card" onclick="window.addToPOSCart(${p.id})"><h3>${p.name}</h3><div class="price">₦${p.price}</div></div>`).join('');
};
window.addToPOSCart = (id) => { const p = products.find(x=>x.id===id); posCart.push({...p, qty:1}); window.updatePOSUI(); };
window.updatePOSUI = () => { document.getElementById('pos-total').innerText = "₦" + posCart.reduce((a,b)=>a+(b.price*b.qty),0); window.validatePOS(); };
window.validatePOS = () => { document.getElementById('btn-checkout-pos').disabled = false; document.getElementById('btn-checkout-pos').style.opacity = 1; };
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => document.getElementById('modal-checkout').style.display = 'flex';
function updateInsights() { document.getElementById('stat-total').innerText = "₦" + (products.reduce((a,b)=>a+(b.price*b.stock),0)/1000).toFixed(1) + "k"; }
function renderPublic(f="") { 
    const grid = document.getElementById('public-grid');
    if(!grid) return;
    grid.innerHTML = products.filter(p=>p.name.toLowerCase().includes(f.toLowerCase())).map(p=>`<div class="card"><h3>${p.name}</h3><div class="price">₦${p.price}</div><button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Order</button></div>`).join('');
}
window.addToPublicCart = (id) => { const p = products.find(x=>x.id===id); publicCart.push({...p, qty:1}); window.updateCartUI(); };
window.updateCartUI = () => { document.getElementById('public-cart-bar').style.display = 'flex'; document.getElementById('cart-count').innerText = publicCart.length; };

init();

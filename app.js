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

// --- 2. INITIALIZATION ---
async function init() {
    console.log("GPharm Engine: Connecting to Lagos Cloud...");
    await loadData();
    
    // Live Cloud Sync: Updates screen instantly if data changes on another device
    supabaseClient.channel('any').on('postgres_changes', { 
        event: '*', schema: 'public', table: 'products' 
    }, () => {
        loadData();
    }).subscribe();

    // Attach Search listener for the MyPharmacy Storefront
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderPublic(e.target.value));
    }

    if (document.getElementById('footer-year')) {
        document.getElementById('footer-year').innerText = new Date().getFullYear();
    }
}

async function loadData() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) {
            renderPOS();
            updateInsights();
        }
    } else {
        console.error("Supabase Connection Error:", error.message);
    }
}

// --- 3. AI CONSULT (OPENAI / RENDER BACKEND) ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return; // Locked to Staff Only

    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');

    if (!banner) return;
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    content.innerHTML = `<p style="padding:10px;">🔄 <strong>GPharm AI</strong> is generating clinical & market intelligence for ${drug.name}...</p>`;

    try {
        // Calls the OpenAI bridge in your server.js
        const response = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                drugName: drug.name, 
                api: drug.api, 
                category: drug.cat 
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            content.innerHTML = `<div style="color:red;">⚠️ AI Error: ${data.error}</div>`;
        } else {
            // OpenAI response comes with <br> tags from our server.js prompt
            content.innerHTML = `
                <div style="line-height:1.6; color:#1a1c1a;">
                    <h4 style="color:var(--ai-purple); margin-bottom:10px;">✨ Professional Clinical Consult</h4>
                    ${data.result}
                </div>
            `;
        }
    } catch (err) {
        content.innerHTML = "⚠️ AI offline. Ensure Render environment variable 'OPENAI_API_KEY' is set.";
    }
};

// --- 4. STAFF AUTH & TABS ---
window.handleLogin = function() {
    const loginBtn = document.getElementById('nav-btn-admin');
    if (!isAdminMode) {
        const code = prompt("GPharm Staff Access\nEnter 4-digit code:");
        if (code === "1234") {
            isAdminMode = true;
            loginBtn.innerText = "Logout Admin";
            loginBtn.classList.add('active');
            window.showView('admin');
        } else { alert("❌ Access Denied."); }
    } else {
        isAdminMode = false;
        loginBtn.innerText = "Pharmacy Login";
        loginBtn.classList.remove('active');
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

// --- 5. STOCK SUBMISSIONS & EXCEL ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price) || isNaN(stock)) return alert("⚠️ Name, Price, and Stock are required.");

    try {
        const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);
        if (error) throw error;
        
        alert(`✅ SUCCESS: ${name} saved to Cloud Database.`);
        window.closeModal('modal-add');
        loadData();
    } catch (err) { alert("❌ Sync Error: " + err.message); }
};

window.handleExcelUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const uploads = rows.map(r => ({
                name: r.Name || r.name, api: r.API || r.api, cat: r.Category || "General",
                price: parseInt(r.Price || 0), stock: parseInt(r.Quantity || r.Stock || 0), pom: (r.POM === "Yes")
            }));
            const { error } = await supabaseClient.from('products').insert(uploads);
            if (error) throw error;
            alert(`✅ BULK SUCCESS: ${uploads.length} items imported.`);
            loadData();
        } catch (err) { alert("❌ Excel Error: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
};

// --- 6. POS & CHECKOUT ---
window.renderPOS = function(filter = "") {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:${p.stock < 10 ? 'red' : 'green'}; font-weight:bold;">Stock: ${p.stock}</div>
            <h3 style="font-size:1.1rem; margin:5px 0;">${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="event.stopPropagation(); window.triggerAI(${p.id})">AI Market Check</button>
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

window.checkoutPOS = async function() {
    try {
        for (let item of posCart) {
            await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
        }
        alert("✅ TRANSACTION SUCCESSFUL: Inventory updated across all APKs.");
        posCart = []; window.updatePOSUI(); loadData();
    } catch (err) { alert("❌ Error finalizing sale."); }
};

// --- 7. PUBLIC STOREFRONT ---
window.renderPublic = function(f = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(f.toLowerCase()));
    
    if (items.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; opacity:0.5;">No medications found. Try searching for a molecule.</div>`;
        return;
    }

    grid.innerHTML = items.map(p => `
        <div class="card">
            <span class="badge" style="font-size:0.6rem; font-weight:700; color:#888;">${p.cat} ${p.pom ? '• 🔴 POM' : ''}</span>
            <h3>${p.name}</h3>
            <p class="api-text">${p.api || ''}</p>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (p.stock <= 0) return alert("Out of stock.");
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
    alert("Added " + p.name + " to cart.");
};

window.updateCartUI = () => {
    const bar = document.getElementById('public-cart-bar');
    if (publicCart.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = publicCart.reduce((a,b)=>a+b.qty, 0);
        document.getElementById('cart-sum').innerText = "₦" + publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString();
    } else bar.style.display = 'none';
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const addr = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !addr) return alert("Please fill Lagos delivery details.");
    
    alert("✅ SUCCESS: Order generated. Opening WhatsApp.");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name} (x${i.qty})`).join('\n') + `\n\nTotal: ₦${publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()}\nRecipient: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

// --- 8. UTILS ---
window.renderInventory = () => {
    document.getElementById('inventory-tbody').innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api}</td><td>₦${p.price.toLocaleString()}</td><td style="font-weight:700; color:${p.stock < 10 ? 'red' : 'green'};">${p.stock}</td></tr>`).join('');
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    document.getElementById('stat-count').innerText = products.length;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
window.openPublicCart = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

init();

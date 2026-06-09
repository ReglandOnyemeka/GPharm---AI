/**
 * GPharm AI Lagos — Cloud Logic Engine
 */

const SUPABASE_URL = 'https://fyqtcnblyhknaiemxwrr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3JLIN7jRvr4pFBCy8vZykw_dfbHVyBT';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- 2. INITIALIZATION ---
async function init() {
    await loadData();
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    
    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (error) {
        console.error("Supabase Load Error:", error.message);
    } else {
        products = data || [];
        isAdminMode ? window.renderAdmin() : window.renderPublic();
    }
}

// --- 3. THE "SAVE TO CLOUD" FIX ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const api = document.getElementById('m-api').value.trim();
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price)) return alert("⚠️ Please enter Brand Name and Price.");

    try {
        const { error } = await supabaseClient
            .from('products')
            .insert([{ name, api, price, stock, cat, pom }]);

        if (error) {
            alert("❌ CLOUD ERROR: " + error.message + "\n\nTip: Make sure you Disabled RLS in Supabase SQL Editor.");
        } else {
            alert("✅ SUCCESS: " + name + " saved to Cloud Database.");
            window.closeModal('modal-add');
            // Clear inputs
            document.getElementById('m-name').value = "";
            document.getElementById('m-price').value = "";
            await loadData(); 
        }
    } catch (e) {
        alert("❌ CRASH: " + e.message);
    }
};

// --- 4. THE "AI CONSULT" FIX ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');

    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth' });
    content.innerHTML = `🔄 <strong>GPharm AI</strong> is analyzing Lagos market for ${drug.name}...`;

    try {
        const response = await fetch(`${window.location.origin}/api/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat })
        });
        
        const data = await response.json();
        
        if (data.error) {
            content.innerHTML = `⚠️ <strong>AI Error:</strong> ${data.error}`;
        } else {
            content.innerHTML = `<div>${data.result.replace(/\n/g, '<br>')}</div>`;
        }
    } catch (err) {
        content.innerHTML = "⚠️ <strong>AI Offline:</strong> Ensure OPENAI_API_KEY is in Render and you have credits.";
    }
};

// --- 5. NAVIGATION & UI ---
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

// --- 6. RENDERERS ---
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

window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
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
    window.renderInventory();
    window.updateInsights();
};

window.renderInventory = () => {
    const tbody = document.getElementById('inventory-tbody');
    if(tbody) tbody.innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api}</td><td>₦${p.price.toLocaleString()}</td><td>${p.stock}</td></tr>`).join('');
};

// --- 7. CART UTILS ---
window.addToPublicCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
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
    if (!name || phone.length !== 11) return alert("Fill receiver name and 11-digit Lagos phone.");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name}`).join('\n');
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';
function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    document.getElementById('stat-count').innerText = products.length;
}

init();

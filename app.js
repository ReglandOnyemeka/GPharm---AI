/**
 * GPharm AI Lagos — Cloud Logic Engine
 */

const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let posCart = [];
let isAdminMode = false;

// --- 2. INITIALIZATION ---
async function init() {
    await loadData();
    // Live Cloud Sync for all devices
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
    }).subscribe();

    const searchIn = document.getElementById('input-search-public');
    if (searchIn) searchIn.addEventListener('input', (e) => window.renderPublic(e.target.value));
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
        if (isAdminMode) renderPOS();
    }
}

// --- 3. AI CONSULT (FIXING "AI OFFLINE") ---
window.triggerAI = async function(id) {
    if (!isAdminMode) return;
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById('ai-banner-admin');
    const content = document.getElementById('ai-content-admin');
    
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    content.innerHTML = `<p style="padding:10px;">🔄 <strong>GPharm AI</strong> is analyzing molecules for ${drug.name}...</p>`;

    try {
        // We use window.location.origin to ensure it hits the Render server correctly
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
            content.innerHTML = `⚠️ <strong>AI Service Error:</strong> ${data.error}`;
        } else {
            content.innerHTML = `
                <div style="line-height:1.6;">
                    <h4 style="color:var(--ai-purple); margin-bottom:8px;">✨ Clinical & Market Advice</h4>
                    ${data.result.replace(/\n/g, '<br>')}
                </div>
            `;
        }
    } catch (err) {
        content.innerHTML = "⚠️ <strong>AI Offline:</strong> Could not connect to the Render backend service.";
        console.error("AI Error:", err);
    }
};

// --- 4. STAFF NAVIGATION ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            document.getElementById('nav-btn-admin').classList.add('active');
            window.showView('admin');
        } else { alert("❌ Invalid Code."); }
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

// --- 5. POS SYSTEM ---
window.renderPOS = function(filter = "") {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card" onclick="window.addToPOSCart(${p.id})">
            <div style="font-size:0.7rem; color:${p.stock < 10 ? 'red' : 'green'}; font-weight:bold;">Stock: ${p.stock}</div>
            <h3 style="font-size:1.1rem; margin:5px 0;">${p.name}</h3>
            <div class="price" style="font-size:1.1rem;">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="event.stopPropagation(); window.triggerAI(${p.id})">AI Market Check</button>
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
        return `<div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f0f0f0; padding-bottom:5px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`;
    }).join('');
    document.getElementById('pos-total').innerText = "₦" + total.toLocaleString();
    window.validatePOS();
};

window.validatePOS = function() {
    const total = posCart.reduce((a, b) => a + (b.price * b.qty), 0);
    const sum = (parseFloat(document.getElementById('pay-cash').value) || 0) + (parseFloat(document.getElementById('pay-transfer').value) || 0) + (parseFloat(document.getElementById('pay-card').value) || 0);
    const btn = document.getElementById('btn-checkout-pos');
    btn.disabled = (total <= 0 || sum < total);
    btn.style.opacity = btn.disabled ? "0.5" : "1";
};

window.checkoutPOS = async function() {
    for (let item of posCart) {
        await supabaseClient.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
    }
    alert("✅ Sale Finalized. Inventory synced across all devices.");
    posCart = []; window.updatePOSUI();
};

// --- 6. INVENTORY & EXCEL ---
window.handleExcelUpload = function(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type: 'array'});
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
        if (error) alert(error.message); else { alert("✅ Excel Import Success!"); loadData(); }
    };
    reader.readAsArrayBuffer(file);
};

window.saveManualProduct = async function() {
    const newProd = {
        name: document.getElementById('m-name').value.trim(),
        api: document.getElementById('m-api').value.trim(),
        price: parseInt(document.getElementById('m-price').value),
        stock: parseInt(document.getElementById('m-stock').value),
        pom: document.getElementById('m-pom').checked,
        cat: 'General'
    };
    if (!newProd.name || isNaN(newProd.price)) return alert("Name and Price required.");
    const { error } = await supabaseClient.from('products').insert([newProd]);
    if (error) alert(error.message); else { alert("✅ Saved!"); window.closeModal('modal-add'); loadData(); }
};

window.renderInventory = function() {
    document.getElementById('inventory-tbody').innerHTML = products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.api || '-'}</td><td>₦${p.price.toLocaleString()}</td><td style="font-weight:700; color:${p.stock < 10 ? 'red' : 'green'};">${p.stock}</td></tr>`).join('');
};

// --- 7. PUBLIC FRONTEND ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    if (items.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; opacity:0.5;">No medications match your search.</div>`;
        return;
    }

    grid.innerHTML = items.map(p => `
        <div class="card">
            <span style="font-size:0.6rem; font-weight:700; color:#888;">${p.cat || 'PHARMACEUTICAL'}</span>
            <h3 style="margin:5px 0;">${p.name}</h3>
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
    } else bar.style.display = 'none';
};

window.openPublicCart = function() {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-list').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} (x${i.qty})</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const addr = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !addr) return alert("Fill all Lagos delivery details.");
    let msg = `*GPHARM LAGOS ORDER*\n` + publicCart.map(i => `• ${i.name} (x${i.qty})`).join('\n') + `\n\nTotal: ₦${publicCart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()}\nRecipient: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();

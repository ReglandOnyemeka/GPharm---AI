/**
 * GPharm AI Lagos — Logic Engine for Render
 * Features: Supabase Cloud Sync, Gemini AI Integration, WhatsApp Ordering
 */

// --- 1. CLOUD CONFIGURATION ---
const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- 2. INITIALIZATION ---
async function init() {
    console.log("GPharm Initializing on Render...");
    await loadData();
    
    // Enable Real-time listener: Updates screen automatically when DB changes
    supabaseClient.channel('any').on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'products' 
    }, () => {
        loadData();
    }).subscribe();

    // Attach Search listener for Storefront
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderPublic(e.target.value);
        });
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
        if(isAdminMode) updateInsights();
    } else {
        console.error("Supabase Error:", error.message);
    }
}

// --- 3. GLOBAL NAVIGATION & ACCESS ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("GPharm Staff Access\nEnter 4-digit code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            window.showView('admin');
        } else {
            alert("❌ Invalid Access Code.");
        }
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
    
    if (view === 'home') renderPublic(); else renderAdmin();
};

// --- 4. GEMINI AI (Render API Endpoint) ---
window.triggerAI = async function(id) {
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById(isAdminMode ? 'ai-banner-admin' : 'ai-banner-public');
    const content = document.getElementById(isAdminMode ? 'ai-content-admin' : 'ai-content-public');

    if (!banner) return;
    banner.style.display = 'block';
    content.innerHTML = `✨ Gemini AI is analyzing clinical data for ${drug.name}...`;

    try {
        // Fetch from the Render server API we created in server.js
        const response = await fetch('/api/ai-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                drugName: drug.name, 
                api: drug.api, 
                category: drug.cat, 
                task: 'recommend' 
            })
        });
        
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Consult Result:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) {
        content.innerHTML = "⚠️ AI connection interrupted. Please try again.";
        console.error("AI Error:", err);
    }
};

// --- 5. STOREFRONT RENDERING ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;

    const filtered = products.filter(p => {
        const search = filter.toLowerCase();
        return (p.name || "").toLowerCase().includes(search) || 
               (p.api || "").toLowerCase().includes(search) ||
               (p.cat || "").toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; opacity:0.5;">No medications match "<strong>${filter}</strong>"</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <span class="cat" style="font-size:0.65rem; color:var(--green-mid); font-weight:700; text-transform:uppercase;">${p.cat || 'General'}</span>
                ${p.pom ? '<span style="color:red; font-size:0.6rem; font-weight:bold;">🔴 POM</span>' : ''}
            </div>
            <h3>${p.name}</h3>
            <p class="api-text" style="font-size:0.75rem; color:#666; margin-bottom:12px;">${p.api || ''}</p>
            <div class="price">₦${(p.price || 0).toLocaleString()}</div>
            <div style="margin-top:15px;">
                <button class="btn-ai" onclick="window.triggerAI(${p.id})">Find Clinical Substitutes</button>
                <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
            </div>
        </div>
    `).join('');
};

// --- 6. PHARVENTORY RENDERING ---
window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;

    grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#888;">
                <span>ID: ${p.id}</span>
                <span style="color:${p.stock < 10 ? 'red' : 'green'}; font-weight:bold;">Stock: ${p.stock}</span>
            </div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" style="margin-top:10px;" onclick="window.triggerAI(${p.id})">AI Stock Advice</button>
        </div>
    `).join('');
    updateInsights();
};

// --- 7. CART & WHATSAPP ---
window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    
    window.updateCartUI();
    alert("Added " + p.name + " to cart");
};

window.updateCartUI = function() {
    const bar = document.getElementById('public-cart-bar');
    const countDisp = document.getElementById('cart-count');
    const sumDisp = document.getElementById('cart-sum');

    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    const sum = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);

    if (count > 0) {
        if(bar) bar.style.display = 'flex';
        if(countDisp) countDisp.innerText = count;
        if(sumDisp) sumDisp.innerText = "₦" + sum.toLocaleString();
    } else {
        if(bar) bar.style.display = 'none';
    }
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const address = document.getElementById('order-address').value;

    if (!name || phone.length !== 11 || !address) {
        return alert("Please fill 11-digit Lagos details correctly.");
    }

    let msg = `*GPHARM LAGOS ORDER*%0A`;
    publicCart.forEach(i => msg += `• ${i.name} (x${i.qty})%0A`);
    msg += `TOTAL: ₦${publicCart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString()}%0A%0A`;
    msg += `Recipient: ${name}%0APhone: ${phone}%0AAddress: ${address}`;
    
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${msg}`);
    publicCart = [];
    window.updateCartUI();
    window.closeModal('modal-checkout');
};

// --- 8. MANUAL STOCK ENTRY FIX ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price) || isNaN(stock)) {
        alert("⚠️ Please fill in Name, Price, and Stock Quantity.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('products')
            .insert([{ name, api, price, stock, cat, pom }]);
            
        if (error) throw error;

        alert("✅ " + name + " saved to cloud!");
        window.closeModal('modal-add');
        loadData(); // Refresh UI
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
};

// --- 9. ADMIN INSIGHTS ---
function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    const low = products.filter(p => p.stock < 10).length;
    
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    if(document.getElementById('stat-low')) document.getElementById('stat-low').innerText = low;
    if(document.getElementById('stat-count')) document.getElementById('stat-count').innerText = products.length;
}

// --- 10. UI UTILS ---
window.openPublicCart = function() {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-items').innerHTML = publicCart.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>${i.name} x${i.qty}</span>
            <strong>₦${(i.price*i.qty).toLocaleString()}</strong>
        </div>
    `).join('');
};

window.handleExcelUpload = (i) => {
    const f = i.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type: 'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const uploads = rows.map(row => ({
            name: row.Name || row.name,
            api: row.API || row.api,
            cat: row.Category || row.category || "General",
            price: parseInt(row.Price || row.price || 0),
            stock: parseInt(row.Quantity || row.stock || 0),
            pom: (row.POM === "Yes" || row.pom === "yes")
        }));

        const { error } = await supabaseClient.from('products').insert(uploads);
        if (error) alert("Excel Error: " + error.message);
        else { alert("Batch upload successful!"); loadData(); }
    };
    r.readAsArrayBuffer(f);
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

// START THE APP
init();

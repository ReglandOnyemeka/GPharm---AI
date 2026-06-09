// app.js
const SUPABASE_URL = https://fyqtcnblyhknaiemxwrr.supabase.co;
const SUPABASE_KEY = sb_publishable_3JLIN7jRvr4pFBCy8vZykw_dfbHVyBT; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let isAdminMode = false;

async function init() {
    console.log("App starting...");
    await loadData();
    
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderPublic(e.target.value));
    }
}

async function loadData() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            alert("❌ Supabase Load Error: " + error.message);
            return;
        }

        products = data || [];
        console.log("Database connected. Items found:", products.length);
        
        if (products.length === 0) {
            alert("⚠️ Connection successful, but the 'products' table is empty. Add a drug in Pharmacy Login.");
        }

        isAdminMode ? renderAdmin() : renderPublic();
    } catch (err) {
        alert("❌ Script Crash: " + err.message);
    }
}

window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);

    if (!name || isNaN(price)) {
        alert("⚠️ Please enter Name and Price.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('products')
            .insert([{ 
                name: name, 
                api: document.getElementById('m-api').value,
                price: price, 
                stock: stock, 
                cat: document.getElementById('m-cat').value,
                pom: document.getElementById('m-pom').checked 
            }]);

        if (error) {
            alert("❌ Insert Failed: " + error.message + "\n(Hint: Go to Supabase and Disable RLS on the products table)");
        } else {
            alert("✅ " + name + " added successfully!");
            window.closeModal('modal-add');
            await loadData();
        }
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
};

// ... Include renderPublic, renderAdmin, handleLogin, etc. as per previous versions
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const filtered = products.filter(p => (p.name + (p.api || '')).toLowerCase().includes(filter.toLowerCase()));
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;">No results. Check if table has data.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
};

window.handleLogin = function() {
    const code = prompt("Pharmacy Access Code:");
    if (code === "1234") {
        isAdminMode = true;
        document.getElementById('nav-btn-admin').innerText = "Logout";
        window.showView('admin');
    }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    isAdminMode ? renderAdmin() : renderPublic();
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();

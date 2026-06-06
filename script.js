/**
 * Carpet Manager System - Unified Version (Appliance & Category Update)
 */

// --- متغیرهای سراسری ---
let products = [];
let transactions = [];
let returns = [];
let deletedProducts = [];
let deletedTransactions = [];
let cart = [];

// نقشه دسته‌بندی‌های فارسی کالا
const categoryMap = {
    carpet: 'فرش و موکت',
    appliance: 'لوازم برقی',
    dishes: 'ظروف',
    other: 'سایر'
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. بررسی لاگین
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // 2. لود دیتا
    loadData();
    cleanupTrash();

    // 3. رندر اولیه
    updateDashboard();
    updateAccounting();
    renderInventoryTable();
    renderReturnsTable();
    renderTrash();
    populateCustomSelect();
    calculateInventoryStats();
    setupEnterNavigation();

    // 4. تاریخ
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('fa-IR', options);

    // 5. بستن دراپ‌داون با کلیک بیرون از آن
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            const list = document.getElementById('dropdownList');
            if (list) list.classList.remove('show');
        }
    });
});

// ==========================================
// 1. لاگین
// ==========================================
function checkLogin() {
    const pass = document.getElementById('loginPass').value;
    if (pass === 'mehdimoket') {
        document.getElementById('loginOverlay').style.display = 'none';
        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

// ==========================================
// 2. چاپ (لیبل و فاکتور نهایی)
// ==========================================

// چاپ لیبل کالا با تزریق گرافیکی بارکد اصلاح شده
function printLabel(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const barcodeSVG = createBarcodeSVG(product.barcode);
    const printArea = document.getElementById('printArea');
    printArea.className = 'label-mode';

    printArea.innerHTML = `
        <div class="label-container">
            <div class="label-name">${product.name}</div>
            <div class="label-brand">${product.brand || ''}</div>
            <div class="dashed-line"></div>
            <div class="label-price">${product.sellPrice.toLocaleString()}</div>
            <div class="label-unit">ریال</div>
            <div class="dashed-line"></div>
            <div class="label-name">موجودی : ${product.stock}</div>
            <div class="barcode-wrapper" style="width:100%; height:60px; margin: 10px 0;">
                ${barcodeSVG}
            </div>
            <div class="label-brand">${product.barcode}</div>
        </div>
    `;

    window.print();
    setTimeout(() => { printArea.innerHTML = ''; printArea.className = ''; }, 1000);
}

// چاپ فاکتور فروش (با اطلاعات دقیق و سایز جمع‌وجور)
function printInvoice(transId) {
    const transaction = transactions.find(t => t.id === transId);
    if (!transaction) return;

    const printArea = document.getElementById('printArea');
    printArea.className = 'invoice-mode';

    // ساخت ردیف‌های جدول فاکتور
    let itemsHtml = '';
    if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach(item => {
            let unitPrice = item.total / item.amount;
            itemsHtml += `
                <tr>
                    <td class="col-name">${item.productName}</td>
                    <td class="col-qty">${item.amount}</td>
                    <td class="col-price">${Math.round(unitPrice).toLocaleString()}</td>
                    <td class="col-total">${item.total.toLocaleString()}</td>
                </tr>
            `;
        });
    } else {
        itemsHtml += `
            <tr>
                <td class="col-name">${transaction.productName}</td>
                <td class="col-qty">${transaction.amount}</td>
                <td class="col-price">-</td>
                <td class="col-total">${transaction.totalPrice.toLocaleString()}</td>
            </tr>
        `;
    }

    printArea.innerHTML = `
        <style>
            @media print {
                @page { margin: 0; }
                body { margin: 0; padding: 0; }
            }
            .invoice-container {
                width: 72mm;
                margin: 0 auto;
                padding: 5px 2px;
                font-family: 'Tahoma', sans-serif;
                font-size: 10px;
                color: black;
                direction: rtl;
                line-height: 1.4;
            }
            .inv-header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 5px;
                margin-bottom: 5px;
            }
            .inv-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .inv-info { font-size: 9px; font-weight: bold; margin-bottom: 2px; }
            
            .inv-customer-box {
                border: 1px dashed #000;
                border-radius: 4px;
                padding: 5px;
                margin-bottom: 8px;
                font-size: 10px;
            }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
            th { border-bottom: 1px solid #000; padding: 2px 0; font-size: 9px; font-weight: bold; }
            td { border-bottom: 1px dotted #444; padding: 4px 0; font-size: 9px; vertical-align: top; }
            
            .col-name { width: 38%; text-align: right; }
            .col-qty { width: 12%; text-align: center; }
            .col-price { width: 22%; text-align: center; }
            .col-total { width: 28%; text-align: left; font-weight: bold; }

            .inv-total-row {
                border-top: 2px solid #000;
                padding-top: 5px;
                font-size: 14px;
                font-weight: 900;
                text-align: center;
                margin-top: 5px;
            }
            .inv-footer { text-align: center; margin-top: 10px; font-size: 9px; border-top: 1px dashed #000; padding-top:5px; }
        </style>

        <div class="invoice-container">
            <div class="inv-header">
                <div class="inv-title">تزئینات نوین ظریف مصور</div>
                <div class="inv-info">نمایندگی موکت ظریف مصور احمدی</div>
                <div class="inv-info">پیج اینستاگرام : zarifmosavarmis</div>
                <div class="inv-info">شماره تماس : 09928905769 , 09938812959</div>
                <div class="inv-info">آدرس : پنج بنگله , بالاتر از فروشگاه رفاه جنب فروشگاه جانبو</div>
            </div>

            <div class="inv-customer-box">
                <div><strong>مشتری:</strong> ${transaction.customerName || 'ناشناس'}</div>
                <div style="margin-top:2px"><strong>تاریخ:</strong> ${transaction.date}</div>
                <div style="margin-top:2px; font-size:9px">شماره فاکتور: ${Math.floor(transaction.id).toString().slice(-6)}</div>
                <div><strong>شماره تلفن :</strong> ${transaction.custPhone || 'ناشناس'}</div>
            </div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th class="col-name">شرح</th>
                        <th class="col-qty">تعداد</th>
                        <th class="col-price">فی</th>
                        <th class="col-total">کل (ریال)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="inv-total-row">
                جمع کل: ${transaction.totalPrice.toLocaleString()} ریال
            </div>

            <div class="inv-footer">
                * از خرید شما سپاسگزاریم *
            </div>
        </div>
    `;

    window.print();
    setTimeout(() => {
        printArea.innerHTML = '';
        printArea.className = '';
    }, 1000);
}

// ==========================================
// 3. سبد خرید و فروش
// ==========================================
function addToCart() {
    const pid = document.getElementById('selectedProductId').value;
    const amt = parseFloat(document.getElementById('saleMeters').value);
    const percent = parseFloat(document.getElementById('salePercent').value) || 0;

    if (!pid) return alert('محصول را انتخاب کنید');
    const p = products.find(x => x.id == pid);
    if (!p) return alert('محصول نامعتبر');
    if (isNaN(amt) || amt <= 0) return alert('مقدار نامعتبر');

    const inCart = cart.filter(c => c.productId == pid).reduce((sum, c) => sum + c.amount, 0);
    if ((p.stock - inCart) < amt) return alert('موجودی کافی نیست');

    let baseTotal = p.sellPrice * amt;
    let finalTotal = baseTotal + (baseTotal * (percent / 100));

    cart.push({
        productId: p.id,
        productName: p.name,
        unitPrice: p.sellPrice,
        buyPrice: p.buyPrice,
        amount: amt,
        unit: p.unit,
        percent: percent,
        total: Math.round(finalTotal)
    });

    renderCart();

    document.getElementById('saleMeters').value = '';
    document.getElementById('salePercent').value = '0';
    document.getElementById('productSearchInput').value = '';
    document.getElementById('selectedProductId').value = '';
    document.getElementById('unitPriceLabel').innerText = '-';
    document.getElementById('stockLabel').innerText = '-';
    document.getElementById('productSearchInput').focus();

    const liveEl = document.getElementById('liveFinalPrice');
    if (liveEl) liveEl.innerText = '0 ریال';
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.total;
        let finalUnit = Math.round(item.total / item.amount);
        tbody.innerHTML += `
            <tr>
                <td>${item.productName} ${item.percent != 0 ? `<small>(${item.percent}%)</small>` : ''}</td>
                <td>${item.amount}</td>
                <td>${finalUnit.toLocaleString()}</td>
                <td>${item.total.toLocaleString()}</td>
                <td><button class="btn-danger" style="padding:2px 8px" onclick="removeFromCart(${index})">×</button></td>
            </tr>
        `;
    });
    document.getElementById('cartTotalDisplay').innerText = total.toLocaleString() + ' ریال';
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); }
function clearCart() { if (confirm('سبد خالی شود؟')) { cart = []; renderCart(); } }

function checkout() {
    const custName = document.getElementById('custName').value.trim();
    const custPhone = document.getElementById('custPhone').value.trim();

    if (cart.length === 0) return alert('سبد خالی است');
    if (!custName) return alert('نام مشتری الزامی است');

    let totalAmount = 0;
    let totalProfit = 0;
    let itemsToSave = [];

    cart.forEach(item => {
        const p = products.find(x => x.id == item.productId);
        if (p) {
            p.stock -= item.amount;
            totalAmount += item.total;
            totalProfit += (item.total - (item.buyPrice * item.amount));
            itemsToSave.push(item);
        }
    });

    const transaction = {
        id: Date.now(),
        customerName: custName,
        customerPhone: custPhone,
        items: itemsToSave,
        totalPrice: totalAmount,
        profit: totalProfit,
        date: new Date().toLocaleDateString('fa-IR')
    };

    transactions.unshift(transaction);
    saveData();
    renderInventoryTable();
    calculateInventoryStats();
    updateDashboard();
    updateAccounting();
    populateCustomSelect();

    cart = [];
    renderCart();
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    alert('فاکتور ثبت شد.');
}

// تغییر هوشمند واحد کالا متناسب با دسته‌بندی انتخابی
function onCategoryChange() {
    const cat = document.getElementById('prodCategory').value;
    const unitSelect = document.getElementById('prodUnit');
    if (cat === 'carpet') {
        unitSelect.value = 'meter';
    } else {
        unitSelect.value = 'piece';
    }
}

// محاسبه قیمت لحظه‌ای در فرم فروش (ایمن شده در صورت نبود المنت)
function calculateLivePrice() {
    const pid = document.getElementById('selectedProductId').value;
    const amt = parseFloat(document.getElementById('saleMeters').value);
    const per = parseFloat(document.getElementById('salePercent').value) || 0;
    const liveEl = document.getElementById('liveFinalPrice');

    if (!liveEl) return;

    if (pid && amt) {
        const p = products.find(x => x.id == pid);
        if (p) {
            let t = p.sellPrice * amt;
            t += (t * (per / 100));
            liveEl.innerText = Math.round(t).toLocaleString() + ' ریال';
        }
    } else {
        liveEl.innerText = '0 ریال';
    }
}

// ==========================================
// 4. مدیریت انبار
// ==========================================
function addProduct() {
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const unit = document.getElementById('prodUnit').value;
    const stock = parseFloat(document.getElementById('prodStock').value);
    const buyPrice = getRawPrice('prodBuyPrice');
    const sellPrice = getRawPrice('prodSellPrice');
    const percent = parseFloat(document.getElementById('prodPercent').value) || 0;
    const brand = document.getElementById('prodBrand').value.trim();
    const serial = document.getElementById('prodSerial').value.trim();

    if (!name || isNaN(stock) || isNaN(sellPrice)) return alert('اطلاعات ناقص است');

    const newBarcode = generateBarcodeValue();

    products.push({
        id: Date.now(),
        barcode: newBarcode,
        name,
        category,
        unit,
        brand,
        stock,
        serial,
        buyPrice,
        sellPrice,
        percent,
        entryDate: new Date().toLocaleDateString('fa-IR')
    });

    saveData();
    renderInventoryTable();
    calculateInventoryStats();
    updateAccounting();
    populateCustomSelect();
    updateDashboard();

    // خالی کردن فرم و تمرکز بر روی فیلد اول
    document.getElementById('prodName').value = '';
    document.getElementById('prodCategory').value = 'carpet';
    document.getElementById('prodUnit').value = 'meter';
    document.getElementById('prodBrand').value = '';
    document.getElementById('prodStock').value = '';
    document.getElementById('prodSerial').value = '';
    document.getElementById('prodBuyPrice').value = '';
    document.getElementById('prodPercent').value = '';
    document.getElementById('prodSellPrice').value = '';

    document.getElementById('prodName').focus();
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    [...products].reverse().forEach(p => {
        const catLabel = categoryMap[p.category] || 'نامشخص';
        tbody.innerHTML += `<tr>
            <td style="font-family:monospace">${p.barcode}</td>
            <td>
                <strong>${p.name}</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">
                    دسته‌بندی: ${catLabel} ${p.brand ? ` | برند: ${p.brand}` : ''} ${p.serial ? ` | مشخصات: ${p.serial}` : ''}
                </div>
            </td>
            <td>${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}</td>
            <td>${p.sellPrice.toLocaleString()} ریال</td>
            <td class="actions-cell">
                <button class="btn-print" onclick="printLabel(${p.id})">🏷️</button>
                <button class="btn-warning" onclick="openEditModal(${p.id})">✏️</button>
                <button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
            </td>
        </tr>`;
    });
}

function setupEnterNavigation() {
    const form = document.getElementById('addProductForm');
    if (!form) return;
    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach((input, index) => {
        input.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = inputs[index + 1];
                if (nextInput) nextInput.focus();
                else addProduct();
            }
        };
    });
}

// ==========================================
// 5. داشبورد و حسابداری
// ==========================================
function updateDashboard() {
    document.getElementById('totalItemsDisplay').innerText = products.length;
    document.getElementById('totalTransactionsCount').innerText = transactions.length;
    document.getElementById('lowStockDisplay').innerText = products.filter(p => p.stock < 10).length;
    renderTransactionsTable(transactions);
}

function updateAccounting() {
    let sales = 0, profit = 0;
    transactions.forEach(t => { sales += t.totalPrice; profit += t.profit; });
    document.getElementById('totalSalesDisplay').innerText = sales.toLocaleString() + ' ریال';
    document.getElementById('totalProfitDisplay').innerText = profit.toLocaleString() + ' ریال';
    let val = 0; products.forEach(i => { val += (i.buyPrice * i.stock); });
    document.getElementById('totalInventoryValue').innerText = val.toLocaleString() + ' ریال';
    renderAccountingTable(transactions);
}

function renderTransactionsTable(list) {
    const tb = document.getElementById('transactionsTableBody');
    tb.innerHTML = '';
    list.forEach(t => {
        tb.innerHTML += `<tr>
            <td>${Math.floor(t.id).toString().slice(-6)}</td>
            <td><strong>${t.customerName || '-'}</strong></td>
            <td>${t.totalPrice.toLocaleString()}</td>
            <td>${t.date}</td>
            <td class="actions-cell">
                <button class="btn-print" onclick="printInvoice(${t.id})" title="چاپ فاکتور">🖨️</button>
                <button class="btn-warning" onclick="openReturnModal(${t.id})" style="background-color: #f59e0b;" title="مرجوع کردن فاکتور">↩️</button>
                <button class="btn-danger" onclick="delTrans(${t.id})" title="انتقال به زباله">🗑️</button>
            </td>
        </tr>`;
    });
}

function renderAccountingTable(list) {
    const tb = document.getElementById('accountingTableBody');
    tb.innerHTML = '';
    list.forEach(t => {
        tb.innerHTML += `<tr><td>${t.customerName || '-'}</td><td>${t.totalPrice.toLocaleString()}</td><td style="color:#10b981">${t.profit.toLocaleString()}</td><td>${t.date}</td></tr>`;
    });
}

function searchTransactions(q) {
    if (!q) return renderTransactionsTable(transactions);
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t => (t.customerName && t.customerName.toLowerCase().includes(lower)));
    renderTransactionsTable(filtered);
}

function searchAccounting(q) {
    if (!q) return renderAccountingTable(transactions);
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t => (t.customerName && t.customerName.toLowerCase().includes(lower)));
    renderAccountingTable(filtered);
}

// ==========================================
// 6. ابزارهای کمکی و بارکد
// ==========================================
function generateBarcodeValue() { let code; do { code = Math.floor(10000000 + Math.random() * 90000000).toString(); } while (products.some(p => p.barcode === code)); return code; }

function createBarcodeSVG(text) {
    const encodedText = '*' + text + '*';
    let binarySeq = "";
    const codes = { '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101', '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011', '8': '110100101101', '9': '101100101101', '*': '100101101101' };
    for (let char of encodedText) if (codes[char]) binarySeq += codes[char] + "0";

    let svgContent = "";
    let x = 0;
    svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`; x += 4;
    for (let i = 0; i < binarySeq.length; i++) {
        let width = (binarySeq[i] === '1') ? 3 : 1;
        svgContent += `<rect x="${x}" y="0" width="${width}" height="100" fill="black"/>`;
        x += width + 1.5;
    }
    x += 2; svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`;

    return `<svg viewBox="0 0 ${x + 4} 100" preserveAspectRatio="none" class="barcode-svg" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

function formatCurrency(input) { let v = input.value.replace(/[^0-9]/g, ''); if (v) input.value = parseInt(v).toLocaleString(); }
function getRawPrice(id) { return parseFloat(document.getElementById(id).value.replace(/,/g, '') || 0); }

function toggleDropdown() { document.getElementById('dropdownList').classList.toggle('show'); if (document.getElementById('dropdownList').classList.contains('show')) filterDropdown(document.getElementById('productSearchInput').value); }
function filterDropdown(q) { const list = document.getElementById('dropdownList'); list.classList.add('show'); const items = list.children; for (let i of items) i.style.display = (q === '' || i.dataset.search.includes(q.toLowerCase())) ? 'block' : 'none'; }

function populateCustomSelect() {
    const list = document.getElementById('dropdownList');
    list.innerHTML = '';
    [...products].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        const d = document.createElement('div');
        d.className = 'option-item';

        const catLabel = categoryMap[p.category] || 'سایر';
        const serialText = p.serial ? ` | سریال: ${p.serial}` : '';
        const brandText = p.brand ? ` | برند: ${p.brand}` : '';

        d.innerHTML = `
            <strong>${p.name}</strong> 
            <small style="display:block; color:#64748b; font-size:11px; margin-top:2px;">
                ${catLabel} ${brandText} ${serialText} (موجودی: ${p.stock})
            </small>
        `;

        d.dataset.search = (p.name + ' ' + (p.brand || '') + ' ' + catLabel + ' ' + (p.serial || '') + ' ' + p.barcode).toLowerCase();
        d.onclick = () => selectProduct(p);
        list.appendChild(d);
    });
}

function selectProduct(p) {
    const displayName = p.serial ? `${p.name} (سریال: ${p.serial})` : p.name;
    document.getElementById('productSearchInput').value = displayName;
    document.getElementById('selectedProductId').value = p.id;
    document.getElementById('dropdownList').classList.remove('show');
    document.getElementById('unitPriceLabel').innerText = `قیمت: ${p.sellPrice.toLocaleString()} ریال`;
    document.getElementById('stockLabel').innerText = `موجودی: ${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}`;
    document.getElementById('saleMeters').focus();
    calculateLivePrice();
}

function handleBarcodeScan(e) { if (e.key === 'Enter') { const c = e.target.value.trim(); const p = products.find(x => x.barcode === c); if (p) selectProduct(p); else alert('یافت نشد'); e.target.value = ''; } }

function calculateInventoryStats() {
    let m = 0, p = 0;
    products.forEach(i => {
        if (String(i.unit) === 'meter') m += i.stock;
        else p += i.stock;
    });
    document.getElementById('totalStockMeters').innerText = m + ' متر';
    document.getElementById('totalStockPieces').innerText = p + ' عدد';
}

// ==========================================
// 7. ذخیره/بازیابی و سطل زباله
// ==========================================
function saveData() { localStorage.setItem('cm_products_v5', JSON.stringify(products)); localStorage.setItem('cm_transactions_v5', JSON.stringify(transactions)); localStorage.setItem('cm_returns_v5', JSON.stringify(returns)); localStorage.setItem('cm_deleted_p_v5', JSON.stringify(deletedProducts)); localStorage.setItem('cm_deleted_t_v5', JSON.stringify(deletedTransactions)); }
function loadData() { if (localStorage.getItem('cm_products_v5')) products = JSON.parse(localStorage.getItem('cm_products_v5')); if (localStorage.getItem('cm_transactions_v5')) transactions = JSON.parse(localStorage.getItem('cm_transactions_v5')); if (localStorage.getItem('cm_returns_v5')) returns = JSON.parse(localStorage.getItem('cm_returns_v5')); if (localStorage.getItem('cm_deleted_p_v5')) deletedProducts = JSON.parse(localStorage.getItem('cm_deleted_p_v5')); if (localStorage.getItem('cm_deleted_t_v5')) deletedTransactions = JSON.parse(localStorage.getItem('cm_deleted_t_v5')); }
function cleanupTrash() { const l = Date.now() - (30 * 24 * 3600 * 1000); deletedProducts = deletedProducts.filter(i => i.deletedAt > l); deletedTransactions = deletedTransactions.filter(i => i.deletedAt > l); saveData(); }

window.deleteProduct = function (id) { if (!confirm('حذف؟')) return; const i = products.findIndex(p => p.id === id); if (i > -1) { products[i].deletedAt = Date.now(); deletedProducts.push(products[i]); products.splice(i, 1); saveData(); location.reload(); } };
window.delTrans = function (id) { if (!confirm('حذف فاکتور؟')) return; const i = transactions.findIndex(t => t.id === id); if (i > -1) { transactions[i].deletedAt = Date.now(); deletedTransactions.push(transactions[i]); transactions.splice(i, 1); saveData(); updateDashboard(); updateAccounting(); renderTrash(); } };

function renderTrash() {
    const pBody = document.getElementById('trashProductsBody');
    pBody.innerHTML = '';
    deletedProducts.forEach(x => {
        pBody.innerHTML += `
            <tr>
                <td>${x.name}</td>
                <td>${new Date(x.deletedAt).toLocaleDateString('fa-IR')}</td>
                <td class="actions-cell">
                    <button class="btn-secondary" onclick="restoreProduct(${x.id})" title="بازیابی">♻️</button>
                    <button class="btn-danger" onclick="permDelProd(${x.id})" title="حذف کامل">🗑️</button>
                </td>
            </tr>`;
    });

    const tBody = document.getElementById('trashTransactionsBody');
    tBody.innerHTML = '';
    deletedTransactions.forEach(t => {
        tBody.innerHTML += `
            <tr>
                <td>${t.customerName || 'ناشناس'}</td>
                <td>${t.totalPrice.toLocaleString()}</td>
                <td class="actions-cell">
                    <button class="btn-secondary" onclick="restoreTrans(${t.id})" title="بازیابی">♻️</button>
                    <button class="btn-danger" onclick="permDelTrans(${t.id})" title="حذف کامل">🗑️</button>
                </td>
            </tr>`;
    });
}

window.restoreProduct = function (id) { const i = deletedProducts.findIndex(p => p.id === id); if (i > -1) { delete deletedProducts[i].deletedAt; products.push(deletedProducts[i]); deletedProducts.splice(i, 1); saveData(); location.reload(); } };
window.restoreTrans = function (id) { const i = deletedTransactions.findIndex(t => t.id === id); if (i > -1) { delete deletedTransactions[i].deletedAt; transactions.push(deletedTransactions[i]); deletedTransactions.splice(i, 1); saveData(); location.reload(); } };

// ==========================================
// 8. مودال‌ها و جزئیات ویرایش
// ==========================================
window.calcEditPrice = function () {
    const buyInput = document.getElementById('editProdBuy');
    const percentInput = document.getElementById('editProdPercent');
    const sellInput = document.getElementById('editProdSell');

    const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0;
    const percent = parseFloat(percentInput.value) || 0;

    if (buyPrice > 0) {
        const sellPrice = buyPrice + (buyPrice * (percent / 100));
        sellInput.value = Math.round(sellPrice).toLocaleString();
    }
};

window.openEditModal = function (id) {
    const p = products.find(x => x.id === id);
    if (!p) return;

    document.getElementById('editProdId').value = p.id;
    document.getElementById('editProdBarcode').value = p.barcode;
    document.getElementById('editProdName').value = p.name;
    document.getElementById('editProdCategory').value = p.category || 'carpet';
    document.getElementById('editProdUnit').value = p.unit;
    document.getElementById('editProdBrand').value = p.brand || '';
    document.getElementById('editProdStock').value = p.stock;
    document.getElementById('editProdSerial').value = p.serial || '';

    document.getElementById('editProdBuy').value = p.buyPrice.toLocaleString();
    document.getElementById('editProdSell').value = p.sellPrice.toLocaleString();
    document.getElementById('editProdPercent').value = p.percent || 0;

    document.getElementById('editModal').style.display = 'flex';
};

window.saveEditProduct = function () {
    const id = parseInt(document.getElementById('editProdId').value);
    const p = products.find(x => x.id === id);

    if (p) {
        p.name = document.getElementById('editProdName').value;
        p.category = document.getElementById('editProdCategory').value;
        p.unit = document.getElementById('editProdUnit').value;
        p.brand = document.getElementById('editProdBrand').value;
        p.stock = parseFloat(document.getElementById('editProdStock').value);
        p.serial = document.getElementById('editProdSerial').value.trim();

        p.buyPrice = getRawPrice('editProdBuy');
        p.sellPrice = getRawPrice('editProdSell');
        p.percent = parseFloat(document.getElementById('editProdPercent').value) || 0;

        saveData();
        renderInventoryTable();
        calculateInventoryStats();
        updateAccounting();
        populateCustomSelect();
        closeModal('editModal');
    }
};

function openReturnModal(id) { document.getElementById('returnTransId').value = id; document.getElementById('returnReason').value = ''; document.getElementById('returnModal').style.display = 'flex'; }
function confirmReturn() { const id = parseInt(document.getElementById('returnTransId').value); const r = document.getElementById('returnReason').value; if (!r) return alert('دلیل؟'); const idx = transactions.findIndex(t => t.id === id); if (idx > -1) { const t = transactions[idx]; if (t.items) { t.items.forEach(it => { const p = products.find(x => x.id == it.productId); if (p) p.stock += it.amount; }); } else { const p = products.find(x => x.id == t.productId); if (p) p.stock += t.amount; } returns.unshift({ ...t, returnDate: new Date().toLocaleDateString('fa-IR'), returnReason: r }); transactions.splice(idx, 1); saveData(); updateDashboard(); updateAccounting(); renderInventoryTable(); calculateInventoryStats(); renderReturnsTable(); closeModal('returnModal'); alert('مرجوع شد'); } }

function renderReturnsTable() { const t = document.getElementById('returnsTableBody'); t.innerHTML = ''; returns.forEach(r => { t.innerHTML += `<tr><td>${r.items ? r.items.length + ' قلم' : r.productName}</td><td style="color:#c0392b">${r.amount || '-'}</td><td>${r.totalPrice.toLocaleString()}</td><td>${r.returnDate}</td><td>${r.returnReason}</td></tr>` }); }
function showSection(id) { document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section')); document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active')); document.getElementById(id).classList.add('active-section'); const btn = document.getElementById('btn-' + id); if (btn) btn.classList.add('active'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function exportData() { const d = { products, transactions, returns, deletedProducts, deletedTransactions }; const b = new Blob([JSON.stringify(d)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = "backup.json"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function importData(i) { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => { try { const d = JSON.parse(e.target.result); if (confirm('بازنشانی؟')) { products = d.products || []; transactions = d.transactions || []; returns = d.returns || []; deletedProducts = d.deletedProducts || []; deletedTransactions = d.deletedTransactions || []; saveData(); location.reload(); } } catch (z) { alert('خطا'); } }; r.readAsText(f); i.value = ''; }

window.permDelTrans = function (id) {
    if (confirm('آیا مطمئن هستید؟ این فاکتور برای همیشه پاک می‌شود!')) {
        deletedTransactions = deletedTransactions.filter(t => t.id !== id);
        saveData();
        renderTrash();
    }
};

window.permDelProd = function (id) {
    if (confirm('آیا مطمئن هستید؟ این کالا برای همیشه پاک می‌شود!')) {
        deletedProducts = deletedProducts.filter(p => p.id !== id);
        saveData();
        renderTrash();
    }
};

function autoCalcSell(prefix) {
    const buyInput = document.getElementById(prefix + 'BuyPrice');
    const percentInput = document.getElementById(prefix + 'Percent');
    const sellInput = document.getElementById(prefix + 'SellPrice');

    if (!buyInput || !percentInput || !sellInput) return;

    const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0;
    const percent = parseFloat(percentInput.value) || 0;

    if (buyPrice > 0) {
        const sellPrice = buyPrice + (buyPrice * (percent / 100));
        sellInput.value = Math.round(sellPrice).toLocaleString();
    }
}
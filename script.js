/**
 * Carpet Manager System - Advanced Accounting & Phone Display Edition
 */

// --- متغیرهای سراسری ---
let products = [];
let transactions = [];
let returns = [];
let deletedProducts = [];
let deletedTransactions = [];
let cart = [];

const categoryMap = { carpet: 'فرش و موکت', appliance: 'لوازم برقی', dishes: 'ظروف', other: 'سایر' };
const paymentTypeMap = { cash: 'نقدی 💵', check: 'چکی 💳', installment: 'اقساطی 📅' };

const DB_NAME = 'CarpetManagerIndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'AppData';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function loadDataFromIndexedDB() {
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const dataRequest = store.get('app_state');

        return new Promise((resolve) => {
            dataRequest.onsuccess = () => {
                const result = dataRequest.result;
                if (result) {
                    products = result.products || []; transactions = result.transactions || [];
                    returns = result.returns || []; deletedProducts = result.deletedProducts || [];
                    deletedTransactions = result.deletedTransactions || []; resolve();
                } else {
                    loadDataFromLocalStorageFallback(); resolve();
                }
            };
            dataRequest.onerror = () => { loadDataFromLocalStorageFallback(); resolve(); };
        });
    } catch (err) { loadDataFromLocalStorageFallback(); }
}

function loadDataFromLocalStorageFallback() {
    if (localStorage.getItem('cm_products_v5')) products = JSON.parse(localStorage.getItem('cm_products_v5'));
    if (localStorage.getItem('cm_transactions_v5')) transactions = JSON.parse(localStorage.getItem('cm_transactions_v5'));
    if (localStorage.getItem('cm_returns_v5')) returns = JSON.parse(localStorage.getItem('cm_returns_v5'));
    if (localStorage.getItem('cm_deleted_p_v5')) deletedProducts = JSON.parse(localStorage.getItem('cm_deleted_p_v5'));
    if (localStorage.getItem('cm_deleted_t_v5')) deletedTransactions = JSON.parse(localStorage.getItem('cm_deleted_t_v5'));
    saveData();
}

async function saveData() {
    localStorage.setItem('cm_products_v5', JSON.stringify(products));
    localStorage.setItem('cm_transactions_v5', JSON.stringify(transactions));
    localStorage.setItem('cm_returns_v5', JSON.stringify(returns));
    localStorage.setItem('cm_deleted_p_v5', JSON.stringify(deletedProducts));
    localStorage.setItem('cm_deleted_t_v5', JSON.stringify(deletedTransactions));

    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ products, transactions, returns, deletedProducts, deletedTransactions }, 'app_state');
    } catch (err) { console.error("IndexedDB Save Error:", err); }
}

async function checkAndTriggerAutoBackup() {
    const lastBackupTime = localStorage.getItem('cm_last_backup_time');
    const now = Date.now();
    if (!lastBackupTime) { localStorage.setItem('cm_last_backup_time', now.toString()); return; }
    if (now - parseInt(lastBackupTime) >= (2 * 24 * 60 * 60 * 1000)) {
        triggerSilentBackupDownload();
        localStorage.setItem('cm_last_backup_time', now.toString());
    }
}

function triggerSilentBackupDownload() {
    const d = { products, transactions, returns, deletedProducts, deletedTransactions };
    const b = new Blob([JSON.stringify(d)], { type: "application/json" });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u;
    a.download = `auto_backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    try {
        await loadDataFromIndexedDB();
        cleanupTrash();
        await checkAndTriggerAutoBackup();

        updateDashboard(); updateAccounting(); renderInventoryTable();
        renderReturnsTable(); renderTrash(); populateCustomSelect();
        calculateInventoryStats(); setupEnterNavigation(); renderAccounts();
    } catch (err) { console.error("خطا:", err); }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('fa-IR', options);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            const list = document.getElementById('dropdownList');
            if (list) list.classList.remove('show');
        }
    });

    if (typeof $ !== 'undefined' && $.fn.persianDatepicker) {
        $('.p-date').persianDatepicker({
            format: 'YYYY/MM/DD',
            initialValue: false,
            autoClose: true,
            observer: true,
            onSelect: function () { calcInstallmentAmounts(); }
        });
    }
});

function checkLogin() {
    const pass = document.getElementById('loginPass').value;
    if (pass === 'mehdimoket') {
        document.getElementById('loginOverlay').style.display = 'none';
        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function addJalaliMonths(dateStr, monthsToAdd) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    let y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
    m += monthsToAdd;
    while (m > 12) { m -= 12; y += 1; }
    if (m > 6 && m < 12 && d > 30) d = 30;
    if (m === 12) {
        let isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
        if (isLeap && d > 30) d = 30;
        if (!isLeap && d > 29) d = 29;
    }
    const mm = m < 10 ? '0' + m : m; const dd = d < 10 ? '0' + d : d;
    return `${y}/${mm}/${dd}`;
}

// ==========================================
// توابع حسابداری، داشبورد و نمایش تلفن 📞
// ==========================================
function updateDashboard() {
    document.getElementById('totalItemsDisplay').innerText = products.length;
    document.getElementById('totalTransactionsCount').innerText = transactions.length;
    document.getElementById('lowStockDisplay').innerText = products.filter(p => p.stock < 10).length;
    renderTransactionsTable(transactions);
}

function updateAccounting() {
    let totalSalesNominal = 0;
    let totalCashReceived = 0;
    let totalProfitRealized = 0;

    transactions.forEach(t => {
        totalSalesNominal += t.totalPrice;
        let receivedForThis = 0;

        if (t.paymentType === 'cash') {
            receivedForThis = t.totalPrice;
        } else if (t.paymentType === 'check') {
            if (t.checks) t.checks.forEach(c => { if (c.status === 'passed') receivedForThis += c.amount; });
        } else if (t.paymentType === 'installment') {
            receivedForThis += (t.downPayment || 0);
            if (t.installments) t.installments.forEach(ins => { if (ins.status === 'paid') receivedForThis += ins.amount; });
        }

        totalCashReceived += receivedForThis;
        let profitRatio = t.totalPrice > 0 ? (receivedForThis / t.totalPrice) : 0;
        totalProfitRealized += (t.profit * profitRatio);
    });

    document.getElementById('totalSalesDisplay').innerHTML = `${totalSalesNominal.toLocaleString()} <br><small style="color:#10b981; font-size:12px;">(وصولی: ${totalCashReceived.toLocaleString()})</small>`;
    document.getElementById('totalProfitDisplay').innerText = Math.round(totalProfitRealized).toLocaleString() + ' ریال';

    let val = 0; products.forEach(i => { val += (i.buyPrice * i.stock); });
    document.getElementById('totalInventoryValue').innerText = val.toLocaleString() + ' ریال';

    renderAccountingTable(transactions);
}

function renderTransactionsTable(list) {
    const tb = document.getElementById('transactionsTableBody');
    tb.innerHTML = '';
    list.forEach(t => {
        const payTypeStr = paymentTypeMap[t.paymentType] || 'نقدی 💵';
        tb.innerHTML += `<tr>
            <td>${Math.floor(t.id).toString().slice(-6)}</td>
            <td>
                <strong>${t.customerName || '-'}</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
            </td>
            <td>${t.totalPrice.toLocaleString()}</td>
            <td style="color:#2563eb; font-weight:bold;">${payTypeStr}</td>
            <td>${t.date}</td>
            <td class="actions-cell">
                <button class="btn-print" onclick="printInvoice(${t.id})" title="چاپ فاکتور">🖨️</button>
                <button class="btn-warning" onclick="openReturnModal(${t.id})" style="background-color: #f59e0b;" title="مرجوع کردن">↩️</button>
                <button class="btn-danger" onclick="delTrans(${t.id})" title="انتقال به زباله">🗑️</button>
            </td>
        </tr>`;
    });
}

function printInvoice(transId) {
    const transaction = transactions.find(t => t.id === transId);
    if (!transaction) return;

    const printArea = document.getElementById('printArea');
    printArea.className = 'invoice-mode';

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


function renderAccountingTable(list) {
    const tb = document.getElementById('accountingTableBody');
    tb.innerHTML = '';
    list.forEach(t => {
        let received = 0;
        if (t.paymentType === 'cash') received = t.totalPrice;
        else if (t.paymentType === 'check') t.checks.forEach(c => { if (c.status === 'passed') received += c.amount; });
        else if (t.paymentType === 'installment') {
            received += (t.downPayment || 0);
            t.installments.forEach(ins => { if (ins.status === 'paid') received += ins.amount; });
        }

        let profitRatio = t.totalPrice > 0 ? (received / t.totalPrice) : 0;
        let realizedProfit = Math.round(t.profit * profitRatio);
        const payTypeStr = paymentTypeMap[t.paymentType] || 'نقدی';

        tb.innerHTML += `<tr>
            <td>
                <strong>${t.customerName || '-'}</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
            </td>
            <td>${t.totalPrice.toLocaleString()}</td>
            <td style="color:#2563eb; font-weight:bold;">${received.toLocaleString()}</td>
            <td style="color:#10b981; font-weight:bold;">${realizedProfit.toLocaleString()}</td>
            <td>${payTypeStr}</td>
            <td>${t.date}</td>
        </tr>`;
    });
}

// ==========================================
// بازتولید بدهی و چک‌های برگشتی
// ==========================================
function recalculateInvoice(transId) {
    const t = transactions.find(x => x.id === transId);
    if (!t) return;
    if (t.paymentType === 'check') {
        const allPassed = t.checks.every(c => c.status === 'passed');
        t.remainingBalance = allPassed ? 0 : t.totalPrice;
    } else if (t.paymentType === 'installment') {
        let paid = 0;
        t.installments.forEach(i => { if (i.status === 'paid') paid += i.amount; });
        t.remainingBalance = Math.max(0, t.totalPrice - (t.downPayment || 0) - paid);
    } else {
        t.remainingBalance = 0;
    }
}

function updateCheckStatus(transId, checkId, newStatus) {
    const t = transactions.find(x => x.id === transId);
    if (t && t.checks) {
        const c = t.checks.find(x => x.id === checkId);
        if (c) {
            c.status = newStatus;
            recalculateInvoice(transId);
            saveData();
            renderAccounts();
            updateAccounting();
        }
    }
}

// ==========================================
// ادامه توابع ثابت برنامه
// ==========================================
function togglePaymentFields() {
    const type = document.getElementById('paymentType').value;
    document.getElementById('downPaymentGroup').style.display = (type === 'installment') ? 'block' : 'none';
    document.getElementById('checkFields').style.display = (type === 'check') ? 'block' : 'none';
    document.getElementById('installmentFields').style.display = (type === 'installment') ? 'block' : 'none';

    const today = new Date().toLocaleDateString('fa-IR');
    if (type === 'installment' && !document.getElementById('firstInstallmentDate').value) {
        document.getElementById('firstInstallmentDate').value = addJalaliMonths(today, 1);
    }
    if (type === 'check' && !document.getElementById('checkDueDate').value) {
        document.getElementById('checkDueDate').value = addJalaliMonths(today, 1);
    }
    calcInstallmentAmounts();
}

function calcInstallmentAmounts() {
    let total = 0; cart.forEach(item => total += item.total);
    const down = getRawPrice('downPayment');
    const count = parseInt(document.getElementById('installmentCount').value) || 1;
    const remaining = total - down;
    const displayEl = document.getElementById('installmentAmountDisplay');
    if (!displayEl) return;
    if (remaining < 0) { displayEl.value = 'پیش‌پرداخت مازاد!'; return; }
    displayEl.value = Math.round(remaining / count).toLocaleString() + ' ریال';
}

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
    } else { liveEl.innerText = '0 ریال'; }
}

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

    cart.push({ productId: p.id, productName: p.name, unitPrice: p.sellPrice, buyPrice: p.buyPrice, amount: amt, unit: p.unit, percent: percent, total: Math.round(finalTotal) });
    renderCart();

    document.getElementById('saleMeters').value = ''; document.getElementById('salePercent').value = '0';
    document.getElementById('productSearchInput').value = ''; document.getElementById('selectedProductId').value = '';
    document.getElementById('unitPriceLabel').innerText = '-'; document.getElementById('stockLabel').innerText = '-';
    document.getElementById('productSearchInput').focus();
    calcInstallmentAmounts();
    const liveEl = document.getElementById('liveFinalPrice'); if (liveEl) liveEl.innerText = '0 ریال';
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody'); tbody.innerHTML = ''; let total = 0;
    cart.forEach((item, index) => {
        total += item.total;
        let finalUnit = Math.round(item.total / item.amount);
        tbody.innerHTML += `<tr><td>${item.productName} ${item.percent != 0 ? `<small>(${item.percent}%)</small>` : ''}</td><td>${item.amount}</td><td>${finalUnit.toLocaleString()}</td><td>${item.total.toLocaleString()}</td><td><button class="btn-danger" style="padding:2px 8px" onclick="removeFromCart(${index})">×</button></td></tr>`;
    });
    document.getElementById('cartTotalDisplay').innerText = total.toLocaleString() + ' ریال';
    calcInstallmentAmounts();
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); }
function clearCart() { if (confirm('سبد خالی شود؟')) { cart = []; renderCart(); } }

function checkout() {
    const custName = document.getElementById('custName').value.trim();
    const custPhone = document.getElementById('custPhone').value.trim();
    const paymentType = document.getElementById('paymentType').value;

    if (cart.length === 0) return alert('سبد خالی است');
    if (!custName) return alert('نام مشتری الزامی است');

    let totalAmount = 0, totalProfit = 0, itemsToSave = [];
    cart.forEach(item => {
        const p = products.find(x => x.id == item.productId);
        if (p) {
            p.stock -= item.amount; totalAmount += item.total;
            totalProfit += (item.total - (item.buyPrice * item.amount)); itemsToSave.push(item);
        }
    });

    let checks = [], installments = [], downPaymentVal = 0, remainingBalance = totalAmount;

    if (paymentType === 'check') {
        const bank = document.getElementById('checkBank').value.trim();
        const num = document.getElementById('checkNumber').value.trim();
        const date = document.getElementById('checkDueDate').value.trim();
        if (!bank || !num || !date) return alert('اطلاعات چک را کامل از تقویم وارد کنید');
        checks.push({ id: Date.now(), bank, number: num, dueDate: date, amount: totalAmount, status: 'pending' });
        remainingBalance = totalAmount;
    } else if (paymentType === 'installment') {
        downPaymentVal = getRawPrice('downPayment');
        if (downPaymentVal > totalAmount) return alert('مبلغ پیش‌پرداخت بزرگتر از فاکتور است');
        const count = parseInt(document.getElementById('installmentCount').value) || 1;
        const firstDate = document.getElementById('firstInstallmentDate').value.trim();
        if (!firstDate) return alert('تاریخ اولین قسط را از تقویم مشخص کنید');

        const remaining = totalAmount - downPaymentVal;
        const instAmount = Math.round(remaining / count);
        for (let i = 0; i < count; i++) {
            installments.push({ number: i + 1, dueDate: addJalaliMonths(firstDate, i), amount: instAmount, status: 'unpaid', payDate: null });
        }
        remainingBalance = remaining;
    } else { remainingBalance = 0; }

    const transaction = { id: Date.now(), customerName: custName, customerPhone: custPhone, items: itemsToSave, totalPrice: totalAmount, profit: totalProfit, date: new Date().toLocaleDateString('fa-IR'), paymentType, checks, installments, downPayment: downPaymentVal, remainingBalance };
    transactions.unshift(transaction); saveData(); renderInventoryTable(); calculateInventoryStats();
    updateDashboard(); updateAccounting(); populateCustomSelect(); renderAccounts();

    cart = []; renderCart();
    document.getElementById('custName').value = ''; document.getElementById('custPhone').value = '';
    document.getElementById('paymentType').value = 'cash'; document.getElementById('downPayment').value = '';
    document.getElementById('checkBank').value = ''; document.getElementById('checkNumber').value = '';
    document.getElementById('checkDueDate').value = ''; document.getElementById('installmentCount').value = '6';
    document.getElementById('firstInstallmentDate').value = ''; document.getElementById('installmentAmountDisplay').value = '';
    togglePaymentFields(); alert('فاکتور با موفقیت ثبت شد.');
}

function onCategoryChange() {
    const cat = document.getElementById('prodCategory').value;
    document.getElementById('prodUnit').value = (cat === 'carpet') ? 'meter' : 'piece';
}

function addProduct() {
    const name = document.getElementById('prodName').value.trim(), category = document.getElementById('prodCategory').value;
    const unit = document.getElementById('prodUnit').value, stock = parseFloat(document.getElementById('prodStock').value);
    const buyPrice = getRawPrice('prodBuyPrice'), sellPrice = getRawPrice('prodSellPrice');
    const percent = parseFloat(document.getElementById('prodPercent').value) || 0;
    const brand = document.getElementById('prodBrand').value.trim(), serial = document.getElementById('prodSerial').value.trim();

    if (!name || isNaN(stock) || isNaN(sellPrice)) return alert('اطلاعات ناقص است');
    const newBarcode = generateBarcodeValue();

    products.push({ id: Date.now(), barcode: newBarcode, name, category, unit, brand, stock, serial, buyPrice, sellPrice, percent, entryDate: new Date().toLocaleDateString('fa-IR') });
    saveData(); renderInventoryTable(); calculateInventoryStats(); updateAccounting(); populateCustomSelect(); updateDashboard();

    document.getElementById('prodName').value = ''; document.getElementById('prodCategory').value = 'carpet';
    document.getElementById('prodUnit').value = 'meter'; document.getElementById('prodBrand').value = '';
    document.getElementById('prodStock').value = ''; document.getElementById('prodSerial').value = '';
    document.getElementById('prodBuyPrice').value = ''; document.getElementById('prodPercent').value = '';
    document.getElementById('prodSellPrice').value = ''; document.getElementById('prodName').focus();
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody'); tbody.innerHTML = '';
    [...products].reverse().forEach(p => {
        const catLabel = categoryMap[p.category] || 'نامشخص';
        tbody.innerHTML += `<tr><td style="font-family:monospace">${p.barcode}</td><td><strong>${p.name}</strong><div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">دسته‌بندی: ${catLabel} ${p.brand ? ` | برند: ${p.brand}` : ''} ${p.serial ? ` | مشخصات: ${p.serial}` : ''}</div></td><td>${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}</td><td>${p.sellPrice.toLocaleString()} ریال</td><td class="actions-cell"><button class="btn-print" onclick="printLabel(${p.id})">🏷️</button><button class="btn-warning" onclick="openEditModal(${p.id})">✏️</button><button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️</button></td></tr>`;
    });
}

function setupEnterNavigation() {
    const form = document.getElementById('addProductForm'); if (!form) return;
    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach((input, index) => {
        input.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); const nextInput = inputs[index + 1]; if (nextInput) nextInput.focus(); else addProduct(); } };
    });
}

// ==========================================
// توابع جستجو (امکان جستجوی تلفن 📞 اضافه شد)
// ==========================================
function searchTransactions(q) {
    if (!q) return renderTransactionsTable(transactions);
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(lower)) ||
        (t.customerPhone && t.customerPhone.includes(lower))
    );
    renderTransactionsTable(filtered);
}

function searchAccounting(q) {
    if (!q) return renderAccountingTable(transactions);
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(lower)) ||
        (t.customerPhone && t.customerPhone.includes(lower))
    );
    renderAccountingTable(filtered);
}

function generateBarcodeValue() { let code; do { code = Math.floor(10000000 + Math.random() * 90000000).toString(); } while (products.some(p => p.barcode === code)); return code; }
function createBarcodeSVG(text) {
    const encodedText = '*' + text + '*'; let binarySeq = "";
    const codes = { '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101', '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011', '8': '110100101101', '9': '101100101101', '*': '100101101101' };
    for (let char of encodedText) if (codes[char]) binarySeq += codes[char] + "0";
    let svgContent = "", x = 0; svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`; x += 4;
    for (let i = 0; i < binarySeq.length; i++) { let width = (binarySeq[i] === '1') ? 3 : 1; svgContent += `<rect x="${x}" y="0" width="${width}" height="100" fill="black"/>`; x += width + 1.5; }
    x += 2; svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`; return `<svg viewBox="0 0 ${x + 4} 100" preserveAspectRatio="none" class="barcode-svg" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

function formatCurrency(input) { let v = input.value.replace(/[^0-9]/g, ''); if (v) input.value = parseInt(v).toLocaleString(); }
function getRawPrice(id) { return parseFloat(document.getElementById(id).value.replace(/,/g, '') || 0); }
function toggleDropdown() { document.getElementById('dropdownList').classList.toggle('show'); if (document.getElementById('dropdownList').classList.contains('show')) filterDropdown(document.getElementById('productSearchInput').value); }
function filterDropdown(q) { const list = document.getElementById('dropdownList'); list.classList.add('show'); const items = list.children; for (let i of items) i.style.display = (q === '' || i.dataset.search.includes(q.toLowerCase())) ? 'block' : 'none'; }

function populateCustomSelect() {
    const list = document.getElementById('dropdownList'); list.innerHTML = '';
    [...products].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        const d = document.createElement('div'); d.className = 'option-item';
        const catLabel = categoryMap[p.category] || 'سایر'; const serialText = p.serial ? ` | سریال: ${p.serial}` : ''; const brandText = p.brand ? ` | برند: ${p.brand}` : '';
        d.innerHTML = `<strong>${p.name}</strong> <small style="display:block; color:#64748b; font-size:11px; margin-top:2px;">${catLabel} ${brandText} ${serialText} (موجودی: ${p.stock})</small>`;
        d.dataset.search = (p.name + ' ' + (p.brand || '') + ' ' + catLabel + ' ' + (p.serial || '') + ' ' + p.barcode).toLowerCase();
        d.onclick = () => selectProduct(p); list.appendChild(d);
    });
}

function selectProduct(p) {
    document.getElementById('productSearchInput').value = p.serial ? `${p.name} (سریال: ${p.serial})` : p.name;
    document.getElementById('selectedProductId').value = p.id; document.getElementById('dropdownList').classList.remove('show');
    document.getElementById('unitPriceLabel').innerText = `قیمت: ${p.sellPrice.toLocaleString()} ریال`;
    document.getElementById('stockLabel').innerText = `موجودی: ${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}`;
    document.getElementById('saleMeters').focus(); calculateLivePrice();
}

function handleBarcodeScan(e) { if (e.key === 'Enter') { const c = e.target.value.trim(); const p = products.find(x => x.barcode === c); if (p) selectProduct(p); else alert('یافت نشد'); e.target.value = ''; } }
function calculateInventoryStats() { let m = 0, p = 0; products.forEach(i => { if (String(i.unit) === 'meter') m += i.stock; else p += i.stock; }); document.getElementById('totalStockMeters').innerText = m + ' متر'; document.getElementById('totalStockPieces').innerText = p + ' عدد'; }
function cleanupTrash() { const l = Date.now() - (30 * 24 * 3600 * 1000); deletedProducts = deletedProducts.filter(i => i.deletedAt > l); deletedTransactions = deletedTransactions.filter(i => i.deletedAt > l); saveData(); }
function deleteProduct(id) { if (!confirm('حذف؟')) return; const i = products.findIndex(p => p.id === id); if (i > -1) { products[i].deletedAt = Date.now(); deletedProducts.push(products[i]); products.splice(i, 1); saveData(); location.reload(); } }
function delTrans(id) { if (!confirm('حذف فاکتور؟')) return; const i = transactions.findIndex(t => t.id === id); if (i > -1) { transactions[i].deletedAt = Date.now(); deletedTransactions.push(transactions[i]); transactions.splice(i, 1); saveData(); updateDashboard(); updateAccounting(); renderTrash(); renderAccounts(); } }
function restoreProduct(id) { const i = deletedProducts.findIndex(p => p.id === id); if (i > -1) { delete deletedProducts[i].deletedAt; products.push(deletedProducts[i]); deletedProducts.splice(i, 1); saveData(); location.reload(); } }
function restoreTrans(id) { const i = deletedTransactions.findIndex(t => t.id === id); if (i > -1) { delete deletedTransactions[i].deletedAt; transactions.push(deletedTransactions[i]); deletedTransactions.splice(i, 1); saveData(); location.reload(); } }

function renderTrash() {
    const pBody = document.getElementById('trashProductsBody'); pBody.innerHTML = '';
    deletedProducts.forEach(x => { pBody.innerHTML += `<tr><td>${x.name}</td><td>${new Date(x.deletedAt).toLocaleDateString('fa-IR')}</td><td class="actions-cell"><button class="btn-secondary" onclick="restoreProduct(${x.id})" title="بازیابی">♻️</button><button class="btn-danger" onclick="permDelProd(${x.id})" title="حذف کامل">🗑️</button></td></tr>`; });
    const tBody = document.getElementById('trashTransactionsBody'); tBody.innerHTML = '';
    deletedTransactions.forEach(t => { tBody.innerHTML += `<tr><td>${t.customerName || 'ناشناس'}</td><td>${t.totalPrice.toLocaleString()}</td><td class="actions-cell"><button class="btn-secondary" onclick="restoreTrans(${t.id})" title="بازیابی">♻️</button><button class="btn-danger" onclick="permDelTrans(${t.id})" title="حذف کامل">🗑️</button></td></tr>`; });
}

// ==========================================
// توابع مدیریت وضعیت حساب‌ها (تب چک و اقساط)
// ==========================================
function switchAccountTab(tabId) {
    document.querySelectorAll('.account-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    const btnChecks = document.getElementById('btnChecksTab'), btnInst = document.getElementById('btnInstallmentsTab');
    if (tabId === 'checksTab') { btnChecks.style.backgroundColor = 'var(--primary)'; btnInst.style.backgroundColor = '#475569'; }
    else { btnChecks.style.backgroundColor = '#475569'; btnInst.style.backgroundColor = 'var(--primary)'; }
}

function renderAccounts() {
    let pendingChecks = 0, pendingInst = 0, collectedNonCash = 0;
    const checksBody = document.getElementById('checksTableBody'), accountsBody = document.getElementById('accountsTableBody');
    if (!checksBody || !accountsBody) return;
    checksBody.innerHTML = ''; accountsBody.innerHTML = '';

    transactions.forEach(t => {
        // مدیریت چک‌ها
        if (t.checks && Array.isArray(t.checks)) {
            t.checks.forEach(c => {
                if (c.status === 'pending') pendingChecks += c.amount;
                else if (c.status === 'passed') collectedNonCash += c.amount;

                const statusLabels = { pending: 'در انتظار ⏳', passed: 'وصول شده ✅', bounced: 'برگشتی ❌' };

                let actionBtns = '';
                if (c.status === 'pending') {
                    actionBtns = `<button class="btn-secondary" style="padding: 4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'passed')">وصول شد ✅</button>
                                  <button class="btn-danger" style="padding: 4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'bounced')">برگشت ❌</button>`;
                } else if (c.status === 'bounced') {
                    actionBtns = `<button class="btn-secondary" style="padding: 4px 8px; font-size:11px; background:#8b5cf6;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'passed')">نقد شد (تاخیری) ✅</button>`;
                } else if (c.status === 'passed') {
                    actionBtns = `<button class="btn-warning" style="padding: 4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'pending')">لغو وصول ↩️</button>`;
                }

                checksBody.innerHTML += `<tr>
                    <td>
                        <strong>${t.customerName}</strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
                    </td>
                    <td>${c.bank}</td><td>${c.number}</td><td>${c.dueDate}</td><td>${c.amount.toLocaleString()} ریال</td><td><strong>${statusLabels[c.status]}</strong></td><td class="actions-cell">${actionBtns}</td></tr>`;
            });
        }

        // مدیریت اقساط
        if (t.installments && Array.isArray(t.installments)) {
            let paidCount = 0, unpaidSum = 0;
            t.installments.forEach(ins => { if (ins.status === 'unpaid') { pendingInst += ins.amount; unpaidSum += ins.amount; } else { collectedNonCash += ins.amount; paidCount += 1; } });
            const allPaid = paidCount === t.installments.length; const remaining = t.remainingBalance || 0;

            accountsBody.innerHTML += `<tr>
                <td>
                    <strong>${t.customerName}</strong>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">فاکتور: ${Math.floor(t.id).toString().slice(-6)}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3.5px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
                </td>
                <td>${t.totalPrice.toLocaleString()} ریال</td><td>${(t.downPayment || 0).toLocaleString()} ریال</td><td style="color: ${remaining > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">${remaining.toLocaleString()} ریال</td><td>${t.installments.length} / ${paidCount} قسط</td><td><strong>${allPaid ? 'تسویه کامل ✅' : 'فعال ⏳'}</strong></td><td><button class="btn-print" style="padding: 4px 10px; font-size:12px; background: #3b82f6" onclick="openInstallmentDetails(${t.id})">مشاهده دفترچه</button></td></tr>`;
        }
    });

    document.getElementById('totalPendingChecks').innerText = pendingChecks.toLocaleString() + ' ریال';
    document.getElementById('totalPendingInstallments').innerText = pendingInst.toLocaleString() + ' ریال';
    document.getElementById('totalCollectedNonCash').innerText = collectedNonCash.toLocaleString() + ' ریال';
}

function openInstallmentDetails(transId) {
    const t = transactions.find(x => x.id === transId);
    if (!t) return;
    document.getElementById('instModalCustomer').innerText = `${t.customerName} (تلفن: ${t.customerPhone || 'نامشخص'})`;
    document.getElementById('instModalTotalDebt').innerText = (t.totalPrice - t.downPayment).toLocaleString() + ' ریال';
    document.getElementById('instModalRemaining').innerText = t.remainingBalance.toLocaleString() + ' ریال';
    const tbody = document.getElementById('instDetailTableBody'); tbody.innerHTML = '';
    t.installments.forEach(ins => {
        const isPaid = ins.status === 'paid';
        tbody.innerHTML += `<tr><td>قسط ${ins.number}</td><td>${ins.dueDate}</td><td>${ins.amount.toLocaleString()} ریال</td><td style="color: ${isPaid ? 'var(--success)' : 'var(--warning)'}; font-weight: bold;">${isPaid ? 'پرداخت شده ✅' : 'در انتظار ⏳'}</td><td>${!isPaid ? `<button class="btn-secondary" style="padding: 2px 8px; font-size: 11px;" onclick="payInstallment(${t.id}, ${ins.number})">ثبت پرداخت</button>` : `<button class="btn-warning" style="padding: 2px 8px; font-size: 11px;" onclick="unpayInstallment(${t.id}, ${ins.number})">لغو</button> <span style="font-size:10px; color:#64748b;">(${ins.payDate})</span>`}</td></tr>`;
    });
    document.getElementById('installmentDetailModal').style.display = 'flex';
}

function payInstallment(transId, instNumber) {
    const t = transactions.find(x => x.id === transId);
    if (t && t.installments) {
        const ins = t.installments.find(x => x.number === instNumber);
        if (ins) { ins.status = 'paid'; ins.payDate = new Date().toLocaleDateString('fa-IR'); recalculateInvoice(transId); saveData(); renderAccounts(); openInstallmentDetails(transId); updateAccounting(); }
    }
}

function unpayInstallment(transId, instNumber) {
    const t = transactions.find(x => x.id === transId);
    if (t && t.installments) {
        const ins = t.installments.find(x => x.number === instNumber);
        if (ins) { ins.status = 'unpaid'; ins.payDate = null; recalculateInvoice(transId); saveData(); renderAccounts(); openInstallmentDetails(transId); updateAccounting(); }
    }
}

// ==========================================
// ویرایش محصولات و توابع جزئی
// ==========================================
function calcEditPrice() { const buyInput = document.getElementById('editProdBuy'), percentInput = document.getElementById('editProdPercent'), sellInput = document.getElementById('editProdSell'); const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0, percent = parseFloat(percentInput.value) || 0; if (buyPrice > 0) sellInput.value = Math.round(buyPrice + (buyPrice * (percent / 100))).toLocaleString(); }
function openEditModal(id) { const p = products.find(x => x.id === id); if (!p) return; document.getElementById('editProdId').value = p.id; document.getElementById('editProdBarcode').value = p.barcode; document.getElementById('editProdName').value = p.name; document.getElementById('editProdCategory').value = p.category || 'carpet'; document.getElementById('editProdUnit').value = p.unit; document.getElementById('editProdBrand').value = p.brand || ''; document.getElementById('editProdStock').value = p.stock; document.getElementById('editProdSerial').value = p.serial || ''; document.getElementById('editProdBuy').value = p.buyPrice.toLocaleString(); document.getElementById('editProdSell').value = p.sellPrice.toLocaleString(); document.getElementById('editProdPercent').value = p.percent || 0; document.getElementById('editModal').style.display = 'flex'; }
function saveEditProduct() { const id = parseInt(document.getElementById('editProdId').value), p = products.find(x => x.id === id); if (p) { p.name = document.getElementById('editProdName').value; p.category = document.getElementById('editProdCategory').value; p.unit = document.getElementById('editProdUnit').value; p.brand = document.getElementById('editProdBrand').value; p.stock = parseFloat(document.getElementById('editProdStock').value); p.serial = document.getElementById('editProdSerial').value.trim(); p.buyPrice = getRawPrice('editProdBuy'); p.sellPrice = getRawPrice('editProdSell'); p.percent = parseFloat(document.getElementById('editProdPercent').value) || 0; saveData(); renderInventoryTable(); calculateInventoryStats(); updateAccounting(); populateCustomSelect(); closeModal('editModal'); } }
function openReturnModal(id) { document.getElementById('returnTransId').value = id; document.getElementById('returnReason').value = ''; document.getElementById('returnModal').style.display = 'flex'; }
function confirmReturn() { const id = parseInt(document.getElementById('returnTransId').value), r = document.getElementById('returnReason').value; if (!r) return alert('دلیل؟'); const idx = transactions.findIndex(t => t.id === id); if (idx > -1) { const t = transactions[idx]; if (t.items) { t.items.forEach(it => { const p = products.find(x => x.id == it.productId); if (p) p.stock += it.amount; }); } else { const p = products.find(x => x.id == t.productId); if (p) p.stock += t.amount; } returns.unshift({ ...t, returnDate: new Date().toLocaleDateString('fa-IR'), returnReason: r }); transactions.splice(idx, 1); saveData(); updateDashboard(); updateAccounting(); renderInventoryTable(); calculateInventoryStats(); renderReturnsTable(); renderAccounts(); closeModal('returnModal'); alert('مرجوع شد'); } }
function renderReturnsTable() { const t = document.getElementById('returnsTableBody'); if (t) { t.innerHTML = ''; returns.forEach(r => { t.innerHTML += `<tr><td>${r.items ? r.items.length + ' قلم' : r.productName}</td><td style="color:#c0392b">${r.amount || '-'}</td><td>${r.totalPrice.toLocaleString()}</td><td>${r.returnDate}</td><td>${r.returnReason}</td></tr>` }); } }
function showSection(id) { document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section')); document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active')); document.getElementById(id).classList.add('active-section'); const btn = document.getElementById('btn-' + id); if (btn) btn.classList.add('active'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function exportData() { const d = { products, transactions, returns, deletedProducts, deletedTransactions }; const b = new Blob([JSON.stringify(d)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = "backup.json"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function importData(i) { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => { try { const d = JSON.parse(e.target.result); if (confirm('بازنشانی؟')) { products = d.products || []; transactions = d.transactions || []; returns = d.returns || []; deletedProducts = d.deletedProducts || []; deletedTransactions = d.deletedTransactions || []; saveData(); location.reload(); } } catch (z) { alert('خطا'); } }; r.readAsText(f); i.value = ''; }
function permDelTrans(id) { if (confirm('آیا مطمئن هستید؟ این فاکتور برای همیشه پاک می‌شود!')) { deletedTransactions = deletedTransactions.filter(t => t.id !== id); saveData(); renderTrash(); } }
function permDelProd(id) { if (confirm('آیا مطمئن هستید؟ این کالا برای همیشه پاک می‌شود!')) { deletedProducts = deletedProducts.filter(p => p.id !== id); saveData(); renderTrash(); } }
function autoCalcSell(prefix) { const buyInput = document.getElementById(prefix + 'BuyPrice'), percentInput = document.getElementById(prefix + 'Percent'), sellInput = document.getElementById(prefix + 'SellPrice'); if (!buyInput || !percentInput || !sellInput) return; const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0, percent = parseFloat(percentInput.value) || 0; if (buyPrice > 0) sellInput.value = Math.round(buyPrice + (buyPrice * (percent / 100))).toLocaleString(); }
function printLabel(id) { const product = products.find(p => p.id === id); if (!product) return; const barcodeSVG = createBarcodeSVG(product.barcode); const printArea = document.getElementById('printArea'); printArea.className = 'label-mode'; printArea.innerHTML = `<div class="label-container"><div class="label-name">${product.name}</div><div class="label-brand">${product.brand || ''}</div><div class="dashed-line"></div><div class="label-price">${product.sellPrice.toLocaleString()}</div><div class="label-unit">ریال</div><div class="dashed-line"></div><div class="label-name">موجودی : ${product.stock}</div><div class="barcode-wrapper" style="width:100%; height:60px; margin: 10px 0;">${barcodeSVG}</div><div class="label-brand">${product.barcode}</div></div>`; window.print(); setTimeout(() => { printArea.innerHTML = ''; printArea.className = ''; }, 1000); }
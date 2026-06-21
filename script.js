/**
 * Carpet Manager System
 * نسخه بهینه‌شده — رفع باگ‌ها و بهبود کد + فاکتور رسمی A4
 */

// ==========================================
// داده‌های اصلی
// ==========================================
let products = [];
let transactions = [];
let returns = [];
let deletedProducts = [];
let deletedTransactions = [];
let cart = [];
let currentChecks = [];

const categoryMap = {
    carpet: 'فرش و موکت',
    appliance: 'لوازم برقی',
    dishes: 'ظروف',
    other: 'سایر'
};

const paymentTypeMap = {
    cash: 'نقدی 💵',
    check: 'چکی 💳',
    installment: 'اقساطی 📅'
};

// ==========================================
// پایگاه داده IndexedDB
// ==========================================
const DB_NAME = 'CarpetManagerIndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'AppData';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
                e.target.result.createObjectStore(STORE_NAME);
            }
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
                if (dataRequest.result) {
                    products = dataRequest.result.products || [];
                    transactions = dataRequest.result.transactions || [];
                    returns = dataRequest.result.returns || [];
                    deletedProducts = dataRequest.result.deletedProducts || [];
                    deletedTransactions = dataRequest.result.deletedTransactions || [];
                } else {
                    loadDataFromLocalStorageFallback();
                }
                resolve();
            };
            dataRequest.onerror = () => {
                loadDataFromLocalStorageFallback();
                resolve();
            };
        });
    } catch (err) {
        loadDataFromLocalStorageFallback();
    }
}

function loadDataFromLocalStorageFallback() {
    try {
        if (localStorage.getItem('cm_products_v5')) products = JSON.parse(localStorage.getItem('cm_products_v5'));
        if (localStorage.getItem('cm_transactions_v5')) transactions = JSON.parse(localStorage.getItem('cm_transactions_v5'));
        if (localStorage.getItem('cm_returns_v5')) returns = JSON.parse(localStorage.getItem('cm_returns_v5'));
        if (localStorage.getItem('cm_deleted_prods')) deletedProducts = JSON.parse(localStorage.getItem('cm_deleted_prods'));
        if (localStorage.getItem('cm_deleted_trans')) deletedTransactions = JSON.parse(localStorage.getItem('cm_deleted_trans'));
    } catch (e) {
        console.error('خطا در بارگذاری localStorage:', e);
    }
    saveData();
}

async function saveData() {
    try {
        localStorage.setItem('cm_products_v5', JSON.stringify(products));
        localStorage.setItem('cm_transactions_v5', JSON.stringify(transactions));
        localStorage.setItem('cm_returns_v5', JSON.stringify(returns));
        localStorage.setItem('cm_deleted_prods', JSON.stringify(deletedProducts));
        localStorage.setItem('cm_deleted_trans', JSON.stringify(deletedTransactions));
    } catch (e) {
        console.warn('localStorage پر شد، فقط IndexedDB ذخیره می‌شود');
    }

    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(
            { products, transactions, returns, deletedProducts, deletedTransactions },
            'app_state'
        );
    } catch (err) {
        console.error('خطا در ذخیره IndexedDB:', err);
    }
}

// ==========================================
// پشتیبان‌گیری خودکار (هر ۲ روز یکبار)
// ==========================================
async function checkAndTriggerAutoBackup() {
    const lastBackupTime = localStorage.getItem('cm_last_backup_time');
    const now = Date.now();
    if (!lastBackupTime) {
        localStorage.setItem('cm_last_backup_time', now.toString());
        return;
    }
    if (now - parseInt(lastBackupTime) >= (2 * 24 * 60 * 60 * 1000)) {
        triggerSilentBackupDownload();
        localStorage.setItem('cm_last_backup_time', now.toString());
    }
}

function triggerSilentBackupDownload() {
    const d = { products, transactions, returns, deletedProducts, deletedTransactions };
    const blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auto_backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// راه‌اندازی اولیه
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    await loadDataFromIndexedDB();
    cleanupTrash();
    await checkAndTriggerAutoBackup();

    updateDashboard();
    updateAccounting();
    renderInventoryTable();
    renderReturnsTable();
    renderTrash();
    populateCustomSelect();
    calculateInventoryStats();
    setupEnterNavigation();
    renderAccounts();

    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

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
            onSelect: function () {
                calcInstallmentAmounts();
            }
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

// ==========================================
// توابع تاریخ شمسی (اصلاح و مقاوم‌سازی شده)
// ==========================================
function addJalaliMonths(dateStr, monthsToAdd) {
    if (!dateStr) return '';

    // ۱. تبدیل تمام اعداد فارسی و عربی به اعداد انگلیسی استاندارد
    let enDate = dateStr
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

    // ۲. حذف فاصله‌های اضافی و جایگزینی احتمالی خط‌تیره با اسلش (/)
    enDate = enDate.replace(/-/g, '/').replace(/\s/g, '');

    const parts = enDate.split('/');
    if (parts.length !== 3) return dateStr;

    // تبدیل مقادیر به عدد صحیح
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let d = parseInt(parts[2], 10);

    // اگر باز هم عدد تشخیص داده نشد، همان ورودی را برگردان
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

    // ۳. محاسبه ماه‌های اقساط
    m += monthsToAdd;
    while (m > 12) {
        m -= 12;
        y += 1;
    }

    // ۴. تشخیص روزهای آخر ماه (۳۱ روزه، ۳۰ روزه و اسفند)
    let maxDay;
    if (m <= 6) {
        maxDay = 31;
    } else if (m <= 11) {
        maxDay = 30;
    } else {
        // سال‌های کبیسه شمسی (تقریبی)
        const isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
        maxDay = isLeap ? 30 : 29;
    }

    if (d > maxDay) d = maxDay;

    // ۵. اضافه کردن صفر پشت ماه‌ها و روزهای یک رقمی (مثل 05 یا 09)
    const finalM = m < 10 ? '0' + m : m;
    const finalD = d < 10 ? '0' + d : d;

    return `${y}/${finalM}/${finalD}`;
}


// ==========================================
// Toast Notification (جایگزین alert)
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(message); return; }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2900);
}

// ==========================================
// داشبورد و حسابداری
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
            receivedForThis += (t.downPayment || 0);
            if (t.checks) t.checks.forEach(c => { if (c.status === 'passed') receivedForThis += c.amount; });
        } else if (t.paymentType === 'installment') {
            receivedForThis += (t.downPayment || 0);
            if (t.installments) t.installments.forEach(ins => { if (ins.status === 'paid') receivedForThis += ins.amount; });
        }

        totalCashReceived += receivedForThis;
        const profitRatio = t.totalPrice > 0 ? (receivedForThis / t.totalPrice) : 0;
        totalProfitRealized += (t.profit * profitRatio);
    });

    document.getElementById('totalSalesDisplay').innerHTML =
        `${totalSalesNominal.toLocaleString()} <br>
         <small style="color:#10b981; font-size:12px;">(وصولی قطعی: ${totalCashReceived.toLocaleString()})</small>`;

    document.getElementById('totalProfitDisplay').innerText =
        Math.round(totalProfitRealized).toLocaleString() + ' ریال';

    let val = 0;
    products.forEach(p => { val += (p.buyPrice * p.stock); });
    document.getElementById('totalInventoryValue').innerText = val.toLocaleString() + ' ریال';

    renderAccountingTable(transactions);
}

function renderTransactionsTable(list) {
    const tb = document.getElementById('transactionsTableBody');
    if (!tb) return;
    // استفاده از join به جای += برای جلوگیری از reflow مکرر و overflow
    tb.innerHTML = list.map(t => `
        <tr>
            <td>${Math.floor(t.id).toString().slice(-6)}</td>
            <td style="max-width:160px; overflow:hidden;">
                <strong>${t.customerName || '-'}</strong>
                <div style="font-size:11px; color:#64748b; margin-top:3px; direction:ltr; text-align:right;">${t.customerPhone || 'ثبت نشده'}</div>
            </td>
            <td style="white-space:nowrap;">${t.totalPrice.toLocaleString()}</td>
            <td style="color:#2563eb; font-weight:bold; white-space:nowrap;">${paymentTypeMap[t.paymentType] || 'نقدی 💵'}</td>
            <td style="white-space:nowrap;">${t.date}</td>
            <td class="actions-cell" style="white-space:nowrap;">
                <button class="btn-print" style="background:#0ea5e9;" onclick="openItemsModal(${t.id})" title="مشاهده اقلام خریداری شده">📦</button>
                <button class="btn-print" onclick="printInvoice(${t.id})" title="چاپ فاکتور">🖨️</button>
                <button class="btn-warning" onclick="openReturnModal(${t.id})" title="مرجوعی">↩️</button>
                <button class="btn-danger" onclick="delTrans(${t.id})" title="حذف">🗑️</button>
            </td>
        </tr>`).join('');
}

function renderAccountingTable(list) {
    const tb = document.getElementById('accountingTableBody');
    tb.innerHTML = '';
    list.forEach(t => {
        let received = 0;
        if (t.paymentType === 'cash') {
            received = t.totalPrice;
        } else if (t.paymentType === 'check') {
            received += (t.downPayment || 0);
            if (t.checks) t.checks.forEach(c => { if (c.status === 'passed') received += c.amount; });
        } else if (t.paymentType === 'installment') {
            received += (t.downPayment || 0);
            if (t.installments) t.installments.forEach(ins => { if (ins.status === 'paid') received += ins.amount; });
        }

        const realizedProfit = Math.round(t.profit * (t.totalPrice > 0 ? (received / t.totalPrice) : 0));
        tb.innerHTML += `
            <tr>
                <td>
                    <strong>${t.customerName || '-'}</strong>
                    <div style="font-size:11px; color:#64748b; margin-top:3px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
                </td>
                <td>${t.totalPrice.toLocaleString()}</td>
                <td style="color:#2563eb; font-weight:bold;">${received.toLocaleString()}</td>
                <td style="color:#10b981; font-weight:bold;">${realizedProfit.toLocaleString()}</td>
                <td>${paymentTypeMap[t.paymentType] || 'نقدی'}</td>
                <td>${t.date}</td>
            </tr>`;
    });
}

// ==========================================
// صندوق فروش و سبد خرید
// ==========================================
function togglePaymentFields() {
    const type = document.getElementById('paymentType').value;
    document.getElementById('downPaymentGroup').style.display =
        (type === 'installment' || type === 'check') ? 'block' : 'none';
    document.getElementById('checkFields').style.display =
        (type === 'check') ? 'block' : 'none';
    document.getElementById('installmentFields').style.display =
        (type === 'installment') ? 'block' : 'none';
    calcInstallmentAmounts();
    renderCheckList();
}

function calcInstallmentAmounts() {
    let total = 0;
    cart.forEach(item => total += item.total);
    const down = getRawPrice('downPayment');
    const count = parseInt(document.getElementById('installmentCount').value) || 1;
    const interestPercentEl = document.getElementById('installmentInterestPercent');
    const interestPercent = interestPercentEl ? (parseFloat(interestPercentEl.value) || 0) : 0;
    const remaining = total - down;
    const displayEl = document.getElementById('installmentAmountDisplay');
    if (!displayEl) return;
    if (remaining < 0) {
        displayEl.value = 'پیش‌پرداخت مازاد!';
        const beforeEl = document.getElementById('instBeforeInterest');
        const interestEl = document.getElementById('instInterestAmount');
        const afterEl = document.getElementById('instAfterInterest');
        if (beforeEl) beforeEl.innerText = '0';
        if (interestEl) interestEl.innerText = '0';
        if (afterEl) afterEl.innerText = '0';
        return;
    }
    const interestAmount = Math.round(remaining * (interestPercent / 100));
    const remainingWithInterest = remaining + interestAmount;
    displayEl.value = Math.round(remainingWithInterest / count).toLocaleString() + ' ریال';

    const beforeEl = document.getElementById('instBeforeInterest');
    const interestEl = document.getElementById('instInterestAmount');
    const afterEl = document.getElementById('instAfterInterest');
    if (beforeEl) beforeEl.innerText = remaining.toLocaleString() + ' ریال';
    if (interestEl) interestEl.innerText = interestAmount.toLocaleString() + ' ریال';
    if (afterEl) afterEl.innerText = remainingWithInterest.toLocaleString() + ' ریال';
}

function addCheckToList() {
    const bank = document.getElementById('chkBank').value.trim();
    const num = document.getElementById('chkNum').value.trim();
    const amt = getRawPrice('chkAmt');
    const date = document.getElementById('chkDate').value.trim();

    if (!bank || !num || !amt || !date) {
        showToast('لطفاً تمام اطلاعات چک را وارد کنید', 'warning');
        return;
    }

    currentChecks.push({
        id: Date.now() + Math.random(),
        bank, number: num, amount: amt,
        dueDate: date, status: 'pending'
    });

    document.getElementById('chkBank').value = '';
    document.getElementById('chkNum').value = '';
    document.getElementById('chkAmt').value = '';
    document.getElementById('chkDate').value = '';

    renderCheckList();
}

function removeCheckFromList(index) {
    currentChecks.splice(index, 1);
    renderCheckList();
}

function renderCheckList() {
    const tbody = document.getElementById('checkListBody');
    tbody.innerHTML = '';
    let sumChecks = 0;

    currentChecks.forEach((c, i) => {
        sumChecks += c.amount;
        tbody.innerHTML += `
            <tr>
                <td>${c.bank}</td>
                <td>${c.number}</td>
                <td>${c.amount.toLocaleString()}</td>
                <td>${c.dueDate}</td>
                <td><button class="btn-danger" style="padding:2px 8px;" onclick="removeCheckFromList(${i})">×</button></td>
            </tr>`;
    });

    let total = 0;
    cart.forEach(item => total += item.total);
    const down = getRawPrice('downPayment') || 0;
    const rem = total - down - sumChecks;

    document.getElementById('checkTotalAmount').innerText = Math.max(0, total - down).toLocaleString() + ' ریال';
    document.getElementById('checkEnteredAmount').innerText = sumChecks.toLocaleString() + ' ریال';

    const remEl = document.getElementById('checkRemainingAmount');
    remEl.innerText = rem.toLocaleString() + ' ریال';
    remEl.style.color = rem === 0 ? 'var(--success)' : (rem < 0 ? 'var(--danger)' : '#f59e0b');
}

function calculateLivePrice() {
    const pid = document.getElementById('selectedProductId').value;
    const amt = parseFloat(document.getElementById('saleMeters').value);
    const per = parseFloat(document.getElementById('salePercent').value) || 0;
    const liveEl = document.getElementById('liveFinalPrice');
    if (!liveEl) return;

    if (pid && !isNaN(amt) && amt > 0) {
        const p = products.find(x => x.id == pid);
        if (p) {
            // فرمول یکسان با addToCart: قیمت × مقدار × (1 + درصد/100)
            // اگر درصد منفی باشد (تخفیف) هم درست کار می‌کند
            const finalPrice = Math.round(p.sellPrice * amt * (1 + per / 100));
            liveEl.innerText = Math.max(0, finalPrice).toLocaleString() + ' ریال';
            return;
        }
    }
    liveEl.innerText = '0 ریال';
}

function addToCart() {
    const pid = document.getElementById('selectedProductId').value;
    const amt = parseFloat(document.getElementById('saleMeters').value);
    const percent = parseFloat(document.getElementById('salePercent').value) || 0;

    if (!pid) { showToast('محصول را انتخاب کنید', 'warning'); return; }
    const p = products.find(x => x.id == pid);
    if (!p) { showToast('محصول نامعتبر است', 'error'); return; }
    if (isNaN(amt) || amt <= 0) { showToast('مقدار نامعتبر است', 'warning'); return; }

    const inCart = cart.filter(c => c.productId == pid).reduce((sum, c) => sum + c.amount, 0);
    if ((p.stock - inCart) < amt) {
        showToast(`موجودی کافی نیست (موجودی: ${p.stock - inCart})`, 'error');
        return;
    }

    cart.push({
        productId: p.id,
        productName: p.name,
        serial: p.serial || '',
        barcode: p.barcode || '',
        unitPrice: p.sellPrice,
        buyPrice: p.buyPrice,
        amount: amt,
        unit: p.unit,
        percent: percent,
        total: Math.round((p.sellPrice * amt) * (1 + percent / 100))
    });

    renderCart();

    document.getElementById('saleMeters').value = '';
    document.getElementById('salePercent').value = '0';
    document.getElementById('productSearchInput').value = '';
    document.getElementById('selectedProductId').value = '';
    document.getElementById('unitPriceLabel').innerText = 'قیمت: -';
    document.getElementById('stockLabel').innerText = 'موجودی: -';
    document.getElementById('liveFinalPrice').innerText = '0 ریال';
    document.getElementById('productSearchInput').focus();
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.total;
        tbody.innerHTML += `
            <tr>
                <td>${item.productName}${item.percent != 0 ? ` <small>(${item.percent}%)</small>` : ''}</td>
                <td>${item.amount}</td>
                <td>${Math.round(item.total / item.amount).toLocaleString()}</td>
                <td>${item.total.toLocaleString()}</td>
                <td><button class="btn-danger" style="padding:2px 8px" onclick="removeFromCart(${index})">×</button></td>
            </tr>`;
    });

    document.getElementById('cartTotalDisplay').innerText = total.toLocaleString() + ' ریال';
    calcInstallmentAmounts();
    renderCheckList();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (confirm('سبد خرید خالی شود؟')) {
        cart = [];
        renderCart();
    }
}

function checkout() {
    const custName = document.getElementById('custName').value.trim();
    const custPhone = document.getElementById('custPhone').value.trim();
    const paymentType = document.getElementById('paymentType').value;

    if (cart.length === 0) { showToast('سبد خرید خالی است', 'warning'); return; }
    if (!custName) { showToast('نام مشتری الزامی است', 'warning'); return; }

    let totalAmount = 0;
    let totalProfit = 0;
    const itemsToSave = [];

    // بررسی موجودی قبل از کم کردن
    for (const item of cart) {
        const p = products.find(x => x.id == item.productId);
        if (!p) {
            showToast(`محصول "${item.productName}" در انبار یافت نشد`, 'error');
            return;
        }
        if (p.stock < item.amount) {
            showToast(`موجودی "${p.name}" کافی نیست`, 'error');
            return;
        }
    }

    // کم کردن موجودی و محاسبه مجموع
    cart.forEach(item => {
        const p = products.find(x => x.id == item.productId);
        if (p) {
            p.stock -= item.amount;
            totalAmount += item.total;
            totalProfit += (item.total - (item.buyPrice * item.amount));
            itemsToSave.push({ ...item });
        }
    });

    let checks = [];
    let installments = [];
    const downPaymentVal = getRawPrice('downPayment') || 0;
    let remainingBalance = 0;
    let installmentInterestPercent = 0;
    let installmentInterestAmount = 0;

    if (paymentType === 'check') {
        if (currentChecks.length === 0) {
            showToast('هیچ چکی ثبت نشده است!', 'warning');
            cart.forEach(item => {
                const p = products.find(x => x.id == item.productId);
                if (p) p.stock += item.amount;
            });
            return;
        }
        const sumChecks = currentChecks.reduce((s, c) => s + c.amount, 0);
        if (downPaymentVal + sumChecks !== totalAmount) {
            if (!confirm('مجموع پیش‌پرداخت و چک‌ها با مبلغ کل برابر نیست! ادامه می‌دهید؟')) {
                cart.forEach(item => {
                    const p = products.find(x => x.id == item.productId);
                    if (p) p.stock += item.amount;
                });
                return;
            }
        }
        checks = [...currentChecks];
        remainingBalance = totalAmount - downPaymentVal;

    } else if (paymentType === 'installment') {
        if (downPaymentVal > totalAmount) {
            showToast('مبلغ پیش‌پرداخت بزرگتر از فاکتور است', 'error');
            cart.forEach(item => {
                const p = products.find(x => x.id == item.productId);
                if (p) p.stock += item.amount;
            });
            return;
        }
        const count = parseInt(document.getElementById('installmentCount').value) || 1;
        const firstDate = document.getElementById('firstInstallmentDate').value.trim();
        if (!firstDate) {
            showToast('تاریخ اولین قسط را مشخص کنید', 'warning');
            cart.forEach(item => {
                const p = products.find(x => x.id == item.productId);
                if (p) p.stock += item.amount;
            });
            return;
        }
        const interestPercentEl = document.getElementById('installmentInterestPercent');
        installmentInterestPercent = interestPercentEl ? (parseFloat(interestPercentEl.value) || 0) : 0;
        const remainingBeforeInterest = totalAmount - downPaymentVal;
        installmentInterestAmount = Math.round(remainingBeforeInterest * (installmentInterestPercent / 100));
        remainingBalance = remainingBeforeInterest + installmentInterestAmount;
        totalProfit += installmentInterestAmount;
        const instAmount = Math.round(remainingBalance / count);
        for (let i = 0; i < count; i++) {
            installments.push({
                number: i + 1,
                dueDate: addJalaliMonths(firstDate, i),
                amount: instAmount,
                status: 'unpaid',
                payDate: null
            });
        }
    }

    const transaction = {
        id: Date.now(),
        customerName: custName,
        customerPhone: custPhone,
        items: itemsToSave,
        totalPrice: totalAmount,
        profit: totalProfit,
        date: new Date().toLocaleDateString('fa-IR'),
        paymentType,
        checks,
        installments,
        downPayment: downPaymentVal,
        remainingBalance,
        installmentInterestPercent,
        installmentInterestAmount
    };

    transactions.unshift(transaction);
    saveData();
    renderInventoryTable();
    calculateInventoryStats();
    updateDashboard();
    updateAccounting();
    populateCustomSelect();
    renderAccounts();

    // ریست فرم فروش
    cart = [];
    currentChecks = [];
    renderCart();
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('paymentType').value = 'cash';
    document.getElementById('downPayment').value = '';
    document.getElementById('chkBank').value = '';
    document.getElementById('chkNum').value = '';
    document.getElementById('chkAmt').value = '';
    document.getElementById('chkDate').value = '';
    document.getElementById('installmentCount').value = '6';
    document.getElementById('firstInstallmentDate').value = '';
    const interestResetEl = document.getElementById('installmentInterestPercent');
    if (interestResetEl) interestResetEl.value = '0';
    togglePaymentFields();

    showToast('فاکتور با موفقیت ثبت شد ✅', 'success');
}

// ==========================================
// مدیریت حساب‌های چک و اقساط
// ==========================================
function recalculateInvoice(transId) {
    const t = transactions.find(x => x.id === transId);
    if (!t) return;
    if (t.paymentType === 'check') {
        let passedSum = 0;
        t.checks.forEach(c => { if (c.status === 'passed') passedSum += c.amount; });
        t.remainingBalance = Math.max(0, t.totalPrice - (t.downPayment || 0) - passedSum);
    } else if (t.paymentType === 'installment') {
        let paid = 0;
        t.installments.forEach(ins => { if (ins.status === 'paid') paid += ins.amount; });
        const totalPayable = t.totalPrice - (t.downPayment || 0) + (t.installmentInterestAmount || 0);
        t.remainingBalance = Math.max(0, totalPayable - paid);
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

function switchAccountTab(tabId) {
    document.querySelectorAll('.account-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    const btnChecks = document.getElementById('btnChecksTab');
    const btnInst = document.getElementById('btnInstallmentsTab');
    if (tabId === 'checksTab') {
        btnChecks.style.backgroundColor = 'var(--primary)';
        btnInst.style.backgroundColor = '#475569';
    } else {
        btnChecks.style.backgroundColor = '#475569';
        btnInst.style.backgroundColor = 'var(--primary)';
    }
}

function renderAccounts() {
    let pendingChecks = 0, pendingInst = 0, collectedNonCash = 0;
    const checksBody = document.getElementById('checksTableBody');
    const accountsBody = document.getElementById('accountsTableBody');
    if (!checksBody || !accountsBody) return;
    checksBody.innerHTML = '';
    accountsBody.innerHTML = '';

    transactions.forEach(t => {
        // چک‌ها
        if (t.paymentType === 'check' && t.checks && Array.isArray(t.checks)) {
            t.checks.forEach(c => {
                if (c.status === 'pending') pendingChecks += c.amount;
                else if (c.status === 'passed') collectedNonCash += c.amount;

                const statusLabels = {
                    pending: 'در انتظار ⏳',
                    passed: 'وصول شده ✅',
                    bounced: 'برگشتی ❌'
                };

                let actionBtns = '';
                if (c.status === 'pending') {
                    actionBtns = `
                        <button class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'passed')">وصول شد ✅</button>
                        <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'bounced')">برگشت ❌</button>`;
                } else if (c.status === 'bounced') {
                    actionBtns = `<button class="btn-secondary" style="padding:4px 8px; font-size:11px; background:#8b5cf6;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'passed')">نقد شد ✅</button>`;
                } else if (c.status === 'passed') {
                    actionBtns = `<button class="btn-warning" style="padding:4px 8px; font-size:11px;" onclick="updateCheckStatus(${t.id}, ${c.id}, 'pending')">لغو وصول ↩️</button>`;
                }

                checksBody.innerHTML += `
                    <tr>
                        <td>
                            <strong>${t.customerName}</strong>
                            <div style="font-size:11px; color:#64748b; margin-top:3px;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
                        </td>
                        <td>${c.bank}</td>
                        <td>${c.number}</td>
                        <td>${c.dueDate}</td>
                        <td>${c.amount.toLocaleString()} ریال</td>
                        <td><strong>${statusLabels[c.status] || '-'}</strong></td>
                        <td class="actions-cell">${actionBtns}</td>
                    </tr>`;
            });
        }

        // اقساط
        if (t.paymentType === 'installment' && t.installments && Array.isArray(t.installments)) {
            let paidCount = 0;
            t.installments.forEach(ins => {
                if (ins.status === 'unpaid') {
                    pendingInst += ins.amount;
                } else {
                    collectedNonCash += ins.amount;
                    paidCount++;
                }
            });
            const allPaid = paidCount === t.installments.length;
            const remaining = t.remainingBalance || 0;

            accountsBody.innerHTML += `
                <tr>
                    <td>
                        <strong>${t.customerName}</strong>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">فاکتور: ${Math.floor(t.id).toString().slice(-6)}</div>
                        <div style="font-size:11px; color:#64748b;">📞 <span dir="ltr">${t.customerPhone || 'ثبت نشده'}</span></div>
                    </td>
                    <td>${t.totalPrice.toLocaleString()} ریال</td>
                    <td>${(t.downPayment || 0).toLocaleString()} ریال</td>
                    <td style="color:${remaining > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:bold;">${remaining.toLocaleString()} ریال</td>
                    <td>${t.installments.length} / ${paidCount} قسط</td>
                    <td><strong>${allPaid ? 'تسویه کامل ✅' : 'فعال ⏳'}</strong></td>
                    <td><button class="btn-print" style="padding:4px 10px; font-size:12px; background:#3b82f6;" onclick="openInstallmentDetails(${t.id})">مشاهده دفترچه</button></td>
                </tr>`;
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
    const initialDebt = (t.totalPrice - (t.downPayment || 0)) + (t.installmentInterestAmount || 0);
    document.getElementById('instModalTotalDebt').innerText = initialDebt.toLocaleString() + ' ریال';
    document.getElementById('instModalRemaining').innerText = (t.remainingBalance || 0).toLocaleString() + ' ریال';

    const tbody = document.getElementById('instDetailTableBody');
    tbody.innerHTML = '';
    t.installments.forEach(ins => {
        const isPaid = ins.status === 'paid';
        tbody.innerHTML += `
            <tr>
                <td>قسط ${ins.number}</td>
                <td>${ins.dueDate}</td>
                <td>${ins.amount.toLocaleString()} ریال</td>
                <td style="color:${isPaid ? 'var(--success)' : 'var(--warning)'}; font-weight:bold;">${isPaid ? 'پرداخت شده ✅' : 'در انتظار ⏳'}</td>
                <td>
                    ${!isPaid
                ? `<button class="btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="payInstallment(${t.id}, ${ins.number})">ثبت پرداخت</button>`
                : `<button class="btn-warning" style="padding:2px 8px; font-size:11px;" onclick="unpayInstallment(${t.id}, ${ins.number})">لغو</button>
                           <span style="font-size:10px; color:#64748b;">(${ins.payDate})</span>`
            }
                </td>
            </tr>`;
    });
    document.getElementById('installmentDetailModal').style.display = 'flex';
}

function openItemsModal(transId) {
    const t = transactions.find(x => x.id === transId);
    if (!t) return;

    document.getElementById('itemsModalCustomer').innerText = t.customerName || '-';
    document.getElementById('itemsModalInvoiceNum').innerText = Math.floor(t.id).toString().slice(-6);
    document.getElementById('itemsModalCount').innerText = (t.items || []).length;
    document.getElementById('itemsModalTotal').innerText = (t.totalPrice || 0).toLocaleString() + ' ریال';

    const tbody = document.getElementById('itemsDetailTableBody');
    tbody.innerHTML = '';
    (t.items || []).forEach((item, idx) => {
        const unitLabel = item.unit === 'meter' ? 'متر' : 'عدد';
        const unitPrice = item.amount ? Math.round(item.total / item.amount) : 0;
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.productName || '-'}${item.percent ? ` <small>(${item.percent}%)</small>` : ''}</td>
                <td>${item.serial || '-'}</td>
                <td>${item.amount} ${unitLabel}</td>
                <td>${unitPrice.toLocaleString()} ریال</td>
                <td>${(item.total || 0).toLocaleString()} ریال</td>
            </tr>`;
    });
    document.getElementById('itemsDetailModal').style.display = 'flex';
}

function payInstallment(transId, instNumber) {
    const t = transactions.find(x => x.id === transId);
    if (t && t.installments) {
        const ins = t.installments.find(x => x.number === instNumber);
        if (ins) {
            ins.status = 'paid';
            ins.payDate = new Date().toLocaleDateString('fa-IR');
            recalculateInvoice(transId);
            saveData();
            renderAccounts();
            openInstallmentDetails(transId);
            updateAccounting();
        }
    }
}

function unpayInstallment(transId, instNumber) {
    const t = transactions.find(x => x.id === transId);
    if (t && t.installments) {
        const ins = t.installments.find(x => x.number === instNumber);
        if (ins) {
            ins.status = 'unpaid';
            ins.payDate = null;
            recalculateInvoice(transId);
            saveData();
            renderAccounts();
            openInstallmentDetails(transId);
            updateAccounting();
        }
    }
}

// ==========================================
// مدیریت انبار
// ==========================================
function onCategoryChange() {
    const cat = document.getElementById('prodCategory').value;
    document.getElementById('prodUnit').value = (cat === 'carpet') ? 'meter' : 'piece';
}

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

    if (!name || isNaN(stock) || !sellPrice) {
        showToast('اطلاعات ناقص است (نام، موجودی و قیمت فروش الزامی است)', 'warning');
        return;
    }

    const newBarcode = generateBarcodeValue();
    products.push({
        id: Date.now(),
        barcode: newBarcode,
        name, category, unit, brand, stock,
        serial, buyPrice, sellPrice, percent,
        entryDate: new Date().toLocaleDateString('fa-IR')
    });

    saveData();
    renderInventoryTable();
    calculateInventoryStats();
    updateAccounting();
    populateCustomSelect();
    updateDashboard();

    // ریست فرم
    ['prodName', 'prodBrand', 'prodSerial', 'prodBuyPrice', 'prodPercent', 'prodSellPrice'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('prodCategory').value = 'carpet';
    document.getElementById('prodUnit').value = 'meter';
    document.getElementById('prodStock').value = '';
    document.getElementById('prodName').focus();
    showToast('محصول با موفقیت اضافه شد ✅', 'success');
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    [...products].reverse().forEach(p => {
        const catLabel = categoryMap[p.category] || 'نامشخص';
        const isLowStock = p.stock < 10;
        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace; font-size:12px;">${p.barcode}</td>
                <td>
                    <strong>${p.name}</strong>
                    <div style="font-size:11px; color:#64748b; margin-top:3px;">
                        ${catLabel}${p.brand ? ` | برند: ${p.brand}` : ''}${p.serial ? ` | مشخصات: ${p.serial}` : ''}
                    </div>
                </td>
                <td style="color:${isLowStock ? 'var(--danger)' : 'inherit'}; font-weight:${isLowStock ? 'bold' : 'normal'}">
                    ${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}
                    ${isLowStock ? ' ⚠️' : ''}
                </td>
                <td>${p.sellPrice.toLocaleString()} ریال</td>
                <td class="actions-cell">
                    <button class="btn-print" onclick="printLabel(${p.id})" title="چاپ لیبل">🏷️</button>
                    <button class="btn-warning" onclick="openEditModal(${p.id})" title="ویرایش">✏️</button>
                    <button class="btn-danger" onclick="deleteProduct(${p.id})" title="حذف">🗑️</button>
                </td>
            </tr>`;
    });
}

function calculateInventoryStats() {
    let meters = 0, pieces = 0;
    products.forEach(p => {
        if (String(p.unit) === 'meter') meters += p.stock;
        else pieces += p.stock;
    });
    document.getElementById('totalStockMeters').innerText = meters + ' متر';
    document.getElementById('totalStockPieces').innerText = pieces + ' عدد';
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

function generateBarcodeValue() {
    let code;
    do {
        code = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (products.some(p => p.barcode === code));
    return code;
}

// ==========================================
// Dropdown انتخاب محصول
// ==========================================
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
                ${catLabel}${brandText}${serialText} (موجودی: ${p.stock})
            </small>`;
        d.dataset.search = (p.name + ' ' + (p.brand || '') + ' ' + catLabel + ' ' + (p.serial || '') + ' ' + p.barcode).toLowerCase();
        d.onclick = () => selectProduct(p);
        list.appendChild(d);
    });
}

function selectProduct(p) {
    document.getElementById('productSearchInput').value = p.serial ? `${p.name} (سریال: ${p.serial})` : p.name;
    document.getElementById('selectedProductId').value = p.id;
    document.getElementById('dropdownList').classList.remove('show');
    document.getElementById('unitPriceLabel').innerText = `قیمت: ${p.sellPrice.toLocaleString()} ریال`;
    document.getElementById('stockLabel').innerText = `موجودی: ${p.stock} ${p.unit === 'meter' ? 'متر' : 'عدد'}`;
    document.getElementById('saleMeters').focus();
    calculateLivePrice();
}

function handleBarcodeScan(e) {
    if (e.key === 'Enter') {
        const code = e.target.value.trim();
        const p = products.find(x => x.barcode === code);
        if (p) selectProduct(p);
        else showToast('بارکد یافت نشد', 'error');
        e.target.value = '';
    }
}

function toggleDropdown() {
    document.getElementById('dropdownList').classList.toggle('show');
    if (document.getElementById('dropdownList').classList.contains('show')) {
        filterDropdown(document.getElementById('productSearchInput').value);
    }
}

function filterDropdown(q) {
    const list = document.getElementById('dropdownList');
    list.classList.add('show');
    // حذف toLowerCase برای فارسی — مقایسه مستقیم رشته
    const qNorm = q.trim();
    const items = list.children;
    for (let item of items) {
        item.style.display = (qNorm === '' || item.dataset.search.includes(qNorm)) ? 'block' : 'none';
    }
}

function searchTransactions(q) {
    if (!q) { renderTransactionsTable(transactions); return; }
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(lower)) ||
        (t.customerPhone && t.customerPhone.includes(lower))
    );
    renderTransactionsTable(filtered);
}

function searchAccounting(q) {
    if (!q) { renderAccountingTable(transactions); return; }
    const lower = q.toLowerCase();
    const filtered = transactions.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(lower)) ||
        (t.customerPhone && t.customerPhone.includes(lower))
    );
    renderAccountingTable(filtered);
}

// ==========================================
// حذف، بازیابی، سطل زباله
// ==========================================
function cleanupTrash() {
    const limit = Date.now() - (30 * 24 * 3600 * 1000);
    deletedProducts = deletedProducts.filter(p => p.deletedAt > limit);
    deletedTransactions = deletedTransactions.filter(t => t.deletedAt > limit);
    saveData();
}

function deleteProduct(id) {
    if (!confirm('این محصول حذف شود؟')) return;
    const idx = products.findIndex(p => p.id === id);
    if (idx > -1) {
        products[idx].deletedAt = Date.now();
        deletedProducts.push(products[idx]);
        products.splice(idx, 1);
        saveData();
        renderInventoryTable();
        calculateInventoryStats();
        updateAccounting();
        populateCustomSelect();
        updateDashboard();
        renderTrash();
    }
}

function delTrans(id) {
    if (!confirm('این فاکتور حذف شود؟')) return;
    const idx = transactions.findIndex(t => t.id === id);
    if (idx > -1) {
        transactions[idx].deletedAt = Date.now();
        deletedTransactions.push(transactions[idx]);
        transactions.splice(idx, 1);
        saveData();
        updateDashboard();
        updateAccounting();
        renderInventoryTable();
        calculateInventoryStats();
        renderTrash();
        renderAccounts();
    }
}

function restoreProduct(id) {
    const idx = deletedProducts.findIndex(p => p.id === id);
    if (idx > -1) {
        delete deletedProducts[idx].deletedAt;
        products.push(deletedProducts[idx]);
        deletedProducts.splice(idx, 1);
        saveData();
        renderInventoryTable();
        calculateInventoryStats();
        populateCustomSelect();
        updateDashboard();
        renderTrash();
        showToast('محصول بازیابی شد ✅', 'success');
    }
}

function restoreTrans(id) {
    const idx = deletedTransactions.findIndex(t => t.id === id);
    if (idx > -1) {
        delete deletedTransactions[idx].deletedAt;
        transactions.push(deletedTransactions[idx]);
        deletedTransactions.splice(idx, 1);
        saveData();
        updateDashboard();
        updateAccounting();
        renderInventoryTable();
        calculateInventoryStats();
        renderAccounts();
        renderTrash();
        showToast('فاکتور بازیابی شد ✅', 'success');
    }
}

function renderTrash() {
    const pBody = document.getElementById('trashProductsBody');
    if (!pBody) return;
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
    if (!tBody) return;
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

function permDelTrans(id) {
    if (confirm('این فاکتور برای همیشه پاک می‌شود!')) {
        deletedTransactions = deletedTransactions.filter(t => t.id !== id);
        saveData();
        renderTrash();
    }
}

function permDelProd(id) {
    if (confirm('این کالا برای همیشه پاک می‌شود!')) {
        deletedProducts = deletedProducts.filter(p => p.id !== id);
        saveData();
        renderTrash();
    }
}

// ==========================================
// ویرایش محصول
// ==========================================
function calcEditPrice() {
    const buyInput = document.getElementById('editProdBuy');
    const percentInput = document.getElementById('editProdPercent');
    const sellInput = document.getElementById('editProdSell');
    const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0;
    const percent = parseFloat(percentInput.value) || 0;
    if (buyPrice > 0) {
        sellInput.value = Math.round(buyPrice + (buyPrice * (percent / 100))).toLocaleString();
    }
}

function openEditModal(id) {
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
}

function saveEditProduct() {
    const id = parseInt(document.getElementById('editProdId').value);
    const p = products.find(x => x.id === id);
    if (!p) return;
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
    showToast('تغییرات ذخیره شد ✅', 'success');
}

// ==========================================
// مرجوعی‌ها
// ==========================================
function openReturnModal(id) {
    document.getElementById('returnTransId').value = id;
    document.getElementById('returnReason').value = '';
    document.getElementById('returnModal').style.display = 'flex';
}

function confirmReturn() {
    const id = parseInt(document.getElementById('returnTransId').value);
    const reason = document.getElementById('returnReason').value.trim();
    if (!reason) { showToast('دلیل مرجوعی الزامی است', 'warning'); return; }

    const idx = transactions.findIndex(t => t.id === id);
    if (idx > -1) {
        const t = transactions[idx];
        // برگرداندن موجودی
        if (t.items) {
            t.items.forEach(item => {
                const p = products.find(x => x.id == item.productId);
                if (p) p.stock += item.amount;
            });
        } else {
            const p = products.find(x => x.id == t.productId);
            if (p) p.stock += t.amount;
        }
        returns.unshift({
            ...t,
            returnDate: new Date().toLocaleDateString('fa-IR'),
            returnReason: reason
        });
        transactions.splice(idx, 1);
        saveData();
        updateDashboard();
        updateAccounting();
        renderInventoryTable();
        calculateInventoryStats();
        renderReturnsTable();
        renderAccounts();
        closeModal('returnModal');
        showToast('مرجوعی ثبت شد', 'success');
    }
}

function renderReturnsTable() {
    const tbody = document.getElementById('returnsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    returns.forEach(r => {
        const itemsDesc = r.items ? r.items.map(i => i.productName).join('، ') : (r.productName || '-');
        tbody.innerHTML += `
            <tr>
                <td>${itemsDesc}</td>
                <td style="color:#c0392b">${r.returnReason}</td>
                <td>${r.totalPrice.toLocaleString()}</td>
                <td>${r.returnDate}</td>
            </tr>`;
    });
}

// ==========================================
// اطلاعات ثابت فروشگاه — فقط اینجا ویرایش کنید
// ==========================================
const STORE_INFO = {
    name: 'فرش و لوازم خانگی احمدیه',          // نام فروشگاه
    // subtitle: 'نمایندگی موکت ظریف مصور احمدی',    // زیرعنوان
    phone1: '09928905769',                       // شماره اول
    phone2: '09938812959',                       // شماره دوم
    instagram: 'zarifmosavarmis',                   // پیج اینستاگرام (بدون @)
    address: 'مسجدسلیمان ٫ دراشکفت بالاتر از پزشکی قانونی‌ ٫ جنب مبل طهران',
    city: 'مسجدسلیمان',                             // شهر
    slogan: 'کیفیت را با قیمت مناسب تجربه کنید' // شعار (اختیاری)
};


// تابع تبدیل عدد به حروف فارسی
function numToPersianWords(number) {
    const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
    const tens = ["", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
    const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
    const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
    const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

    if (number === 0) return "صفر";
    let numStr = number.toString();
    let result = [];
    let scaleIndex = 0;

    while (numStr.length > 0) {
        let chunk = numStr.slice(-3);
        numStr = numStr.slice(0, -3);
        let chunkNum = parseInt(chunk);

        if (chunkNum !== 0) {
            let chunkText = [];
            let h = Math.floor(chunkNum / 100);
            let t = Math.floor((chunkNum % 100) / 10);
            let u = chunkNum % 10;

            if (h > 0) chunkText.push(hundreds[h]);
            if (t === 1) {
                chunkText.push(teens[u]);
            } else {
                if (t > 1) chunkText.push(tens[t]);
                if (u > 0) chunkText.push(units[u]);
            }

            let text = chunkText.join(" و ");
            if (scaleIndex > 0) text += " " + scales[scaleIndex];
            result.unshift(text);
        }
        scaleIndex++;
    }
    return result.join(" و ") + " ریال";
}

// چحلاپ فاکتور (قالب A4 حرفه‌ای — طرح نوین)
function printInvoice(transId) {
    const transaction = transactions.find(t => t.id === transId);
    if (!transaction) return;

    let itemsHtml = '';
    let rowNum = 1;
    const EMPTY_ROWS = 8; // حداقل ردیف‌های خالی جدول

    if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach(item => {
            const unitPrice = Math.round(item.total / item.amount);
            const itemCode = item.barcode || item.productId?.toString().slice(-6) || '—';
            itemsHtml += `
                <tr>
                    <td class="tc">${rowNum++}</td>
                    <td class="tc">${itemCode}</td>
                    <td class="tr">${item.productName}${item.serial ? ` <small style="color:#555;">(${item.serial})</small>` : ''}</td>
                    <td class="tc">${item.amount}</td>
                    <td class="tc">${item.unit === 'meter' ? 'متر' : 'دستگاه'}</td>
                    <td class="tn">${unitPrice.toLocaleString()}</td>
                    <td class="tn">${item.total.toLocaleString()}</td>
                </tr>`;
        });
    } else {
        itemsHtml += `
            <tr>
                <td class="tc">1</td><td class="tc">—</td>
                <td class="tr">${transaction.productName || '—'}</td>
                <td class="tc">${transaction.amount || 1}</td>
                <td class="tc">—</td>
                <td class="tn">—</td>
                <td class="tn">${transaction.totalPrice.toLocaleString()}</td>
            </tr>`;
        rowNum = 2;
    }

    // ردیف‌های خالی برای زیبایی و امکان نوشتن دستی
    const filledRows = rowNum - 1;
    const extraRows = Math.max(0, EMPTY_ROWS - filledRows);
    for (let i = 0; i < extraRows; i++) {
        itemsHtml += `<tr><td class="tc"> </td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const words = numToPersianWords(transaction.totalPrice);
    const invoiceId = Math.floor(transaction.id).toString().slice(-6);
    const isCash = transaction.paymentType === 'cash';
    const isCheck = transaction.paymentType === 'check';
    const isInstallment = transaction.paymentType === 'installment';

    // اطلاعات پرداخت تکمیلی
    let paymentDetails = '';
    if (isCheck && transaction.checks?.length) {
        paymentDetails = transaction.checks.map(c =>
            `چک ${c.bank} — شماره ${c.number} — مبلغ ${c.amount.toLocaleString()} ریال — سررسید ${c.dueDate}`
        ).join('<br>');
    } else if (isInstallment && transaction.installments?.length) {
        paymentDetails = `${transaction.installments.length} قسط — پیش‌پرداخت: ${(transaction.downPayment || 0).toLocaleString()} ریال`;
    }

    const printArea = document.getElementById('printArea');
    printArea.className = 'invoice-mode';

    printArea.innerHTML = `
<style>
@media print {
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { margin: 0 !important; padding: 0 !important; background: #fff; }
    .no-print { display: none !important; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }

.inv-wrap {
    width: 190mm;
    margin: 0 auto;
    direction: rtl;
    font-family: 'Tahoma', 'B Nazanin', sans-serif;
    font-size: 10.5pt;
    color: #000;
    background: #fff;
}

/* ── هدر اصلی ── */
.inv-top {
    display: flex;
    align-items: stretch;
    border: 1.5pt solid #000;
    border-bottom: none;
}
.inv-top-right {
    flex: 1;
    padding: 8px 10px;
    border-left: 1pt solid #000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
}
.inv-top-right .store-name {
    font-size: 14pt;
    font-weight: 900;
    color: #1a1a1a;
}
.inv-top-right .store-sub {
    font-size: 9pt;
    color: #444;
}
.inv-top-right .store-contact {
    font-size: 9pt;
    color: #333;
    margin-top: 4px;
    line-height: 1.7;
}
.inv-top-center {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-left: 1pt solid #000;
}
.inv-title {
    font-size: 16pt;
    font-weight: 900;
    text-align: center;
    white-space: nowrap;
    letter-spacing: 0.5px;
}
.inv-top-left {
    flex: 0 0 120px;
    padding: 8px 10px;
    font-size: 9.5pt;
    line-height: 2;
    text-align: right;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.inv-top-left .meta-row { display: flex; justify-content: space-between; gap: 4px; }
.inv-top-left .meta-label { font-weight: bold; white-space: nowrap; }

/* ── بخش‌های اطلاعات ── */
.inv-section-head {
    background: #d4d4d4;
    font-weight: bold;
    text-align: center;
    padding: 4px;
    border: 1.5pt solid #000;
    border-top: none;
    font-size: 10pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.inv-info-grid {
    display: grid;
    border: 1.5pt solid #000;
    border-top: none;
    border-bottom: none;
}
.inv-info-row {
    display: flex;
    border-bottom: 1pt solid #000;
}
.inv-info-row:last-child { border-bottom: none; }
.inv-info-cell {
    flex: 1;
    padding: 5px 8px;
    border-left: 1pt solid #000;
    font-size: 9.5pt;
    line-height: 1.6;
}
.inv-info-cell:first-child { border-right: none; }
.inv-info-cell:last-child { border-left: none; }
.inv-info-cell .lbl { font-weight: bold; }

/* ── جدول کالا ── */
.inv-items-wrap {
    border: 1.5pt solid #000;
    border-top: none;
    border-bottom: none;
}
.inv-items-table {
    width: 100%;
    border-collapse: collapse;
}
.inv-items-table thead tr {
    background: #d4d4d4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.inv-items-table th {
    border: 1pt solid #aaa;
    padding: 5px 4px;
    font-size: 9pt;
    text-align: center;
    font-weight: bold;
}
.inv-items-table tbody tr { height: 22px; }
.inv-items-table tbody tr:nth-child(even) {
    background: #f7f7f7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.inv-items-table td {
    border: 0.5pt solid #ccc;
    border-right: 1pt solid #999;
    padding: 3px 5px;
    font-size: 9.5pt;
    vertical-align: middle;
}
.inv-items-table td:last-child { border-left: none; }
.inv-items-table td:first-child { border-right: none; }
.tc { text-align: center; }
.tr { text-align: right; }
.tn { text-align: center; direction: ltr; }

/* ── خلاصه مبلغ ── */
.inv-summary {
    display: flex;
    border: 1.5pt solid #000;
    border-top: 1.5pt solid #000;
}
.inv-summary-right {
    flex: 2;
    padding: 8px 10px;
    border-left: 1pt solid #000;
    font-size: 9.5pt;
    line-height: 1.9;
}
.inv-summary-right .words-row {
    font-weight: bold;
    font-size: 10pt;
    margin-bottom: 6px;
    border-bottom: 0.5pt dashed #999;
    padding-bottom: 5px;
}
.inv-payment-type {
    display: flex;
    gap: 18px;
    align-items: center;
    margin-top: 5px;
}
.chk-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9.5pt;
}
.chk-box {
    width: 13px;
    height: 13px;
    border: 1pt solid #000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
    font-weight: bold;
    flex-shrink: 0;
}
.inv-summary-left {
    flex: 0 0 150px;
}
.inv-totals-table {
    width: 100%;
    border-collapse: collapse;
    height: 100%;
}
.inv-totals-table td {
    border: 0.5pt solid #000;
    border-left: none;
    border-right: none;
    padding: 4px 8px;
    font-size: 9pt;
    vertical-align: middle;
}
.inv-totals-table tr:last-child td { border-bottom: none; }
.inv-totals-table tr:first-child td { border-top: none; }
.inv-totals-table .tlbl {
    background: #d4d4d4;
    font-weight: bold;
    text-align: center;
    width: 55%;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    border-left: 0.5pt solid #000;
}
.inv-totals-table .tval {
    text-align: center;
    direction: ltr;
}
.inv-totals-table .highlight-row td {
    background: #1a1a1a;
    color: #fff;
    font-weight: bold;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* ── فوتر ── */
.inv-footer {
    display: flex;
    border: 1.5pt solid #000;
    border-top: none;
    min-height: 80px;
}
.inv-footer-cell {
    flex: 1;
    padding: 6px 8px;
    border-left: 1pt solid #000;
    font-size: 9pt;
}
.inv-footer-cell:last-child { border-left: none; }
.inv-footer-cell .f-title {
    font-weight: bold;
    text-align: center;
    display: block;
    margin-bottom: 4px;
    border-bottom: 0.5pt solid #ccc;
    padding-bottom: 3px;
}

/* ── واترمارک ── */
.inv-watermark {
    text-align: center;
    font-size: 8pt;
    color: #999;
    margin-top: 4px;
    padding-bottom: 2px;
}
</style>

<div class="inv-wrap">

    <!-- هدر -->
    <div class="inv-top">
        <div class="inv-top-right">
            <div class="store-name">${STORE_INFO.name}</div>
            <div class="store-sub">${STORE_INFO.subtitle || ''}</div>
            <div class="store-contact">
                📍 ${STORE_INFO.address}${STORE_INFO.city ? ' — ' + STORE_INFO.city : ''}<br>
                📞 ${STORE_INFO.phone1}${STORE_INFO.phone2 ? ' &nbsp;|&nbsp; ' + STORE_INFO.phone2 : ''}
                ${STORE_INFO.instagram ? `&nbsp;|&nbsp; 📸 @${STORE_INFO.instagram}` : ''}
            </div>
        </div>
        <div class="inv-top-center">
            <div class="inv-title">پیش فاکتور فروش<br>کالا و خدمات</div>
        </div>
        <div class="inv-top-left">
            <div class="meta-row"><span class="meta-label">شماره سریال:</span> <span>${invoiceId}</span></div>
            <div class="meta-row"><span class="meta-label">تاریخ:</span> <span>${transaction.date}</span></div>
            <div class="meta-row"><span class="meta-label">تاریخ اعتبار:</span> <span>—</span></div>
        </div>
    </div>

    <!-- مشخصات فروشنده -->
    <div class="inv-section-head">مشخصات فروشنده</div>
    <div class="inv-info-grid">
        <div class="inv-info-row">
            <div class="inv-info-cell" style="flex:2"><span class="lbl">نام فروشنده: </span>${STORE_INFO.name}</div>
            <div class="inv-info-cell"><span class="lbl">شماره اقتصادی: </span>—</div>
            <div class="inv-info-cell"><span class="lbl">شناسه ملی: </span>—</div>
        </div>
        <div class="inv-info-row">
            <div class="inv-info-cell" style="flex:2"><span class="lbl">نشانی: </span>${STORE_INFO.address}</div>
            <div class="inv-info-cell"><span class="lbl">کد پستی: </span>—</div>
            <div class="inv-info-cell"><span class="lbl">تلفن: </span><span dir="ltr">${STORE_INFO.phone1}</span></div>
        </div>
    </div>

    <!-- مشخصات خریدار -->
    <div class="inv-section-head">مشخصات خریدار</div>
    <div class="inv-info-grid">
        <div class="inv-info-row">
            <div class="inv-info-cell" style="flex:2"><span class="lbl">نام خریدار: </span>${transaction.customerName || 'ناشناس'}</div>
            <div class="inv-info-cell"><span class="lbl">شماره اقتصادی: </span>—</div>
            <div class="inv-info-cell"><span class="lbl">شناسه ملی: </span>—</div>
        </div>
        <div class="inv-info-row">
            <div class="inv-info-cell" style="flex:2"><span class="lbl">نشانی: </span>—</div>
            <div class="inv-info-cell"><span class="lbl">کد پستی: </span>—</div>
            <div class="inv-info-cell"><span class="lbl">تلفن: </span><span dir="ltr">${transaction.customerPhone || '—'}</span></div>
        </div>
    </div>

    <!-- جدول کالا -->
    <div class="inv-section-head">مشخصات کالا یا خدمات مورد معامله</div>
    <div class="inv-items-wrap">
        <table class="inv-items-table">
            <thead>
                <tr>
                    <th style="width:5%">ردیف</th>
                    <th style="width:10%">کد کالا</th>
                    <th style="width:35%">شرح کالا / خدمت</th>
                    <th style="width:8%">تعداد/<br>مقدار</th>
                    <th style="width:7%">واحد</th>
                    <th style="width:17%">مبلغ واحد</th>
                    <th style="width:18%">مبلغ کل</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
    </div>

    <!-- خلاصه -->
    <div class="inv-summary">
        <div class="inv-summary-right">
            <div class="words-row">مبلغ به حروف: ${words}</div>
            <div><span style="font-weight:bold">شرایط و نحوه فروش:</span></div>
            <div class="inv-payment-type">
                <div class="chk-item">
                    <div class="chk-box">${isCash ? '✓' : ''}</div> نقدی
                </div>
                <div class="chk-item">
                    <div class="chk-box">${isCheck ? '✓' : ''}</div> چکی
                </div>
                <div class="chk-item">
                    <div class="chk-box">${isInstallment ? '✓' : ''}</div> اقساطی
                </div>
            </div>
            ${paymentDetails ? `<div style="margin-top:5px; font-size:8.5pt; color:#333; border-top:0.5pt dashed #aaa; padding-top:4px;">${paymentDetails}</div>` : ''}
        </div>
        <div class="inv-summary-left">
            <table class="inv-totals-table">
                <tr><td class="tlbl">جمع کل</td><td class="tval">${transaction.totalPrice.toLocaleString()}</td></tr>
                <tr><td class="tlbl">اضافات</td><td class="tval">—</td></tr>
                <tr><td class="tlbl">تخفیف</td><td class="tval">—</td></tr>
                <tr><td class="tlbl">مالیات و عوارض</td><td class="tval">—</td></tr>
                <tr class="highlight-row"><td class="tlbl">مبلغ پرداختی</td><td class="tval">${transaction.totalPrice.toLocaleString()}</td></tr>
            </table>
        </div>
    </div>

    <!-- فوتر -->
    <div class="inv-footer">
        <div class="inv-footer-cell" style="flex:2.5">
            <span class="f-title">توضیحات</span>
            ${(transaction.downPayment && transaction.downPayment > 0)
            ? `پیش‌پرداخت دریافت شده: ${transaction.downPayment.toLocaleString()} ریال<br>مانده: ${(transaction.totalPrice - transaction.downPayment).toLocaleString()} ریال`
            : ''}
        </div>
        <div class="inv-footer-cell">
            <span class="f-title">مهر و امضای خریدار</span>
        </div>
        <div class="inv-footer-cell">
            <span class="f-title">مهر و امضای فروشنده</span>
        </div>
    </div>

    <div class="inv-watermark">${STORE_INFO.slogan || ''}</div>
</div>`;

    window.print();
    setTimeout(() => { printArea.innerHTML = ''; printArea.className = ''; }, 1500);
}

// ==========================================
// چاپ لیبل قیمت
// ==========================================
function printLabel(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const barcodeSVG = createBarcodeSVG(product.barcode);
    const catLabel = categoryMap[product.category] || 'کالا';
    const unitLabel = product.unit === 'meter' ? 'هر متر' : 'هر عدد';
    const priceFormatted = product.sellPrice.toLocaleString();

    const printArea = document.getElementById('printArea');
    printArea.className = 'label-mode';
    printArea.innerHTML = `
<style>
@media print {
    @page { margin: 10mm; size: A4; }
    body { margin: 0; background: #fff; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }

.label-page {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6mm;
    justify-content: flex-start;
    align-items: flex-start;
    padding: 0;
    background: #fff;
    direction: rtl;
}

.label-card {
    width: 90mm;
    height: 50mm;
    border: 0.5mm solid #222;
    border-radius: 3mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #fff;
    font-family: 'Tahoma', sans-serif;
    position: relative;
    page-break-inside: avoid;
}

.label-top-bar {
    background: #1e293b;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5mm 3mm;
}
.label-store-name {
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 0.3px;
}
.label-category {
    font-size: 6.5pt;
    opacity: 0.8;
}

.label-body {
    flex: 1;
    display: flex;
    flex-direction: row;
    padding: 2mm 3mm;
    gap: 2mm;
}

.label-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1mm;
}
.label-prod-name {
    font-size: 11pt;
    font-weight: 900;
    color: #1e293b;
    line-height: 1.2;
}
.label-brand {
    font-size: 8pt;
    color: #475569;
}
.label-serial {
    font-size: 7.5pt;
    color: #64748b;
}

.label-price-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 2mm;
    padding: 2mm 3mm;
    border: 0.3mm solid #cbd5e1;
    min-width: 28mm;
    text-align: center;
}
.label-price-title {
    font-size: 6.5pt;
    color: #64748b;
    margin-bottom: 0.5mm;
}
.label-price-amount {
    font-size: 16pt;
    font-weight: 900;
    color: #1e293b;
    line-height: 1.1;
}
.label-price-unit {
    font-size: 7pt;
    color: #475569;
    margin-top: 0.5mm;
}

.label-barcode-section {
    border-top: 0.3mm dashed #ccc;
    padding: 1mm 3mm 1.5mm;
    display: flex;
    align-items: center;
    gap: 2mm;
    background: #fafafa;
}
.label-barcode-svg-wrap {
    flex: 1;
    height: 9mm;
    overflow: hidden;
}
.label-barcode-svg-wrap svg {
    width: 100%;
    height: 100%;
}
.label-barcode-svg-wrap rect { fill: #000 !important; }
.label-barcode-num {
    font-size: 6.5pt;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    color: #333;
    white-space: nowrap;
}
</style>

<div class="label-page">
    <div class="label-card">
        <div class="label-top-bar">
            <span class="label-store-name">${STORE_INFO.name}</span>
            <span class="label-category">${catLabel}</span>
        </div>
        <div class="label-body">
            <div class="label-info">
                <div class="label-prod-name">${product.name}</div>
                ${product.brand ? `<div class="label-brand">برند: ${product.brand}</div>` : ''}
                ${product.serial ? `<div class="label-serial">مشخصات: ${product.serial}</div>` : ''}
            </div>
            <div class="label-price-box">
                <div class="label-price-title">قیمت فروش</div>
                <div class="label-price-amount">${priceFormatted}</div>
                <div class="label-price-unit">ریال / ${unitLabel}</div>
            </div>
        </div>
        <div class="label-barcode-section">
            <div class="label-barcode-svg-wrap">${barcodeSVG}</div>
            <div class="label-barcode-num">${product.barcode}</div>
        </div>
    </div>
</div>`;

    window.print();
    setTimeout(() => { printArea.innerHTML = ''; printArea.className = ''; }, 1500);
}

// ==========================================
// بارکد SVG
// ==========================================
function createBarcodeSVG(text) {
    const encodedText = '*' + text + '*';
    let binarySeq = '';
    const codes = {
        '0': '101001101101', '1': '110100101011', '2': '101100101011',
        '3': '110110010101', '4': '101001101011', '5': '110100110101',
        '6': '101100110101', '7': '101001011011', '8': '110100101101',
        '9': '101100101101', '*': '100101101101'
    };
    for (let char of encodedText) {
        if (codes[char]) binarySeq += codes[char] + '0';
    }
    let svgContent = '';
    let x = 0;
    svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`;
    x += 4;
    for (let i = 0; i < binarySeq.length; i++) {
        const width = (binarySeq[i] === '1') ? 3 : 1;
        svgContent += `<rect x="${x}" y="0" width="${width}" height="100" fill="black"/>`;
        x += width + 1.5;
    }
    x += 2;
    svgContent += `<rect x="${x}" y="0" width="2" height="100" fill="black"/>`;
    return `<svg viewBox="0 0 ${x + 4} 100" preserveAspectRatio="none" class="barcode-svg" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

// ==========================================
// کمک‌توابع فرم
// ==========================================
function formatCurrency(input) {
    let v = input.value.replace(/[^0-9]/g, '');
    if (v) input.value = parseInt(v).toLocaleString();
    else input.value = '';
}

function getRawPrice(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(el.value.replace(/,/g, '')) || 0;
}

function autoCalcSell(prefix) {
    const buyInput = document.getElementById(prefix + 'BuyPrice');
    const percentInput = document.getElementById(prefix + 'Percent');
    const sellInput = document.getElementById(prefix + 'SellPrice');
    if (!buyInput || !percentInput || !sellInput) return;
    const buyPrice = parseFloat(buyInput.value.replace(/,/g, '')) || 0;
    const percent = parseFloat(percentInput.value) || 0;
    if (buyPrice > 0) {
        sellInput.value = Math.round(buyPrice + (buyPrice * (percent / 100))).toLocaleString();
    }
}

// ==========================================
// ناوبری و مودال
// ==========================================
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    const btn = document.getElementById('btn-' + id);
    if (btn) btn.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ==========================================
// پشتیبان‌گیری دستی
// ==========================================
function exportData() {
    const d = { products, transactions, returns, deletedProducts, deletedTransactions };
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('پشتیبان با موفقیت دانلود شد ✅', 'success');
}

function importData(input) {
    const f = input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if (confirm('تمام داده‌های فعلی جایگزین می‌شوند. ادامه می‌دهید؟')) {
                products = d.products || [];
                transactions = d.transactions || [];
                returns = d.returns || [];
                deletedProducts = d.deletedProducts || [];
                deletedTransactions = d.deletedTransactions || [];
                saveData();
                updateDashboard();
                updateAccounting();
                renderInventoryTable();
                calculateInventoryStats();
                renderReturnsTable();
                renderTrash();
                populateCustomSelect();
                renderAccounts();
                showToast('بازگردانی با موفقیت انجام شد ✅', 'success');
            }
        } catch (err) {
            showToast('فایل پشتیبان معتبر نیست', 'error');
        }
    };
    reader.readAsText(f);
    input.value = '';
}

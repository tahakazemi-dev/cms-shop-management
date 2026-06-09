<div align="center">

<img src="https://img.shields.io/badge/Version-2.0-2563eb?style=for-the-badge" />
<img src="https://img.shields.io/badge/Offline-100%25-10b981?style=for-the-badge" />
<img src="https://img.shields.io/badge/No_Server-Required-f59e0b?style=for-the-badge" />
<img src="https://img.shields.io/badge/Language-Persian_RTL-ef4444?style=for-the-badge" />

# 🏪 Smart Store Manager
### سیستم مدیریت هوشمند فروشگاه

**A fully offline, zero-dependency store management CMS — built with vanilla HTML, CSS & JS**

**یک سیستم مدیریت فروشگاهی کاملاً آفلاین، بدون نیاز به سرور یا اینترنت**

---

[🇬🇧 English](#-english-documentation) · [🇮🇷 فارسی](#-مستندات-فارسی)

</div>

---

<br>

## 🇬🇧 English Documentation

### What is this?

Smart Store Manager is a **fully offline**, single-page web application designed for small retail stores — originally built for a carpet & home goods shop. It runs entirely in the browser with **no backend, no internet connection, and no installation required**. Just open `index.html` and start working.

All data is persisted locally using **IndexedDB** (with localStorage as fallback), meaning your data survives browser refreshes and is stored permanently on the device.

---

### ✨ Features

#### 🔐 Login & Security
- Password-protected login screen on every session
- Session-based authentication (no cookies, no external auth)

#### 📊 Dashboard
- Live overview of total products, invoice count, and low-stock alerts
- Full invoice list with customer name, payment method, and date
- Real-time search across all invoices by customer name or phone

#### 🛒 Point of Sale (POS)
- Add items to cart by barcode scanner **or** searchable dropdown
- Live price calculation with percentage markup/discount per item
- Customer name & phone number capture per transaction
- Three payment modes:
  - 💵 **Cash** — full immediate payment
  - 💳 **Check (mixed)** — cash down payment + multiple post-dated checks with bank, check number, and due date
  - 📅 **Installment** — down payment + auto-generated installment schedule with Jalali (Shamsi) due dates

#### 📦 Inventory Management
- Add products with: name, category, brand, serial/model/color, unit (meter or piece), stock, buy price, sell price, and auto-calculated profit margin
- Barcode auto-generation (unique 8-digit code per product)
- One-click label printing (4 labels per A4 page)
- Edit and soft-delete products (moved to trash, recoverable for 30 days)
- Live low-stock warning (< 10 units)
- Total inventory value calculation

#### 💰 Accounting
- Total sales revenue (nominal and actually collected)
- Net profit tracking (proportional to collected amount)
- Total warehouse value
- Per-transaction breakdown with realized profit

#### 🏦 Checks & Installments
- Track each check: bank, number, amount, due date, status (pending / passed / bounced)
- Mark checks as collected or returned, with one-click status changes
- Full installment ledger per customer: pay individual installments, undo payments
- Dashboard summary: pending checks total, overdue installments, total non-cash collected

#### ↩️ Returns
- Register product returns with reason
- Automatically restores inventory stock on return
- Logged with return date and original invoice data

#### 🗑️ Trash & Recovery
- Soft-delete for both products and invoices
- 30-day recovery window
- Permanent delete option

#### 🖨️ Printing
- **Thermal invoice** (80mm printer): full store header, customer info, itemized table with units, complete settlement details (cash/check/installment), footer with return policy
- **Price label** (A4): 4 labels per page with store name, product name, brand, serial, price, unit, and barcode
- All print output is pure CSS — no external print library needed

#### 💾 Backup & Restore
- One-click JSON export (full data backup)
- Import/restore from backup file
- **Auto-backup**: triggers automatic download every 2 days

---

### 🗂️ File Structure

```
📁 project/
├── index.html                  # Main app shell & all UI sections
├── script.js                   # All application logic (~2000 lines)
├── style.css                   # Full UI styling with CSS variables
├── jquery-3.6.0.min.js         # jQuery (used only for Persian datepicker)
├── persian-date.min.js         # Jalali calendar core library
├── persian-datepicker.min.js   # Persian date picker widget
└── persian-datepicker.min.css  # Date picker styles
```

> ⚠️ All 7 files must be in the **same folder**. No build step, no npm, no server.

---

### 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/tahakazemi-dev/cms-shop-management.git

# 2. Open the folder
cd YOUR_REPO

# 3. Open index.html in your browser
#    (double-click it, or drag it into Chrome/Edge/Firefox)
```

**Default password:** `mehdimoket`
*(change it in `script.js` → `checkLogin()` function)*

---

### 🛠️ Customization

#### Store Information
All store details are in one place at the top of `script.js`:

```js
const STORE_INFO = {
    name:       'Your Store Name',
    subtitle:   'Your Subtitle',
    phone1:     '09xxxxxxxxx',
    phone2:     '09xxxxxxxxx',
    instagram:  'your_instagram',
    address:    'Your full address',
    city:       'Your City',
    slogan:     'Your slogan'
};
```

#### Login Password
```js
// In checkLogin() function:
if (pass === 'your_new_password') { ... }
```

---

### 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| Vanilla HTML5 | App structure & all UI |
| CSS3 (Custom Properties) | Styling, print layouts |
| Vanilla JavaScript (ES2020) | All business logic |
| IndexedDB | Primary persistent storage |
| localStorage | Storage fallback |
| jQuery 3.6 | Persian datepicker dependency only |
| persian-datepicker v1.2 | Jalali date selection |

**No frameworks. No build tools. No internet required.**

---

### 🌐 Browser Support

| Browser | Status |
|---|---|
| Chrome / Edge 90+ | ✅ Fully supported |
| Firefox 88+ | ✅ Fully supported |
| Safari 14+ | ✅ Supported |
| Internet Explorer | ❌ Not supported |

> Best experience on **Chrome** or **Edge** for print functionality.

---

<br>

---

<br>

## 🇮🇷 مستندات فارسی

### این پروژه چیست؟

**سیستم مدیریت هوشمند فروشگاه** یک اپلیکیشن وب تک‌صفحه‌ای کاملاً آفلاین است که برای فروشگاه‌های کوچک طراحی شده — در اصل برای یک فروشگاه فرش و لوازم منزل ساخته شده. کاملاً داخل مرورگر اجرا می‌شود، **نیاز به سرور، اینترنت یا نصب ندارد**. فقط `index.html` را باز کنید و شروع کنید.

تمام داده‌ها با **IndexedDB** (و localStorage به‌عنوان پشتیبان) روی دستگاه ذخیره می‌شوند و بعد از بستن مرورگر هم باقی می‌مانند.

---

### ✨ امکانات سیستم

#### 🔐 ورود و امنیت
- صفحه ورود با رمز عبور در هر بار باز کردن
- احراز هویت مبتنی بر Session — بدون کوکی یا سرویس خارجی

#### 📊 داشبورد
- نمای کلی از تعداد محصولات، فاکتورها و هشدار کالای رو به اتمام
- لیست کامل فاکتورها با نام مشتری، روش پرداخت و تاریخ
- جستجوی لحظه‌ای در فاکتورها بر اساس نام یا شماره تلفن مشتری

#### 🛒 صندوق فروش
- افزودن کالا به سبد از طریق **اسکنر بارکد** یا **dropdown جستجوپذیر**
- محاسبه قیمت نهایی با درصد افزایش یا تخفیف برای هر کالا
- ثبت نام و شماره تلفن مشتری
- سه روش پرداخت:
  - 💵 **نقدی** — تسویه کامل در لحظه
  - 💳 **چکی (ترکیبی)** — پیش‌پرداخت نقدی + چک‌های متعدد با مشخصات بانک، شماره چک و سررسید
  - 📅 **اقساطی** — پیش‌پرداخت + تولید خودکار جدول اقساط با تاریخ شمسی

#### 📦 مدیریت انبار
- افزودن محصول با: نام، دسته‌بندی، برند، سریال/مدل/رنگ، واحد (متر یا عدد)، موجودی، قیمت خرید، قیمت فروش و محاسبه خودکار درصد سود
- تولید خودکار بارکد ۸ رقمی یکتا برای هر محصول
- چاپ لیبل قیمت با یک کلیک (۴ لیبل در هر A4)
- ویرایش و حذف نرم محصولات (قابل بازیابی تا ۳۰ روز)
- هشدار موجودی رو به اتمام (کمتر از ۱۰)
- محاسبه ارزش کل انبار

#### 💰 حسابداری
- فروش کل (اسمی و وصولی واقعی)
- سود خالص متناسب با مبلغ وصول‌شده
- ارزش کل انبار
- گزارش جزئی هر فاکتور با سود تحقق‌یافته

#### 🏦 مدیریت چک و اقساط
- پیگیری هر چک: بانک، شماره، مبلغ، سررسید، وضعیت (در انتظار / وصول شده / برگشتی)
- ثبت وصول یا برگشت چک با یک کلیک
- دفترچه اقساط کامل برای هر مشتری: پرداخت تک‌قسطی، لغو پرداخت
- خلاصه داشبورد: جمع چک‌های معوق، اقساط معوقه، وصولی غیرنقدی

#### ↩️ مرجوعی‌ها
- ثبت مرجوعی با دلیل
- برگشت خودکار موجودی به انبار
- ذخیره تاریخ مرجوعی و اطلاعات فاکتور اصلی

#### 🗑️ سطل زباله
- حذف نرم برای محصولات و فاکتورها
- بازیابی تا ۳۰ روز
- حذف دائمی با تأیید

#### 🖨️ چاپ
- **فاکتور حرارتی (پرینتر ۸۰ میلی‌متری):** سربرگ کامل فروشگاه، اطلاعات مشتری، جدول اقلام با واحد، جزئیات کامل تسویه (نقدی / چکی / اقساطی)، پاورقی با سیاست تعویض
- **لیبل قیمت (A4):** ۴ لیبل در هر صفحه با نام فروشگاه، نام محصول، برند، سریال، قیمت، واحد و بارکد
- تمام خروجی پرینت با CSS خالص — بدون کتابخانه چاپ خارجی

#### 💾 پشتیبان‌گیری و بازیابی
- دانلود پشتیبان JSON با یک کلیک
- بازگردانی از فایل پشتیبان
- **پشتیبان خودکار:** هر ۲ روز یک‌بار دانلود خودکار

---

### 🗂️ ساختار فایل‌ها

```
📁 پوشه پروژه/
├── index.html                  # ساختار اصلی و تمام بخش‌های رابط کاربری
├── script.js                   # تمام منطق برنامه (~۲۰۰۰ خط)
├── style.css                   # استایل‌دهی کامل با متغیرهای CSS
├── jquery-3.6.0.min.js         # jQuery (فقط برای تقویم شمسی)
├── persian-date.min.js         # هسته تقویم جلالی
├── persian-datepicker.min.js   # ویجت انتخاب تاریخ شمسی
└── persian-datepicker.min.css  # استایل تقویم
```

> ⚠️ تمام ۷ فایل باید در **یک پوشه** باشند. نیاز به build، npm یا سرور نیست.

---

### 🚀 نصب و راه‌اندازی

```bash
# ۱. کلون ریپو
git clone git clone https://github.com/tahakazemi-dev/cms-shop-management.git

# ۲. ورود به پوشه
cd YOUR_REPO

# ۳. باز کردن index.html در مرورگر
#    (دابل‌کلیک روی فایل یا drag به Chrome/Edge/Firefox)
```

**رمز پیش‌فرض:** `mehdimoket`
*(برای تغییر: در `script.js` تابع `checkLogin()` را پیدا کنید)*

---

### 🛠️ شخصی‌سازی

#### اطلاعات فروشگاه
تمام اطلاعات ثابت فروشگاه در یک‌جا در ابتدای `script.js` قرار دارند:

```js
const STORE_INFO = {
    name:       'نام فروشگاه شما',
    subtitle:   'زیرعنوان',
    phone1:     '09xxxxxxxxx',
    phone2:     '09xxxxxxxxx',
    instagram:  'your_instagram',
    address:    'آدرس کامل فروشگاه',
    city:       'شهر',
    slogan:     'شعار فروشگاه'
};
```

#### رمز ورود
```js
// در تابع checkLogin():
if (pass === 'رمز_جدید_شما') { ... }
```

---

### 🧰 تکنولوژی‌های استفاده‌شده

| تکنولوژی | کاربرد |
|---|---|
| HTML5 خالص | ساختار و رابط کاربری |
| CSS3 (Custom Properties) | استایل‌دهی و چاپ |
| JavaScript ES2020 خالص | تمام منطق برنامه |
| IndexedDB | ذخیره‌سازی اصلی |
| localStorage | ذخیره‌سازی پشتیبان |
| jQuery 3.6 | فقط وابستگی تقویم شمسی |
| persian-datepicker v1.2 | انتخاب تاریخ شمسی |

**بدون فریم‌ورک · بدون ابزار build · بدون اینترنت**

---

### 🌐 پشتیبانی مرورگرها

| مرورگر | وضعیت |
|---|---|
| Chrome / Edge 90+ | ✅ پشتیبانی کامل |
| Firefox 88+ | ✅ پشتیبانی کامل |
| Safari 14+ | ✅ پشتیبانی می‌شود |
| Internet Explorer | ❌ پشتیبانی نمی‌شود |

> بهترین تجربه پرینت در **Chrome** یا **Edge**

---

<div align="center">

<br>

Made with ☕ and vanilla JS — no frameworks were harmed in the making of this project.

ساخته شده با ☕ و جاوااسکریپت خالص — در ساخت این پروژه هیچ فریم‌ورکی آسیب ندید.

<br>

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-2563EB?style=flat-square)
![Offline](https://img.shields.io/badge/100%25_Offline-10B981?style=flat-square)

</div>

# Temp Monitor — نظام مراقبة أجهزة صناعية (v3 — نموذج موحّد)

نظام لإدارة أجهزة صناعية متعددة عبر سيرفر Flask. **كل جهاز يُعرَّف بحرية تامة عبر Tags خاصة به** —
لا فرق بين "جهاز حرارة" و"جهاز آخر"، الكل يتبع نفس البنية:

- `device_id` (ثابت، فريد)
- وصف قصير (اختياري)
- إحداثيات GPS (اختياري)
- عدد غير محدود من **Tags**، كل واحدة لها: اسم + وحدة قياس + **Min/Max اختياري خاص بها**

## مثال: جهاز حرارة/رطوبة (AM2302B)

Tags:
- `temperature` / `°C` / min=2 / max=8
- `humidity` / `%` / (بدون عتبة)

## مثال: جهاز VFD

Tags:
- `التردد` / `Hz` / min=40 / max=50
- `التيار` / `A` / (بدون عتبة)

التنبيه (`alarm`) يُحسب تلقائياً إذا **أي** قيمة خرجت عن Min/Max الخاص بـ tag ها.

## التشغيل محلياً

```bash
pip install -r requirements.txt
python app.py
```

افتح `http://localhost:5000` — حساب افتراضي: `admin` / `admin123`

## الصفحات

| الصفحة | الوصف |
|---|---|
| `/login` | تسجيل الدخول |
| `/` | اللوحة الرئيسية — اختيار جهاز واحد، أزرار تاريخ سريعة (24h/7d/30d/الكل)، شاشة LCD (إذا الجهاز عنده tag اسمه `temperature`)، chips لباقي القيم، رسم بياني، جدول |
| `/devices` | إدارة الأجهزة — إضافة/تعديل/حذف، تعريف Tags مع Min/Max لكل واحدة |
| `/map` | خريطة تعرض كل الأجهزة عندها إحداثيات |

## إضافة/تعديل جهاز

من `/devices`: أدخل `device_id` (لا يتغير بعد الإضافة)، وصف، إحداثيات، وزِد Tags بزر "➕ إضافة tag" —
كل tag: اسم، وحدة، Min اختياري، Max اختياري.

**⚠️ الجهاز يجب أن يُضاف من هنا قبل إرسال أي قراءة، وإلا يرفضه السيرفر (404).**

للتعديل: زر "تعديل" بجانب كل جهاز — `device_id` يظهر معطّلاً (ثابت)، باقي الحقول و Tags قابلة للتغيير الكامل.

## إرسال قراءة (POST /api/reading)

```json
{
  "api_key": "changeme-esp32-key",
  "device_id": "am2302b-1",
  "values": {"temperature": 4.2, "humidity": 55.0}
}
```

أسماء المفاتيح في `values` يجب أن تطابق أسماء الـ Tags المعرّفة للجهاز في `/devices`.

> توافق قديم: لا يزال يمكن إرسال `temperature`/`humidity` كحقول مباشرة (بدون `values`)، وسيتم دمجها تلقائياً.

## القراءة والتصدير (مع فلترة زمنية)

- `GET /api/readings?device_id=...&from=ISO_DATE&to=ISO_DATE&limit=500`
- `GET /api/export/csv?device_id=...&from=...&to=...&lang=ar|fr|en`
- `GET /api/export/xlsx?device_id=...&from=...&to=...&lang=ar|fr|en`

أعمدة التصدير ديناميكية بالكامل حسب Tags الجهاز المختار.

## قاعدة بيانات دائمة (Supabase) — حل مشكلة ضياع البيانات

بشكل افتراضي، المشروع يستعمل SQLite محلي — سهل للتجربة، لكن على Render (الخطة المجانية)
يُمسح عند كل إعادة تشغيل (Spin Down بعد 15 دقيقة سكون، أو نشر جديد).

**الحل: قاعدة بيانات PostgreSQL خارجية دائمة عبر Supabase (مجاني):**

1. من لوحة Supabase → مشروعك → **Project Settings → Database**
2. انسخ **Direct Connection** string (وليس Pooler/Transaction)، شكلها:
   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-x-xxxx.pooler.supabase.com:5432/postgres
   ```
   أو الصيغة المباشرة:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres
   ```
3. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات الفعلية (وليس المفتاح `sb_publishable_...` — ذاك لواجهة API، مختلف عن كلمة مرور Postgres)
4. أضف هذا الرابط الكامل كمتغيّر بيئة `DATABASE_URL` في Render (Settings → Environment)
5. أعد النشر — السيرفر غادي يكتشف `DATABASE_URL` تلقائياً ويستعمل PostgreSQL بدل SQLite، وتشوف فـ السجلات (Logs):
   ```
   [init] استعمال قاعدة بيانات PostgreSQL (Supabase) — دائمة
   ```

> ⚠️ ملاحظة أمان: لا تشارك رابط الاتصال الكامل (مع كلمة المرور الحقيقية) في أي مكان عام —
> ضعه فقط كـ Environment Variable في Render.

> ⚠️ ملاحظة Supabase المجاني: المشروع يتوقف مؤقتاً (pause) إذا بقا بدون استعمال 7 أيام،
> لكن البيانات لا تُمسح — يكفي "إيقاظه" يدوياً من لوحة Supabase عند الحاجة.

## البنية

```
temp_monitor/
├── app.py                 # السيرفر: قاعدة بيانات، API، صفحات
├── requirements.txt
├── templates/
│   ├── login.html
│   ├── dashboard.html
│   ├── devices.html
│   └── map.html
└── static/
    ├── style.css
    ├── i18n.js             # الترجمة (AR/FR/EN) + الوضع الليلي/النهاري
    ├── app.js              # منطق اللوحة الرئيسية
    ├── devices.js          # منطق صفحة إدارة الأجهزة
    └── map.js              # منطق صفحة الخريطة (Leaflet.js)
```

## النشر على Render (مجاني)

1. ارفع المشروع لمستودع GitHub
2. Render → New Web Service → اربط المستودع
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `python3 app.py`
5. Environment Variables: `DEVICE_API_KEY`, `SECRET_KEY`

> ⚠️ على الخطة المجانية، قاعدة البيانات SQLite قد تُمسح عند إعادة النشر (نظام ملفات غير دائم).
> للاستخدام الحقيقي طويل المدى، استعمل قاعدة بيانات خارجية دائمة (مثل PostgreSQL المجاني من Render).


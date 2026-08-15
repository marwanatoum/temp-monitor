# Temp Monitor — نظام مراقبة أجهزة صناعية (v2)

نظام لإدارة أجهزة صناعية متعددة (حرارة، VFD، فالفات...) عبر سيرفر Flask.
كل جهاز يُضاف يدوياً من صفحة "إدارة الأجهزة"، مع إمكانية تحديد:
- عتبات حرارة دنيا/قصوى (تنبيه تلقائي)
- إحداثيات GPS (تظهر في صفحة "الخريطة")
- قيم إضافية مخصصة (Tags) بأي عدد — مفيد لأجهزة مثل VFD (تردد، تيار، قدرة...)

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
| `/` | اللوحة الرئيسية — اختيار جهاز واحد، منتقي تاريخ/وقت، شاشة LCD (للحرارة)، chips (للـ tags)، رسم بياني، جدول |
| `/devices` | إدارة الأجهزة — إضافة/حذف، تعريف الـ tags |
| `/map` | خريطة تعرض كل الأجهزة عندها إحداثيات |

## إضافة جهاز

من صفحة `/devices`، أدخل:
- `device_id` (إجباري، فريد)
- وصف قصير (اختياري)
- إحداثيات (اختياري، لتظهر في الخريطة)
- حرارة دنيا/قصوى (اختياري، للتنبيه التلقائي)
- Tags: زر "➕ إضافة tag" لإضافة قيم مخصصة (اسم + وحدة قياس)، بلا حد

**⚠️ الجهاز يجب أن يُضاف من هنا قبل إرسال أي قراءة، وإلا يرفضه السيرفر (404).**

## إرسال قراءة (POST /api/reading)

### جهاز حرارة عادي (AM2302B مثلاً)
```json
{
  "api_key": "changeme-esp32-key",
  "device_id": "am2302b-1",
  "temperature": 4.2,
  "humidity": 55.0
}
```
التنبيه (`alarm`) يُحسب تلقائياً إذا `temperature` خارج `temp_min`/`temp_max` المسجّلين للجهاز.

### جهاز بـ tags مخصصة (VFD مثلاً)
```json
{
  "api_key": "changeme-esp32-key",
  "device_id": "vfd-pump-1",
  "values": {"التردد": 45.2, "التيار": 3.1}
}
```
أسماء المفاتيح في `values` يجب أن تطابق أسماء الـ tags المعرّفة للجهاز في `/devices`.

## القراءة والتصدير (مع فلترة زمنية)

- `GET /api/readings?device_id=...&from=ISO_DATE&to=ISO_DATE&limit=500`
- `GET /api/export/csv?device_id=...&from=...&to=...&lang=ar|fr|en`
- `GET /api/export/xlsx?device_id=...&from=...&to=...&lang=ar|fr|en`

`from`/`to` اختياريان — بدونهما يرجع كل السجل.

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
5. Environment Variables: `DEVICE_API_KEY`, `SECRET_KEY` (وأي قيم أخرى تريد تخصيصها)

> ⚠️ على الخطة المجانية، قاعدة البيانات SQLite قد تُمسح عند إعادة النشر. للاستخدام الحقيقي، استعمل قاعدة بيانات خارجية دائمة.

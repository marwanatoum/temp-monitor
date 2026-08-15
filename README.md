# Temp Monitor — نموذج مراقبة الحرارة (Prototype)

سيرفر Flask بسيط يستقبل قراءات الحرارة من جهاز ESP32 (متصل بمنظم Dixell عبر RS485)
عبر HTTP، يخزنها في SQLite، ويعرضها في لوحة تحكم على الويب بتصميم يحاكي شاشة LCD صناعية.

## أنواع الأجهزة المدعومة

المشروع يدعم الآن عدة أنواع من الأجهزة الصناعية، كل نوع بقيمه (metrics) الخاصة:

| النوع (device_type) | القيم (metrics) |
|---|---|
| `temperature` | `temperature` (°C), `humidity` (%) |
| `regulator` | `temperature` (°C), `setpoint` (°C) |
| `vfd` | `frequency_hz` (Hz), `current_a` (A), `power_kw` (kW) |
| `valve` | `position_pct` (%) |
| `pressure` | `pressure_bar` (bar) |
| `flow` | `flow_m3h` (m³/h) |

اللوحة تعرض تبويباً منفصلاً لكل نوع، وبطاقة لكل جهاز تعرض جميع قيمه.

### مثال إرسال قراءة VFD

```bash
curl -X POST http://localhost:5000/api/reading \
  -H "Content-Type: application/json" \
  -d '{
        "api_key": "changeme-esp32-key",
        "device_id": "vfd-pump-1",
        "device_type": "vfd",
        "metrics": {"frequency_hz": 45.2, "current_a": 3.1, "power_kw": 2.4},
        "alarm": false
      }'
```

> ⚠️ `device_type` مطلوب فقط أول مرة (أو عند تغييره). القراءات اللاحقة لنفس `device_id` لا تحتاجه.

## التشغيل محلياً

```bash
pip install -r requirements.txt
python app.py
```

ثم افتح المتصفح على: `http://localhost:5000`

سيتم إنشاء حساب افتراضي تلقائياً عند أول تشغيل:
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin123`

> ⚠️ غيّر كلمة المرور فور أول تشغيل حقيقي (أو غيّر `DEFAULT_USERNAME`/`DEFAULT_PASSWORD`
> عبر متغيرات البيئة قبل أول تشغيل).

## إرسال قراءة تجريبية (لتجربة اللوحة بدون ESP32)

```bash
curl -X POST http://localhost:5000/api/reading \
  -H "Content-Type: application/json" \
  -d '{
        "api_key": "changeme-esp32-key",
        "device_id": "dixell-chambre-1",
        "temperature": 4.2,
        "humidity": 55.0,
        "alarm": false
      }'
```

## مثال كود ESP32 (Arduino, WiFi)

بعد قراءة الحرارة من Dixell عبر Modbus RTU (RS485)، يرسلها ESP32 بهذا الشكل:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid     = "WIFI_SSID";
const char* password = "WIFI_PASSWORD";
const char* serverUrl = "http://SERVER_IP:5000/api/reading";

void sendReading(float temperature, float humidity, bool alarm) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"api_key\":\"changeme-esp32-key\",";
  payload += "\"device_id\":\"dixell-chambre-1\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1) + ",";
  payload += "\"alarm\":" + String(alarm ? "true" : "false");
  payload += "}";

  int code = http.POST(payload);
  http.end();
}
```

> غيّر `DEVICE_API_KEY` في `app.py` (أو عبر متغيّر بيئة) قبل أي استخدام حقيقي.

## النشر على استضافة مجانية (Render مثلاً)

1. ارفع هذا المجلد كمستودع GitHub.
2. أنشئ حساب على render.com → New Web Service → اربطه بالمستودع.
3. Build command: `pip install -r requirements.txt`
4. Start command: `python app.py`
5. أضف متغيّر البيئة `DEVICE_API_KEY` بقيمة سرية خاصة بك.
6. بعد النشر، استعمل الرابط الذي يعطيك إياه Render بدل `SERVER_IP` في كود ESP32
   (استعمل 4G/SIM module لو الجهاز بعيد عن الواي فاي).

## البنية

```
temp_monitor/
├── app.py                 # سيرفر Flask + API + قاعدة البيانات
├── requirements.txt
├── templates/
│   └── dashboard.html     # صفحة اللوحة
└── static/
    ├── style.css          # التصميم (شاشة LCD صناعية)
    └── app.js             # جلب البيانات وتحديث اللوحة كل 5 ثوان
```

"""
Temp Monitor — سيرفر مراقبة الحرارة عن بعد
--------------------------------------------
يستقبل قراءات الحرارة من ESP32 (متصل بمنظم Dixell عبر RS485/Modbus)
عبر HTTP POST، يخزنها في SQLite، ويعرضها في لوحة تحكم على الويب.

تشغيل محلي:
    pip install -r requirements.txt
    python app.py
    ثم افتح: http://localhost:5000
"""

import os
import io
import csv
import sqlite3
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template, g, redirect, url_for, flash, Response
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user,
)
from werkzeug.security import generate_password_hash, check_password_hash
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

APP_DB = os.path.join(os.path.dirname(__file__), "readings.db")
# مفتاح بسيط للتحقق من هوية الجهاز المُرسل (غيّره قبل النشر الحقيقي)
DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY", "changeme-esp32-key")
# مستخدم افتراضي يُنشأ تلقائياً أول مرة (غيّر كلمة المرور بعد أول دخول!)
DEFAULT_USERNAME = os.environ.get("DEFAULT_USERNAME", "admin")
DEFAULT_PASSWORD = os.environ.get("DEFAULT_PASSWORD", "admin123")

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "الرجاء تسجيل الدخول للمتابعة"


class User(UserMixin):
    def __init__(self, row):
        self.id = str(row["id"])
        self.username = row["username"]


@login_manager.user_loader
def load_user(user_id):
    conn = sqlite3.connect(APP_DB)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return User(row) if row else None


# ---------------------------------------------------------------------------
# قاعدة البيانات
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(APP_DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(APP_DB)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL,
            alarm INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
        """
    )
    # إنشاء مستخدم افتراضي إذا لم توجد أي حسابات بعد
    existing = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()[0]
    if existing == 0:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (DEFAULT_USERNAME, generate_password_hash(DEFAULT_PASSWORD)),
        )
        print(f"[init] تم إنشاء مستخدم افتراضي: {DEFAULT_USERNAME} / {DEFAULT_PASSWORD}")
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# نقاط API (تُستخدم من ESP32)
# ---------------------------------------------------------------------------
@app.route("/api/reading", methods=["POST"])
def add_reading():
    """
    يستقبل قراءة جديدة من الجهاز.
    مثال جسم الطلب (JSON):
    {
        "api_key": "changeme-esp32-key",
        "device_id": "dixell-chambre-1",
        "temperature": 4.2,
        "humidity": 55.0,   // اختياري
        "alarm": false      // اختياري: هل منظم Dixell في حالة تنبيه
    }
    """
    data = request.get_json(silent=True) or {}

    if data.get("api_key") != DEVICE_API_KEY:
        return jsonify({"error": "unauthorized"}), 401

    device_id = data.get("device_id")
    temperature = data.get("temperature")

    if device_id is None or temperature is None:
        return jsonify({"error": "device_id و temperature مطلوبان"}), 400

    try:
        temperature = float(temperature)
    except (TypeError, ValueError):
        return jsonify({"error": "temperature يجب أن تكون رقماً"}), 400

    humidity = data.get("humidity")
    alarm = 1 if data.get("alarm") else 0
    created_at = datetime.now(timezone.utc).isoformat()

    db = get_db()
    db.execute(
        "INSERT INTO readings (device_id, temperature, humidity, alarm, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (device_id, temperature, humidity, alarm, created_at),
    )
    db.commit()

    return jsonify({"status": "ok"}), 201


@app.route("/api/readings", methods=["GET"])
@login_required
def list_readings():
    """يرجع آخر القراءات (لرسم البياني ولجدول اللوحة). ?limit=100&device_id=..."""
    limit = request.args.get("limit", default=200, type=int)
    device_id = request.args.get("device_id")

    db = get_db()
    if device_id:
        rows = db.execute(
            "SELECT * FROM readings WHERE device_id = ? ORDER BY id DESC LIMIT ?",
            (device_id, limit),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()

    result = [dict(r) for r in rows]
    result.reverse()  # الأقدم أولاً، مناسب للرسم البياني
    return jsonify(result)


@app.route("/api/devices", methods=["GET"])
@login_required
def list_devices():
    db = get_db()
    rows = db.execute("SELECT DISTINCT device_id FROM readings").fetchall()
    return jsonify([r["device_id"] for r in rows])


# ---------------------------------------------------------------------------
# تصدير البيانات (CSV / Excel)
# ---------------------------------------------------------------------------
def _fetch_export_rows(device_id):
    """يرجع كل قراءات جهاز معين (أو الكل) مرتبة من الأقدم للأحدث، للتصدير."""
    db = get_db()
    if device_id:
        rows = db.execute(
            "SELECT device_id, temperature, humidity, alarm, created_at "
            "FROM readings WHERE device_id = ? ORDER BY id ASC",
            (device_id,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT device_id, temperature, humidity, alarm, created_at "
            "FROM readings ORDER BY id ASC"
        ).fetchall()
    return rows


EXPORT_TRANSLATIONS = {
    "ar": {
        "headers": ["الجهاز", "الحرارة °C", "الرطوبة %", "الحالة", "التاريخ والوقت"],
        "alarm": "تنبيه",
        "normal": "طبيعي",
        "sheet_title": "القراءات",
    },
    "fr": {
        "headers": ["Appareil", "Temp. °C", "Humidité %", "État", "Date et heure"],
        "alarm": "Alarme",
        "normal": "Normal",
        "sheet_title": "Lectures",
    },
    "en": {
        "headers": ["Device", "Temp °C", "Humidity %", "Status", "Date & Time"],
        "alarm": "Alarm",
        "normal": "Normal",
        "sheet_title": "Readings",
    },
}


def get_export_lang():
    lang = request.args.get("lang", "ar")
    return lang if lang in EXPORT_TRANSLATIONS else "ar"


@app.route("/api/export/csv", methods=["GET"])
@login_required
def export_csv():
    device_id = request.args.get("device_id")
    lang = get_export_lang()
    tr = EXPORT_TRANSLATIONS[lang]
    rows = _fetch_export_rows(device_id)

    output = io.StringIO()
    output.write("\ufeff")  # BOM حتى يفتح ملف CSV بشكل صحيح مع الحروف غير اللاتينية في Excel
    writer = csv.writer(output)
    writer.writerow(tr["headers"])
    for r in rows:
        writer.writerow([
            r["device_id"],
            r["temperature"],
            r["humidity"] if r["humidity"] is not None else "",
            tr["alarm"] if r["alarm"] else tr["normal"],
            r["created_at"],
        ])

    filename = f"readings_{device_id or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.route("/api/export/xlsx", methods=["GET"])
@login_required
def export_xlsx():
    device_id = request.args.get("device_id")
    lang = get_export_lang()
    tr = EXPORT_TRANSLATIONS[lang]
    rows = _fetch_export_rows(device_id)

    wb = Workbook()
    ws = wb.active
    ws.title = tr["sheet_title"]
    ws.sheet_view.rightToLeft = (lang == "ar")  # اتجاه الورقة حسب اللغة

    header_fill = PatternFill(start_color="1F5A3B", end_color="1F5A3B", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    ws.append(tr["headers"])
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for r in rows:
        ws.append([
            r["device_id"],
            r["temperature"],
            r["humidity"] if r["humidity"] is not None else None,
            tr["alarm"] if r["alarm"] else tr["normal"],
            r["created_at"],
        ])

    # عرض تلقائي تقريبي للأعمدة
    widths = [18, 12, 12, 10, 26]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"readings_{device_id or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return Response(
        buffer.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------------------------
# تسجيل الدخول / الخروج
# ---------------------------------------------------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        db = get_db()
        row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        if row and check_password_hash(row["password_hash"], password):
            login_user(User(row))
            return redirect(url_for("dashboard"))

        flash("اسم المستخدم أو كلمة المرور غير صحيحة")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# لوحة التحكم (الصفحة)
# ---------------------------------------------------------------------------
@app.route("/")
@login_required
def dashboard():
    return render_template("dashboard.html", username=current_user.username)


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

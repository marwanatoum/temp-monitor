/* ============================================================
   نظام الترجمة (i18n) — عربي / فرنسي / إنجليزي
   ============================================================ */

const TRANSLATIONS = {
  ar: {
    dir: 'rtl',
    brand_text: 'غرفة المراقبة',
    brand_sub: 'TEMP MONITOR / RS485 → CLOUD',
    conn_connecting: 'جارٍ الاتصال…',
    conn_connected: 'متصل',
    conn_disconnected: 'غير متصل',
    logout: 'خروج',
    device_label: 'الجهاز',
    lcd_no_data: 'لا بيانات',
    lcd_normal: 'طبيعي',
    lcd_alarm: '⚠ تنبيه',
    lcd_offline: '❌ منقطع',
    lcd_error_prefix: '⚠ انقطع الاتصال بالجهاز — آخر قراءة منذ',
    age_less_min: 'أقل من دقيقة',
    age_one_min: 'دقيقة واحدة',
    age_mins: 'دقيقة',
    age_hours: 'ساعة',
    legend_ok: 'طبيعي',
    legend_warn: 'تنبيه',
    legend_off: 'غير متصل',
    info_last_update: 'آخر تحديث',
    info_reading_count: 'عدد القراءات المعروضة',
    info_min_max: 'المدى',
    chart_title: 'تطور الحرارة',
    range_60: 'آخر 60',
    range_200: 'آخر 200',
    range_all: 'الكل',
    table_title: 'سجل القراءات',
    th_time: 'الوقت',
    th_device: 'الجهاز',
    th_temp: 'الحرارة °C',
    th_humidity: 'الرطوبة %',
    th_status: 'الحالة',
    table_empty: 'بانتظار أول قراءة من الجهاز…',
    badge_normal: 'طبيعي',
    badge_alarm: 'تنبيه',
    api_title: 'إرسال قراءة (من ESP32)',
    theme_toggle: 'الوضع',
    login_username: 'اسم المستخدم',
    login_password: 'كلمة المرور',
    login_button: 'دخول',
  },
  fr: {
    dir: 'ltr',
    brand_text: 'Salle de contrôle',
    brand_sub: 'TEMP MONITOR / RS485 → CLOUD',
    conn_connecting: 'Connexion en cours…',
    conn_connected: 'Connecté',
    conn_disconnected: 'Déconnecté',
    logout: 'Déconnexion',
    device_label: 'Appareil',
    lcd_no_data: 'Aucune donnée',
    lcd_normal: 'Normal',
    lcd_alarm: '⚠ Alarme',
    lcd_offline: '❌ Hors ligne',
    lcd_error_prefix: '⚠ Appareil déconnecté — dernière lecture il y a',
    age_less_min: 'moins d\u2019une minute',
    age_one_min: '1 minute',
    age_mins: 'minutes',
    age_hours: 'heures',
    legend_ok: 'Normal',
    legend_warn: 'Alarme',
    legend_off: 'Déconnecté',
    info_last_update: 'Dernière mise à jour',
    info_reading_count: 'Nombre de lectures affichées',
    info_min_max: 'Plage',
    chart_title: 'Évolution de la température',
    range_60: '60 derniers',
    range_200: '200 derniers',
    range_all: 'Tout',
    table_title: 'Historique des lectures',
    th_time: 'Heure',
    th_device: 'Appareil',
    th_temp: 'Temp. °C',
    th_humidity: 'Humidité %',
    th_status: 'État',
    table_empty: 'En attente de la première lecture…',
    badge_normal: 'Normal',
    badge_alarm: 'Alarme',
    api_title: 'Envoyer une lecture (depuis ESP32)',
    theme_toggle: 'Mode',
    login_username: 'Nom d\u2019utilisateur',
    login_password: 'Mot de passe',
    login_button: 'Connexion',
  },
  en: {
    dir: 'ltr',
    brand_text: 'Monitoring Room',
    brand_sub: 'TEMP MONITOR / RS485 → CLOUD',
    conn_connecting: 'Connecting…',
    conn_connected: 'Connected',
    conn_disconnected: 'Disconnected',
    logout: 'Logout',
    device_label: 'Device',
    lcd_no_data: 'No data',
    lcd_normal: 'Normal',
    lcd_alarm: '⚠ Alarm',
    lcd_offline: '❌ Offline',
    lcd_error_prefix: '⚠ Device disconnected — last reading',
    age_less_min: 'less than a minute ago',
    age_one_min: '1 minute ago',
    age_mins: 'minutes ago',
    age_hours: 'hours ago',
    legend_ok: 'Normal',
    legend_warn: 'Alarm',
    legend_off: 'Offline',
    info_last_update: 'Last update',
    info_reading_count: 'Readings shown',
    info_min_max: 'Range',
    chart_title: 'Temperature over time',
    range_60: 'Last 60',
    range_200: 'Last 200',
    range_all: 'All',
    table_title: 'Reading log',
    th_time: 'Time',
    th_device: 'Device',
    th_temp: 'Temp °C',
    th_humidity: 'Humidity %',
    th_status: 'Status',
    table_empty: 'Waiting for the first reading…',
    badge_normal: 'Normal',
    badge_alarm: 'Alarm',
    api_title: 'Send a reading (from ESP32)',
    theme_toggle: 'Theme',
    login_username: 'Username',
    login_password: 'Password',
    login_button: 'Log in',
  },
};

const I18N_STORAGE_KEY = 'temp_monitor_lang';
const THEME_STORAGE_KEY = 'temp_monitor_theme';

function getLang() {
  return localStorage.getItem(I18N_STORAGE_KEY) || 'ar';
}

function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.ar[key] || key;
}

function applyTranslations() {
  const lang = getLang();
  const dir = TRANSLATIONS[lang].dir;

  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // زر اللغة النشط
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function setLang(lang) {
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  applyTranslations();
  if (typeof onLanguageChange === 'function') onLanguageChange();
}

/* ============================================================
   الوضع الليلي / النهاري
   ============================================================ */

function getTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
}

function applyTheme() {
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.checked = theme === 'light';
}

function setTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme();
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// تطبيق الوضع (فاتح/غامق) فوراً لتفادي وميض عند التحميل
applyTheme();
// تطبيق النصوص بعد جهوزية DOM (لأن هذا السكريبت محمّل في <head>)
document.addEventListener('DOMContentLoaded', applyTranslations);

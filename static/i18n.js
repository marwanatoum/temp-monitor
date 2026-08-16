/* ============================================================
   نظام الترجمة (i18n) — عربي / فرنسي / إنجليزي
   ============================================================ */

const TRANSLATIONS = {
  ar: {
    dir: 'rtl',
    brand_text: 'غرفة المراقبة',
    brand_sub: 'TEMP MONITOR',
    nav_dashboard: 'اللوحة',
    nav_devices: 'إدارة الأجهزة',
    nav_map: 'الخريطة',
    conn_connecting: 'جارٍ الاتصال…',
    conn_connected: 'متصل',
    conn_disconnected: 'غير متصل',
    logout: 'خروج',

    login_username: 'اسم المستخدم',
    login_password: 'كلمة المرور',
    login_button: 'دخول',

    device_label: 'الجهاز',
    no_devices_hint: 'لا توجد أجهزة بعد. أضف جهازاً من صفحة "إدارة الأجهزة" أولاً.',
    select_device_placeholder: '— اختر جهازاً —',

    lcd_no_data: 'لا بيانات',
    lcd_normal: 'طبيعي',
    lcd_alarm: '⚠ تنبيه',
    lcd_offline: '❌ منقطع',
    lcd_error_prefix: '⚠ انقطع الاتصال بالجهاز — آخر قراءة منذ',
    age_less_min: 'أقل من دقيقة',
    age_one_min: 'دقيقة واحدة',
    age_mins: 'دقيقة',
    age_hours: 'ساعة',

    range_from: 'من تاريخ',
    range_to: 'إلى تاريخ',
    range_apply: 'تطبيق',
    range_reset: 'إعادة ضبط',
    range_all_short: 'الكل',

    info_last_update: 'آخر تحديث',
    info_reading_count: 'عدد القراءات',
    chart_title: 'الرسم البياني',
    table_title: 'سجل القراءات',
    th_time: 'الوقت',
    th_temp: 'الحرارة °C',
    th_humidity: 'الرطوبة %',
    th_status: 'الحالة',
    table_empty: 'لا توجد قراءات في هذا المدى الزمني',
    badge_normal: 'طبيعي',
    badge_alarm: 'تنبيه',
    export_csv: 'CSV ⬇',
    export_xlsx: 'Excel ⬇',

    api_title: 'إرسال قراءة (من ESP32)',

    // إدارة الأجهزة
    devices_title: 'إدارة الأجهزة',
    add_device_title: 'إضافة جهاز جديد',
    field_device_id: 'معرّف الجهاز (device_id)',
    field_description: 'وصف قصير (اختياري)',
    field_lat: 'خط العرض (اختياري)',
    field_lng: 'خط الطول (اختياري)',
    field_temp_min: 'الحرارة الدنيا °C (اختياري)',
    field_temp_max: 'الحرارة القصوى °C (اختياري)',
    tags_title: 'قيم إضافية (Tags) — اختياري',
    tag_name_placeholder: 'اسم القيمة (مثلاً: التردد)',
    tag_unit_placeholder: 'الوحدة (مثلاً: Hz)',
    tag_min_placeholder: 'Min (اختياري)',
    tag_max_placeholder: 'Max (اختياري)',
    add_tag_btn: '➕ إضافة tag',
    save_device_btn: 'حفظ الجهاز',
    devices_list_title: 'الأجهزة المسجلة',
    no_devices_yet: 'لا توجد أجهزة مسجلة بعد',
    delete_btn: 'حذف',
    confirm_delete: 'هل أنت متأكد من حذف هذا الجهاز؟ سيتم حذف كل بياناته أيضاً.',
    device_added_success: 'تمت إضافة الجهاز بنجاح',
    device_id_required: 'معرّف الجهاز مطلوب',
    device_exists_error: 'هذا الجهاز موجود بالفعل',
    edit_device_title: 'تعديل الجهاز',
    edit_btn: 'تعديل',
    cancel_edit_btn: 'إلغاء',
    device_updated_success: 'تم تحديث الجهاز بنجاح',

    // الخريطة
    map_title: 'خريطة الأجهزة',
    map_no_coords: 'لا يوجد جهاز عنده إحداثيات محفوظة بعد',
  },

  fr: {
    dir: 'ltr',
    brand_text: 'Salle de contrôle',
    brand_sub: 'TEMP MONITOR',
    nav_dashboard: 'Tableau de bord',
    nav_devices: 'Appareils',
    nav_map: 'Carte',
    conn_connecting: 'Connexion…',
    conn_connected: 'Connecté',
    conn_disconnected: 'Déconnecté',
    logout: 'Déconnexion',

    login_username: 'Nom d\u2019utilisateur',
    login_password: 'Mot de passe',
    login_button: 'Connexion',

    device_label: 'Appareil',
    no_devices_hint: 'Aucun appareil. Ajoutez-en un depuis "Appareils" d\u2019abord.',
    select_device_placeholder: '— Choisir un appareil —',

    lcd_no_data: 'Aucune donnée',
    lcd_normal: 'Normal',
    lcd_alarm: '⚠ Alarme',
    lcd_offline: '❌ Hors ligne',
    lcd_error_prefix: '⚠ Appareil déconnecté — dernière lecture il y a',
    age_less_min: 'moins d\u2019une minute',
    age_one_min: '1 minute',
    age_mins: 'minutes',
    age_hours: 'heures',

    range_from: 'Du',
    range_to: 'Au',
    range_apply: 'Appliquer',
    range_reset: 'Réinitialiser',
    range_all_short: 'Tout',

    info_last_update: 'Dernière mise à jour',
    info_reading_count: 'Nombre de lectures',
    chart_title: 'Graphique',
    table_title: 'Historique des lectures',
    th_time: 'Heure',
    th_temp: 'Temp. °C',
    th_humidity: 'Humidité %',
    th_status: 'État',
    table_empty: 'Aucune lecture dans cette période',
    badge_normal: 'Normal',
    badge_alarm: 'Alarme',
    export_csv: 'CSV ⬇',
    export_xlsx: 'Excel ⬇',

    api_title: 'Envoyer une lecture (depuis ESP32)',

    devices_title: 'Gestion des appareils',
    add_device_title: 'Ajouter un appareil',
    field_device_id: 'Identifiant (device_id)',
    field_description: 'Description courte (optionnel)',
    field_lat: 'Latitude (optionnel)',
    field_lng: 'Longitude (optionnel)',
    field_temp_min: 'Temp. min °C (optionnel)',
    field_temp_max: 'Temp. max °C (optionnel)',
    tags_title: 'Valeurs supplémentaires (Tags) — optionnel',
    tag_name_placeholder: 'Nom de la valeur (ex: Fréquence)',
    tag_unit_placeholder: 'Unité (ex: Hz)',
    tag_min_placeholder: 'Min (optionnel)',
    tag_max_placeholder: 'Max (optionnel)',
    add_tag_btn: '➕ Ajouter un tag',
    save_device_btn: 'Enregistrer',
    devices_list_title: 'Appareils enregistrés',
    no_devices_yet: 'Aucun appareil enregistré',
    delete_btn: 'Supprimer',
    confirm_delete: 'Supprimer cet appareil ? Toutes ses données seront aussi supprimées.',
    device_added_success: 'Appareil ajouté avec succès',
    device_id_required: 'L\u2019identifiant est requis',
    device_exists_error: 'Cet appareil existe déjà',
    edit_device_title: 'Modifier l\u2019appareil',
    edit_btn: 'Modifier',
    cancel_edit_btn: 'Annuler',
    device_updated_success: 'Appareil mis à jour avec succès',

    map_title: 'Carte des appareils',
    map_no_coords: 'Aucun appareil avec des coordonnées enregistrées',
  },

  en: {
    dir: 'ltr',
    brand_text: 'Monitoring Room',
    brand_sub: 'TEMP MONITOR',
    nav_dashboard: 'Dashboard',
    nav_devices: 'Devices',
    nav_map: 'Map',
    conn_connecting: 'Connecting…',
    conn_connected: 'Connected',
    conn_disconnected: 'Disconnected',
    logout: 'Logout',

    login_username: 'Username',
    login_password: 'Password',
    login_button: 'Log in',

    device_label: 'Device',
    no_devices_hint: 'No devices yet. Add one from "Devices" first.',
    select_device_placeholder: '— Select a device —',

    lcd_no_data: 'No data',
    lcd_normal: 'Normal',
    lcd_alarm: '⚠ Alarm',
    lcd_offline: '❌ Offline',
    lcd_error_prefix: '⚠ Device disconnected — last reading',
    age_less_min: 'less than a minute ago',
    age_one_min: '1 minute ago',
    age_mins: 'minutes ago',
    age_hours: 'hours ago',

    range_from: 'From',
    range_to: 'To',
    range_apply: 'Apply',
    range_reset: 'Reset',
    range_all_short: 'All',

    info_last_update: 'Last update',
    info_reading_count: 'Readings shown',
    chart_title: 'Chart',
    table_title: 'Reading log',
    th_time: 'Time',
    th_temp: 'Temp °C',
    th_humidity: 'Humidity %',
    th_status: 'Status',
    table_empty: 'No readings in this range',
    badge_normal: 'Normal',
    badge_alarm: 'Alarm',
    export_csv: 'CSV ⬇',
    export_xlsx: 'Excel ⬇',

    api_title: 'Send a reading (from ESP32)',

    devices_title: 'Device Management',
    add_device_title: 'Add a new device',
    field_device_id: 'Device ID',
    field_description: 'Short description (optional)',
    field_lat: 'Latitude (optional)',
    field_lng: 'Longitude (optional)',
    field_temp_min: 'Min temperature °C (optional)',
    field_temp_max: 'Max temperature °C (optional)',
    tags_title: 'Extra values (Tags) — optional',
    tag_name_placeholder: 'Value name (e.g. Frequency)',
    tag_unit_placeholder: 'Unit (e.g. Hz)',
    tag_min_placeholder: 'Min (optional)',
    tag_max_placeholder: 'Max (optional)',
    add_tag_btn: '➕ Add tag',
    save_device_btn: 'Save device',
    devices_list_title: 'Registered devices',
    no_devices_yet: 'No devices registered yet',
    delete_btn: 'Delete',
    confirm_delete: 'Delete this device? All its data will be deleted too.',
    device_added_success: 'Device added successfully',
    device_id_required: 'Device ID is required',
    device_exists_error: 'This device already exists',
    edit_device_title: 'Edit device',
    edit_btn: 'Edit',
    cancel_edit_btn: 'Cancel',
    device_updated_success: 'Device updated successfully',

    map_title: 'Device Map',
    map_no_coords: 'No device has saved coordinates yet',
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  if (typeof onLanguageChange === 'function') {
    // يُستدعى مرة أخرى صراحة عبر setLang، هنا فقط لضمان الاتساق عند التحميل الأول
  }
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

// تطبيق الوضع فوراً لتفادي وميض عند التحميل
applyTheme();
// تطبيق النصوص بعد جهوزية DOM (لأن هذا السكريبت محمّل في <head>)
document.addEventListener('DOMContentLoaded', applyTranslations);

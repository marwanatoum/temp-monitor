const state = {
  device: null,
  limit: 60,
  chart: null,
};

// إذا لم تصل قراءة جديدة خلال هذه المدة، نعتبر الجهاز منقطعاً
// (الجهاز يرسل كل دقيقة تقريباً، فنضع هامش أمان = 3 أضعاف)
const STALE_THRESHOLD_MS = 3 * 60 * 1000;

const $ = (id) => document.getElementById(id);

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setConnStatus(ok) {
  $('conn-led').classList.toggle('on', ok);
  $('conn-label').textContent = ok ? t('conn_connected') : t('conn_disconnected');
}

async function fetchDevices() {
  const res = await fetch('/api/devices');
  const devices = await res.json();
  const select = $('device-select');
  select.innerHTML = '';

  if (devices.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'لا توجد أجهزة بعد';
    select.appendChild(opt);
    return null;
  }

  devices.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });

  if (!state.device || !devices.includes(state.device)) {
    state.device = devices[0];
  }
  select.value = state.device;
  return state.device;
}

function initChart() {
  const ctx = $('tempChart').getContext('2d');
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'الحرارة °C',
        data: [],
        borderColor: '#3FE07A',
        backgroundColor: 'rgba(63,224,122,0.08)',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.25,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { ticks: { color: '#7F9689', maxRotation: 0, autoSkip: true }, grid: { color: '#1A241F' } },
        y: { ticks: { color: '#7F9689' }, grid: { color: '#1A241F' } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function renderLCD(reading) {
  const digits = $('lcd-digits');
  const chipState = $('lcd-chip-state');
  const chipHumidity = $('lcd-chip-humidity');
  const time = $('lcd-time');
  const errorBanner = $('lcd-error');

  if (!reading) {
    digits.textContent = '--.-';
    digits.className = 'lcd-digits off';
    chipState.textContent = t('lcd_no_data');
    chipHumidity.textContent = 'RH --%';
    time.textContent = '--:--:--';
    errorBanner.classList.remove('show');
    return;
  }

  const ageMs = Date.now() - new Date(reading.created_at).getTime();
  const isStale = ageMs > STALE_THRESHOLD_MS;

  if (isStale) {
    digits.textContent = '##';
    digits.className = 'lcd-digits error';
    chipState.textContent = t('lcd_offline');
    chipHumidity.textContent = reading.humidity != null ? `RH ${reading.humidity}%` : 'RH --%';
    time.textContent = fmtTime(reading.created_at);
    errorBanner.textContent = `${t('lcd_error_prefix')} ${formatAge(ageMs)}`;
    errorBanner.classList.add('show');
    return;
  }

  errorBanner.classList.remove('show');
  digits.textContent = reading.temperature.toFixed(1);
  digits.className = 'lcd-digits' + (reading.alarm ? ' warn' : '');
  chipState.textContent = reading.alarm ? t('lcd_alarm') : t('lcd_normal');
  chipHumidity.textContent = reading.humidity != null ? `RH ${reading.humidity}%` : 'RH --%';
  time.textContent = fmtTime(reading.created_at);
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return t('age_less_min');
  if (mins === 1) return t('age_one_min');
  if (mins < 60) return `${mins} ${t('age_mins')}`;
  const hours = Math.floor(mins / 60);
  return `${hours} ${t('age_hours')}`;
}

function renderTable(rows) {
  const tbody = $('readings-tbody');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">${t('table_empty')}</td></tr>`;
    return;
  }
  const recent = [...rows].reverse().slice(0, 25);
  tbody.innerHTML = recent.map((r) => `
    <tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.device_id}</td>
      <td>${r.temperature.toFixed(1)}</td>
      <td>${r.humidity != null ? r.humidity : '—'}</td>
      <td><span class="badge ${r.alarm ? 'badge-warn' : 'badge-ok'}">${r.alarm ? t('badge_alarm') : t('badge_normal')}</span></td>
    </tr>
  `).join('');
}

function renderStats(rows) {
  $('reading-count').textContent = rows.length;
  if (rows.length === 0) {
    $('last-update').textContent = '—';
    $('min-max').textContent = '—';
    return;
  }
  const last = rows[rows.length - 1];
  $('last-update').textContent = new Date(last.created_at).toLocaleString('ar-MA');
  const temps = rows.map((r) => r.temperature);
  $('min-max').textContent = `${Math.min(...temps).toFixed(1)}°C — ${Math.max(...temps).toFixed(1)}°C`;
}

function renderChart(rows) {
  state.chart.data.labels = rows.map((r) => fmtTime(r.created_at));
  state.chart.data.datasets[0].data = rows.map((r) => r.temperature);
  state.chart.update();
}

async function refresh() {
  try {
    if (!state.device) {
      const d = await fetchDevices();
      if (!d) { setConnStatus(false); renderLCD(null); return; }
    }
    const res = await fetch(`/api/readings?device_id=${encodeURIComponent(state.device)}&limit=${state.limit}`);
    if (!res.ok) throw new Error('bad response');
    const rows = await res.json();
    const lastReading = rows.length ? rows[rows.length - 1] : null;
    const isStale = lastReading
      ? (Date.now() - new Date(lastReading.created_at).getTime()) > STALE_THRESHOLD_MS
      : true;

    setConnStatus(!isStale);
    renderLCD(lastReading);
    renderTable(rows);
    renderStats(rows);
    renderChart(rows);
  } catch (e) {
    setConnStatus(false);
  }
}

// ------------- events -------------
$('device-select').addEventListener('change', (e) => {
  state.device = e.target.value;
  refresh();
});

document.querySelectorAll('.range-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.limit = parseInt(btn.dataset.limit, 10);
    refresh();
  });
});

// ------------- ربط مع نظام الترجمة (i18n.js) -------------
// تُستدعى تلقائياً من setLang() عند تبديل اللغة، لإعادة رسم النصوص الديناميكية فوراً
function onLanguageChange() {
  refresh();
}

// ------------- init -------------
initChart();
refresh();
setInterval(refresh, 5000);

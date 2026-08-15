const state = {
  devices: [],       // [{device_id, device_type, display_name}]
  deviceTypes: {},   // {vfd: {frequency_hz: "Hz", ...}, ...}
  activeType: 'all',
  selectedDevice: null,
  selectedMetric: null,
  limit: 60,
  chart: null,
  latestByDevice: {}, // device_id -> آخر قراءة (لعرض البطاقات)
};

// إذا لم تصل قراءة جديدة خلال هذه المدة، نعتبر الجهاز منقطعاً
const STALE_THRESHOLD_MS = 3 * 60 * 1000;

const $ = (id) => document.getElementById(id);

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function metricLabel(key) {
  return t(`metric_${key}`) !== `metric_${key}` ? t(`metric_${key}`) : key;
}

function metricUnit(key) {
  return METRIC_UNITS[key] || '';
}

function typeLabel(type) {
  const key = `type_${type}`;
  return t(key) !== key ? t(key) : type;
}

function isStaleReading(reading) {
  if (!reading) return true;
  return (Date.now() - new Date(reading.created_at).getTime()) > STALE_THRESHOLD_MS;
}

// ------------- جلب البيانات الأساسية -------------
async function fetchDeviceTypes() {
  const res = await fetch('/api/device-types');
  state.deviceTypes = await res.json();
}

async function fetchDevices() {
  const res = await fetch('/api/devices');
  state.devices = await res.json();
}

async function fetchLatestForDevice(deviceId) {
  const res = await fetch(`/api/readings?device_id=${encodeURIComponent(deviceId)}&limit=1`);
  const rows = await res.json();
  return rows.length ? rows[rows.length - 1] : null;
}

async function refreshAllLatest() {
  await Promise.all(state.devices.map(async (dev) => {
    state.latestByDevice[dev.device_id] = await fetchLatestForDevice(dev.device_id);
  }));
}

// ------------- تبويبات الأنواع -------------
function renderTypeTabs() {
  const container = $('type-tabs');
  const presentTypes = [...new Set(state.devices.map((d) => d.device_type))];

  let html = `<button class="type-tab ${state.activeType === 'all' ? 'active' : ''}" data-type="all">
    <span class="type-tab-icon">📋</span> ${t('type_all')}
  </button>`;

  presentTypes.forEach((type) => {
    const icon = TYPE_ICONS[type] || '🔹';
    html += `<button class="type-tab ${state.activeType === type ? 'active' : ''}" data-type="${type}">
      <span class="type-tab-icon">${icon}</span> ${typeLabel(type)}
    </button>`;
  });

  container.innerHTML = html;
  container.querySelectorAll('.type-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeType = btn.dataset.type;
      renderTypeTabs();
      renderDeviceGrid();
    });
  });
}

// ------------- شبكة بطاقات الأجهزة -------------
function renderDeviceGrid() {
  const container = $('device-grid');
  const devices = state.devices.filter(
    (d) => state.activeType === 'all' || d.device_type === state.activeType
  );

  if (devices.length === 0) {
    container.innerHTML = `<div class="empty-grid">${t('no_devices')}</div>`;
    return;
  }

  container.innerHTML = devices.map((dev) => {
    const reading = state.latestByDevice[dev.device_id];
    const stale = isStaleReading(reading);
    const alarm = reading && reading.alarm && !stale;
    const icon = TYPE_ICONS[dev.device_type] || '🔹';

    let statusClass = 'off';
    if (!stale && reading) statusClass = alarm ? 'warn' : 'ok';

    const metricsHtml = reading
      ? Object.entries(reading.metrics).map(([k, v]) => `
          <div class="metric-chip">
            <span class="metric-value">${typeof v === 'number' ? v.toFixed(1) : v}</span>
            <span class="metric-unit">${metricUnit(k)}</span>
            <span class="metric-label">${metricLabel(k)}</span>
          </div>
        `).join('')
      : `<div class="metric-chip empty">${t('lcd_no_data')}</div>`;

    const isSelected = state.selectedDevice === dev.device_id;

    return `
      <div class="device-card ${isSelected ? 'selected' : ''}" data-device="${dev.device_id}">
        <div class="device-card-head">
          <span class="device-icon">${icon}</span>
          <span class="device-name">${dev.display_name || dev.device_id}</span>
          <span class="device-dot dot-${statusClass}"></span>
        </div>
        <div class="device-metrics">${metricsHtml}</div>
        <div class="device-time">${reading ? fmtTime(reading.created_at) : '--:--:--'}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.device-card').forEach((card) => {
    card.addEventListener('click', () => selectDevice(card.dataset.device));
  });
}

// ------------- اختيار جهاز لعرض السجل/الرسم البياني -------------
function selectDevice(deviceId) {
  state.selectedDevice = deviceId;
  state.selectedMetric = null; // إعادة الضبط، سيُختار أول قيمة تلقائياً
  renderDeviceGrid();
  loadDeviceDetail();
}

function populateMetricSelect(metricKeys) {
  const select = $('metric-select');
  select.innerHTML = metricKeys.map((k) => `<option value="${k}">${metricLabel(k)} (${metricUnit(k)})</option>`).join('');
  if (!state.selectedMetric || !metricKeys.includes(state.selectedMetric)) {
    state.selectedMetric = metricKeys[0] || null;
  }
  select.value = state.selectedMetric;
}

function updateExportLinks() {
  const csvBtn = $('export-csv-btn');
  const xlsxBtn = $('export-xlsx-btn');
  const params = new URLSearchParams();
  if (state.selectedDevice) params.set('device_id', state.selectedDevice);
  params.set('lang', getLang());
  csvBtn.href = `/api/export/csv?${params.toString()}`;
  xlsxBtn.href = `/api/export/xlsx?${params.toString()}`;
}

function renderTable(rows) {
  const theadRow = $('readings-thead-row');
  const tbody = $('readings-tbody');

  const metricKeys = [];
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => {
    if (!metricKeys.includes(k)) metricKeys.push(k);
  }));

  theadRow.innerHTML = `<th data-i18n="th_time">${t('th_time')}</th>` +
    metricKeys.map((k) => `<th>${metricLabel(k)}</th>`).join('') +
    `<th data-i18n="th_status">${t('th_status')}</th>`;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${metricKeys.length + 2}" class="empty-row">${t('table_empty')}</td></tr>`;
    return;
  }

  const recent = [...rows].reverse().slice(0, 25);
  tbody.innerHTML = recent.map((r) => `
    <tr>
      <td>${fmtTime(r.created_at)}</td>
      ${metricKeys.map((k) => `<td>${r.metrics[k] != null ? r.metrics[k] : '—'}</td>`).join('')}
      <td><span class="badge ${r.alarm ? 'badge-warn' : 'badge-ok'}">${r.alarm ? t('badge_alarm') : t('badge_normal')}</span></td>
    </tr>
  `).join('');
}

function renderStats(rows) {
  $('reading-count').textContent = rows.length;
  $('last-update').textContent = rows.length
    ? new Date(rows[rows.length - 1].created_at).toLocaleString('ar-MA')
    : '—';
}

function initChart() {
  const ctx = $('tempChart').getContext('2d');
  state.chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{
      data: [], borderColor: '#3FE07A', backgroundColor: 'rgba(63,224,122,0.08)',
      pointRadius: 0, borderWidth: 2, tension: 0.25, fill: true,
    }]},
    options: {
      responsive: true, animation: false,
      scales: {
        x: { ticks: { color: '#7F9689', maxRotation: 0, autoSkip: true }, grid: { color: '#1A241F' } },
        y: { ticks: { color: '#7F9689' }, grid: { color: '#1A241F' } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function renderChart(rows) {
  if (!state.selectedMetric) {
    state.chart.data.labels = [];
    state.chart.data.datasets[0].data = [];
    state.chart.update();
    return;
  }
  const filtered = rows.filter((r) => r.metrics[state.selectedMetric] != null);
  state.chart.data.labels = filtered.map((r) => fmtTime(r.created_at));
  state.chart.data.datasets[0].data = filtered.map((r) => r.metrics[state.selectedMetric]);
  state.chart.update();
}

async function loadDeviceDetail() {
  if (!state.selectedDevice) return;

  $('selected-device-title').textContent = state.selectedDevice;

  const res = await fetch(`/api/readings?device_id=${encodeURIComponent(state.selectedDevice)}&limit=${state.limit}`);
  const rows = await res.json();

  const metricKeys = [];
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => {
    if (!metricKeys.includes(k)) metricKeys.push(k);
  }));
  populateMetricSelect(metricKeys);

  renderTable(rows);
  renderStats(rows);
  renderChart(rows);
  updateExportLinks();
}

// ------------- التحديث الدوري -------------
async function refresh() {
  try {
    await fetchDevices();
    await refreshAllLatest();

    if (!state.selectedDevice && state.devices.length > 0) {
      state.selectedDevice = state.devices[0].device_id;
    }

    renderTypeTabs();
    renderDeviceGrid();

    if (state.selectedDevice) {
      await loadDeviceDetail();
    }

    const anyOnline = state.devices.some((d) => !isStaleReading(state.latestByDevice[d.device_id]));
    setConnStatus(anyOnline);
  } catch (e) {
    setConnStatus(false);
  }
}

function setConnStatus(ok) {
  $('conn-led').classList.toggle('on', ok);
  $('conn-label').textContent = ok ? t('conn_connected') : t('conn_disconnected');
}

// ------------- ربط مع نظام الترجمة (i18n.js) -------------
function onLanguageChange() {
  renderTypeTabs();
  renderDeviceGrid();
  if (state.selectedDevice) loadDeviceDetail();
}

// ------------- الأحداث -------------
document.querySelectorAll('.range-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.limit = parseInt(btn.dataset.limit, 10);
    if (state.selectedDevice) loadDeviceDetail();
  });
});

$('metric-select').addEventListener('change', (e) => {
  state.selectedMetric = e.target.value;
  if (state.selectedDevice) loadDeviceDetail();
});

// ------------- init -------------
(async function init() {
  initChart();
  await fetchDeviceTypes();
  await refresh();
  setInterval(refresh, 5000);
})();

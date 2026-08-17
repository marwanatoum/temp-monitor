const $ = (id) => document.getElementById(id);

const STALE_THRESHOLD_MS = 3 * 60 * 1000;

const state = {
  devices: [],
  selectedDevice: null,
  selectedDeviceObj: null,
  selectedMetric: null, // اسم tag، يُحدَّد تلقائياً من أول tag للجهاز
  chart: null,
  dateFrom: null,
  dateTo: null,
};

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('ar-MA');
}

function isStaleReading(reading) {
  if (!reading) return true;
  return (Date.now() - new Date(reading.created_at).getTime()) > STALE_THRESHOLD_MS;
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return t('age_less_min');
  if (mins === 1) return t('age_one_min');
  if (mins < 60) return `${mins} ${t('age_mins')}`;
  const hours = Math.floor(mins / 60);
  return `${hours} ${t('age_hours')}`;
}

// ------------- تحميل قائمة الأجهزة -------------
async function loadDeviceList() {
  const res = await fetch('/api/devices');
  state.devices = await res.json();

  const select = $('device-select');
  const noDevicesHint = $('no-devices-hint');
  const detail = $('device-detail');

  if (state.devices.length === 0) {
    select.innerHTML = '';
    noDevicesHint.style.display = 'block';
    detail.style.display = 'none';
    return;
  }

  noDevicesHint.style.display = 'none';
  select.innerHTML = `<option value="" disabled ${!state.selectedDevice ? 'selected' : ''}>${t('select_device_placeholder')}</option>` +
    state.devices.map((d) => `<option value="${d.device_id}">${d.device_id}${d.description ? ' — ' + d.description : ''}</option>`).join('');

  if (state.selectedDevice) {
    select.value = state.selectedDevice;
  }
}

function onDeviceChange(deviceId) {
  state.selectedDevice = deviceId;
  state.selectedDeviceObj = state.devices.find((d) => d.device_id === deviceId) || null;
  state.selectedMetric = null;
  $('device-detail').style.display = 'block';
  updateApiExample();
  applyPreset('24h');
}

function updateApiExample() {
  if (!state.selectedDeviceObj) return;
  const dev = state.selectedDeviceObj;
  let example;
  if (dev.tags && dev.tags.length > 0) {
    const valuesObj = {};
    dev.tags.forEach((tg) => { valuesObj[tg.tag_name] = 0; });
    example = {
      api_key: 'changeme-esp32-key',
      device_id: dev.device_id,
      values: valuesObj,
    };
  } else {
    example = {
      api_key: 'changeme-esp32-key',
      device_id: dev.device_id,
      temperature: 4.2,
      humidity: 55.0,
    };
  }
  $('api-example').textContent = `POST /api/reading\nContent-Type: application/json\n\n${JSON.stringify(example, null, 2)}`;
}

// ------------- منتقي التاريخ/الوقت -------------
function getRangeParams() {
  const params = new URLSearchParams();
  if (state.dateFrom) params.set('from', new Date(state.dateFrom).toISOString());
  if (state.dateTo) params.set('to', new Date(state.dateTo).toISOString());
  return params;
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyPreset(preset) {
  document.querySelectorAll('.range-preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.preset === preset));

  const now = new Date();
  let from = null;

  if (preset === '24h') {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (preset === '7d') {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (preset === '30d') {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (preset === 'all') {
    from = null;
  }

  $('range-from').value = from ? toLocalInputValue(from) : '';
  $('range-to').value = '';
  state.dateFrom = from ? toLocalInputValue(from) : null;
  state.dateTo = null;

  if (state.selectedDevice) loadAndRenderDetail();
}

document.querySelectorAll('.range-preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

$('range-apply-btn').addEventListener('click', () => {
  document.querySelectorAll('.range-preset-btn').forEach((b) => b.classList.remove('active'));
  state.dateFrom = $('range-from').value || null;
  state.dateTo = $('range-to').value || null;
  loadAndRenderDetail();
});

// ------------- الشاشة (LCD) العامة (حسب state.selectedMetric) + chips لكل القيم -------------
function renderLCDAndTags(reading, device) {
  const digits = $('lcd-digits');
  const unitEl = $('lcd-unit');
  const chipState = $('lcd-chip-state');
  const time = $('lcd-time');
  const errorBanner = $('lcd-error');
  const tagsContainer = $('tags-chips');

  const tagDef = (device.tags || []).find((tg) => tg.tag_name === state.selectedMetric);
  const unit = tagDef ? (tagDef.unit || '') : '';
  unitEl.textContent = unit;

  if (!reading || !state.selectedMetric) {
    digits.textContent = '--.-';
    digits.className = 'lcd-digits off';
    chipState.textContent = t('lcd_no_data');
    time.textContent = '--:--:--';
    errorBanner.classList.remove('show');
  } else {
    const values = reading.values || {};
    const stale = isStaleReading(reading);
    const ageMs = Date.now() - new Date(reading.created_at).getTime();
    const value = values[state.selectedMetric];

    if (stale) {
      digits.textContent = '##';
      digits.className = 'lcd-digits error';
      chipState.textContent = t('lcd_offline');
      time.textContent = fmtTime(reading.created_at);
      errorBanner.textContent = `${t('lcd_error_prefix')} ${formatAge(ageMs)}`;
      errorBanner.classList.add('show');
    } else {
      errorBanner.classList.remove('show');
      digits.textContent = (value != null) ? (typeof value === 'number' ? value.toFixed(1) : value) : '--.-';
      digits.className = 'lcd-digits' + (reading.alarm ? ' warn' : '');
      chipState.textContent = reading.alarm ? t('lcd_alarm') : t('lcd_normal');
      time.textContent = fmtTime(reading.created_at);
    }
  }

  // عرض كل القيم الحالية للجهاز كـ chips (مرجع مستقل عن الشاشة)
  const values = (reading && reading.values) || {};
  const tagEntries = Object.entries(values);
  tagsContainer.innerHTML = tagEntries.length === 0 ? '' : tagEntries.map(([k, v]) => {
    const def = (device.tags || []).find((tg) => tg.tag_name === k);
    const u = def ? (def.unit || '') : '';
    const isActive = k === state.selectedMetric;
    return `
      <div class="metric-chip${isActive ? ' active' : ''}" data-metric="${k}">
        <span class="metric-value">${typeof v === 'number' ? v.toFixed(1) : v}</span>
        <span class="metric-unit">${u}</span>
        <span class="metric-label">${k}</span>
      </div>
    `;
  }).join('');

  tagsContainer.querySelectorAll('.metric-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.selectedMetric = chip.dataset.metric;
      $('metric-select').value = state.selectedMetric;
      loadAndRenderDetail();
    });
  });
}

// ------------- الرسم البياني -------------
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

function metricValue(reading, metric) {
  return reading.values ? reading.values[metric] : undefined;
}

function populateMetricSelect(device) {
  const select = $('metric-select');
  const options = (device.tags || []).map((tg) => ({
    value: tg.tag_name,
    label: tg.unit ? `${tg.tag_name} (${tg.unit})` : tg.tag_name,
  }));

  select.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  if (!options.some((o) => o.value === state.selectedMetric)) {
    state.selectedMetric = options.length ? options[0].value : null;
  }
  select.value = state.selectedMetric;
}

$('metric-select').addEventListener('change', (e) => {
  state.selectedMetric = e.target.value;
  loadAndRenderDetail();
});

function renderChart(rows) {
  if (!state.selectedMetric) {
    state.chart.data.labels = [];
    state.chart.data.datasets[0].data = [];
    state.chart.update();
    return;
  }
  const filtered = rows.filter((r) => metricValue(r, state.selectedMetric) != null);
  state.chart.data.labels = filtered.map((r) => fmtTime(r.created_at));
  state.chart.data.datasets[0].data = filtered.map((r) => metricValue(r, state.selectedMetric));
  state.chart.update();
}

// ------------- الجدول -------------
function renderTable(rows, device) {
  const theadRow = $('readings-thead-row');
  const tbody = $('readings-tbody');
  const tagNames = (device.tags || []).map((tg) => tg.tag_name);

  theadRow.innerHTML = `<th>${t('th_time')}</th>` +
    tagNames.map((n) => `<th>${n}</th>`).join('') +
    `<th>${t('th_status')}</th>`;

  const colCount = 2 + tagNames.length;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-row">${t('table_empty')}</td></tr>`;
    return;
  }

  const recent = [...rows].reverse().slice(0, 50);
  tbody.innerHTML = recent.map((r) => `
    <tr>
      <td>${fmtTime(r.created_at)}</td>
      ${tagNames.map((n) => `<td>${(r.values && r.values[n] != null) ? r.values[n] : '—'}</td>`).join('')}
      <td><span class="badge ${r.alarm ? 'badge-warn' : 'badge-ok'}">${r.alarm ? t('badge_alarm') : t('badge_normal')}</span></td>
    </tr>
  `).join('');
}

function renderStats(rows) {
  $('reading-count').textContent = rows.length;
  $('last-update').textContent = rows.length ? fmtDateTime(rows[rows.length - 1].created_at) : '—';
}

// ------------- التصدير -------------
function updateExportLinks() {
  const params = getRangeParams();
  params.set('device_id', state.selectedDevice);
  params.set('lang', getLang());
  $('export-csv-btn').href = `/api/export/csv?${params.toString()}`;
  $('export-xlsx-btn').href = `/api/export/xlsx?${params.toString()}`;
}

// ------------- التحميل والعرض الرئيسي -------------
async function loadAndRenderDetail() {
  if (!state.selectedDevice || !state.selectedDeviceObj) return;

  const device = state.selectedDeviceObj;
  populateMetricSelect(device);

  const params = getRangeParams();
  params.set('device_id', state.selectedDevice);
  params.set('limit', '500');

  const res = await fetch(`/api/readings?${params.toString()}`);
  const rows = await res.json();

  const latest = rows.length ? rows[rows.length - 1] : null;
  renderLCDAndTags(latest, device);
  renderChart(rows);
  renderTable(rows, device);
  renderStats(rows);
  updateExportLinks();

  setConnStatus(!isStaleReading(latest));
}

function setConnStatus(ok) {
  $('conn-led').classList.toggle('on', ok);
  $('conn-label').textContent = ok ? t('conn_connected') : t('conn_disconnected');
}

// ------------- ربط مع نظام الترجمة -------------
function onLanguageChange() {
  loadDeviceList();
  if (state.selectedDevice) loadAndRenderDetail();
}

// ------------- الأحداث -------------
$('device-select').addEventListener('change', (e) => onDeviceChange(e.target.value));

// ------------- init -------------
(async function init() {
  initChart();
  await loadDeviceList();
  if (state.devices.length > 0) {
    $('device-select').value = state.devices[0].device_id;
    onDeviceChange(state.devices[0].device_id);
  }
  setInterval(() => { if (state.selectedDevice) loadAndRenderDetail(); }, 5000);
})();

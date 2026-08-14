const state = {
  device: null,
  limit: 60,
  chart: null,
};

const $ = (id) => document.getElementById(id);

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setConnStatus(ok) {
  $('conn-led').classList.toggle('on', ok);
  $('conn-label').textContent = ok ? 'متصل' : 'غير متصل';
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

  if (!reading) {
    digits.textContent = '--.-';
    digits.className = 'lcd-digits off';
    chipState.textContent = 'لا بيانات';
    chipHumidity.textContent = 'RH --%';
    time.textContent = '--:--:--';
    return;
  }

  digits.textContent = reading.temperature.toFixed(1);
  digits.className = 'lcd-digits' + (reading.alarm ? ' warn' : '');
  chipState.textContent = reading.alarm ? '⚠ تنبيه' : 'طبيعي';
  chipHumidity.textContent = reading.humidity != null ? `RH ${reading.humidity}%` : 'RH --%';
  time.textContent = fmtTime(reading.created_at);
}

function renderTable(rows) {
  const tbody = $('readings-tbody');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">بانتظار أول قراءة من الجهاز…</td></tr>';
    return;
  }
  const recent = [...rows].reverse().slice(0, 25);
  tbody.innerHTML = recent.map((r) => `
    <tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.device_id}</td>
      <td>${r.temperature.toFixed(1)}</td>
      <td>${r.humidity != null ? r.humidity : '—'}</td>
      <td><span class="badge ${r.alarm ? 'badge-warn' : 'badge-ok'}">${r.alarm ? 'تنبيه' : 'طبيعي'}</span></td>
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
    console.log("🔄 Refresh...");

    if (!state.device) {
      console.log("📡 Fetching devices...");

      const d = await fetchDevices();

      console.log("📡 Devices:", d);

      if (!d) {
        setConnStatus(false);
        renderLCD(null);
        return;
      }
    }

    const url =
      `/api/readings?device_id=${encodeURIComponent(state.device)}&limit=${state.limit}`;

    console.log("📡 Request:", url);

    const res = await fetch(url);

    console.log("📡 HTTP:", res.status);
    console.log("📡 URL:", res.url);

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Server response:", text);
      throw new Error(`HTTP ${res.status}`);
    }

    const rows = await res.json();

    console.log("✅ Readings:", rows);

    async function checkDeviceStatus() {
    if (!state.device) return;

    try {
        const res = await fetch(
            `/api/device-status/${encodeURIComponent(state.device)}`
        );

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const status = await res.json();

        console.log("📡 Device status:", status);

        setConnStatus(status.online);

    } catch (e) {
        console.error("❌ Status error:", e);
        setConnStatus(false);
    }
}

    renderLCD(
      rows.length ? rows[rows.length - 1] : null
    );

    renderTable(rows);
    renderStats(rows);
    renderChart(rows);

  } catch (e) {

    console.error("❌ Dashboard error:", e);

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

// ------------- init -------------
initChart();
refresh();
setInterval(refresh, 5000);

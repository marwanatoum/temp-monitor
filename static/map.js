const map = L.map('map').setView([31.7917, -7.0926], 6); // مركز المغرب افتراضياً

const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
});
tileLayer.addTo(map);

const STALE_THRESHOLD_MS = 3 * 60 * 1000;

function isStaleReading(reading) {
  if (!reading) return true;
  return (Date.now() - new Date(reading.created_at).getTime()) > STALE_THRESHOLD_MS;
}

function makeDotIcon(color) {
  return L.divIcon({
    className: 'map-dot-icon',
    html: `<span style="display:block; width:16px; height:16px; border-radius:50%; background:${color}; border:2px solid #0B120F; box-shadow:0 0 6px 1px ${color};"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

const ICON_OK = makeDotIcon('#3FE07A');
const ICON_ALARM = makeDotIcon('#FF5D5D');
const ICON_OFF = makeDotIcon('#5C7A76');

async function fetchLatest(deviceId) {
  try {
    const res = await fetch(`/api/readings/latest?device_id=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function buildPopupHtml(dev, reading) {
  const stale = isStaleReading(reading);

  let statusHtml;
  if (!reading) {
    statusHtml = `<span class="map-popup-status off">${t('lcd_no_data')}</span>`;
  } else if (stale) {
    statusHtml = `<span class="map-popup-status off">${t('lcd_offline')}</span>`;
  } else if (reading.alarm) {
    statusHtml = `<span class="map-popup-status alarm">${t('lcd_alarm')}</span>`;
  } else {
    statusHtml = `<span class="map-popup-status ok">${t('lcd_normal')}</span>`;
  }

  const values = (reading && reading.values) || {};
  const tagsHtml = Object.entries(values).map(([k, v]) => {
    const def = (dev.tags || []).find((tg) => tg.tag_name === k);
    const unit = def ? (def.unit || '') : '';
    return `
      <div class="map-popup-metric">
        <span class="map-popup-metric-label">${k}</span>
        <span class="map-popup-metric-value">${typeof v === 'number' ? v.toFixed(1) : v} ${unit}</span>
      </div>
    `;
  }).join('');

  const timeHtml = reading
    ? `<div class="map-popup-time">${new Date(reading.created_at).toLocaleString('ar-MA')}</div>`
    : '';

  return `
    <div class="map-popup-title">${dev.device_id}</div>
    ${dev.description ? `<div class="map-popup-desc">${dev.description}</div>` : ''}
    <div style="margin:6px 0;">${statusHtml}</div>
    ${tagsHtml || `<div class="map-popup-desc">${t('lcd_no_data')}</div>`}
    ${timeHtml}
  `;
}

async function loadDevicesOnMap() {
  const res = await fetch('/api/devices');
  const devices = await res.json();
  const withCoords = devices.filter((d) => d.lat != null && d.lng != null);

  if (withCoords.length === 0) {
    document.getElementById('map-empty').style.display = 'block';
    return;
  }
  document.getElementById('map-empty').style.display = 'none';

  const bounds = [];

  for (const dev of withCoords) {
    const reading = await fetchLatest(dev.device_id);
    const stale = isStaleReading(reading);
    const icon = !reading || stale ? ICON_OFF : (reading.alarm ? ICON_ALARM : ICON_OK);

    const marker = L.marker([dev.lat, dev.lng], { icon }).addTo(map);

    // اسم الجهاز يظهر بشكل دائم فوق النقطة (Tooltip)
    marker.bindTooltip(dev.device_id, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
      className: 'map-name-label',
    });

    marker.bindPopup(buildPopupHtml(dev, reading));
    bounds.push([dev.lat, dev.lng]);
  }

  if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function onLanguageChange() {
  // إعادة تحميل الماركرز حتى تتحدث نصوص الـ popup المفتوحة
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });
  loadDevicesOnMap();
}

loadDevicesOnMap();

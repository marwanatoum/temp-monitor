const map = L.map('map').setView([31.7917, -7.0926], 6); // مركز المغرب افتراضياً

const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
});
tileLayer.addTo(map);

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
  withCoords.forEach((dev) => {
    const marker = L.marker([dev.lat, dev.lng]).addTo(map);
    const popupHtml = `
      <div class="map-popup-title">${dev.device_id}</div>
      ${dev.description ? `<div class="map-popup-desc">${dev.description}</div>` : ''}
    `;
    marker.bindPopup(popupHtml);
    bounds.push([dev.lat, dev.lng]);
  });

  if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function onLanguageChange() {
  // لا حاجة لإعادة رسم الخريطة، فقط النصوص الثابتة (تُترجم تلقائياً عبر data-i18n)
}

loadDevicesOnMap();

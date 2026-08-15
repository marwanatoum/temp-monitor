const $ = (id) => document.getElementById(id);

let tagRowCount = 0;

function addTagRow(name = '', unit = '') {
  const list = $('tags-list');
  const rowId = `tag-row-${tagRowCount++}`;
  const row = document.createElement('div');
  row.className = 'tag-row';
  row.id = rowId;
  row.innerHTML = `
    <input type="text" class="tag-name" placeholder="${t('tag_name_placeholder')}" value="${name}">
    <input type="text" class="tag-unit" placeholder="${t('tag_unit_placeholder')}" value="${unit}">
    <button type="button" class="tag-remove-btn" onclick="document.getElementById('${rowId}').remove()">✕</button>
  `;
  list.appendChild(row);
}

function collectTags() {
  const rows = document.querySelectorAll('.tag-row');
  const tags = [];
  rows.forEach((row) => {
    const name = row.querySelector('.tag-name').value.trim();
    const unit = row.querySelector('.tag-unit').value.trim();
    if (name) tags.push({ tag_name: name, unit });
  });
  return tags;
}

function showFormMessage(el, message) {
  $('form-error').style.display = 'none';
  $('form-success').style.display = 'none';
  el.textContent = message;
  el.style.display = 'block';
}

async function saveDevice() {
  const device_id = $('f-device-id').value.trim();
  if (!device_id) {
    showFormMessage($('form-error'), t('device_id_required'));
    return;
  }

  const payload = {
    device_id,
    description: $('f-description').value.trim(),
    lat: $('f-lat').value,
    lng: $('f-lng').value,
    temp_min: $('f-temp-min').value,
    temp_max: $('f-temp-max').value,
    tags: collectTags(),
  };

  try {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showFormMessage($('form-error'), data.error === 'هذا الجهاز موجود بالفعل' ? t('device_exists_error') : (data.error || 'Error'));
      return;
    }

    showFormMessage($('form-success'), t('device_added_success'));
    clearForm();
    loadDevices();
  } catch (e) {
    showFormMessage($('form-error'), String(e));
  }
}

function clearForm() {
  ['f-device-id', 'f-description', 'f-lat', 'f-lng', 'f-temp-min', 'f-temp-max'].forEach((id) => {
    $(id).value = '';
  });
  $('tags-list').innerHTML = '';
}

async function deleteDevice(deviceId) {
  if (!confirm(t('confirm_delete'))) return;
  await fetch(`/api/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  loadDevices();
}

async function loadDevices() {
  const res = await fetch('/api/devices');
  const devices = await res.json();
  const container = $('devices-list');

  if (devices.length === 0) {
    container.innerHTML = `<div class="empty-state">${t('no_devices_yet')}</div>`;
    return;
  }

  container.innerHTML = devices.map((dev) => {
    const tagsHtml = dev.tags.map((tg) => `<span class="device-row-tag">${tg.tag_name}${tg.unit ? ' (' + tg.unit + ')' : ''}</span>`).join('');
    const metaParts = [];
    if (dev.lat != null && dev.lng != null) metaParts.push(`📍 ${dev.lat}, ${dev.lng}`);
    if (dev.temp_min != null || dev.temp_max != null) {
      metaParts.push(`🌡️ ${dev.temp_min != null ? dev.temp_min : '—'}° / ${dev.temp_max != null ? dev.temp_max : '—'}°`);
    }

    return `
      <div class="device-row">
        <div class="device-row-main">
          <div class="device-row-id">${dev.device_id}</div>
          ${dev.description ? `<div class="device-row-desc">${dev.description}</div>` : ''}
          ${tagsHtml ? `<div class="device-row-tags" style="margin-top:6px;">${tagsHtml}</div>` : ''}
        </div>
        <div class="device-row-meta">${metaParts.join(' &nbsp;·&nbsp; ')}</div>
        <button class="btn btn-danger btn-sm" onclick="deleteDevice('${dev.device_id}')" data-i18n="delete_btn">${t('delete_btn')}</button>
      </div>
    `;
  }).join('');
}

function onLanguageChange() {
  loadDevices();
}

$('add-tag-btn').addEventListener('click', () => addTagRow());
$('save-device-btn').addEventListener('click', saveDevice);

loadDevices();

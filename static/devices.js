const $ = (id) => document.getElementById(id);

let tagRowCount = 0;
let editingDeviceId = null; // null = وضع إضافة، غير ذلك = وضع تعديل

function renderTagsHeader() {
  $('tags-list-header').innerHTML = `
    <span style="flex:2;">${t('tag_name_placeholder')}</span>
    <span style="flex:1;">${t('tag_unit_placeholder')}</span>
    <span style="flex:1;">${t('tag_min_placeholder')}</span>
    <span style="flex:1;">${t('tag_max_placeholder')}</span>
    <span style="width:32px;"></span>
  `;
}

function addTagRow(name = '', unit = '', minVal = '', maxVal = '') {
  const list = $('tags-list');
  const rowId = `tag-row-${tagRowCount++}`;
  const row = document.createElement('div');
  row.className = 'tag-row';
  row.id = rowId;
  row.innerHTML = `
    <input type="text" class="tag-name" placeholder="${t('tag_name_placeholder')}" value="${name}">
    <input type="text" class="tag-unit" placeholder="${t('tag_unit_placeholder')}" value="${unit}">
    <input type="number" step="any" class="tag-min" placeholder="${t('tag_min_placeholder')}" value="${minVal}">
    <input type="number" step="any" class="tag-max" placeholder="${t('tag_max_placeholder')}" value="${maxVal}">
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
    const min_val = row.querySelector('.tag-min').value;
    const max_val = row.querySelector('.tag-max').value;
    if (name) tags.push({ tag_name: name, unit, min_val, max_val });
  });
  return tags;
}

function showFormMessage(el, message) {
  $('form-error').style.display = 'none';
  $('form-success').style.display = 'none';
  el.textContent = message;
  el.style.display = 'block';
}

function clearForm() {
  ['f-device-id', 'f-description', 'f-lat', 'f-lng'].forEach((id) => { $(id).value = ''; });
  $('tags-list').innerHTML = '';
}

function enterAddMode() {
  editingDeviceId = null;
  clearForm();
  $('f-device-id').disabled = false;
  $('form-title').textContent = t('add_device_title');
  $('save-device-btn').textContent = t('save_device_btn');
  $('cancel-edit-btn').style.display = 'none';
  $('form-error').style.display = 'none';
  $('form-success').style.display = 'none';
}

async function enterEditMode(deviceId) {
  const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}`);
  if (!res.ok) return;
  const dev = await res.json();

  editingDeviceId = deviceId;
  $('f-device-id').value = dev.device_id;
  $('f-device-id').disabled = true; // device_id ثابت أثناء التعديل
  $('f-description').value = dev.description || '';
  $('f-lat').value = dev.lat != null ? dev.lat : '';
  $('f-lng').value = dev.lng != null ? dev.lng : '';

  $('tags-list').innerHTML = '';
  (dev.tags || []).forEach((tg) => addTagRow(
    tg.tag_name, tg.unit || '',
    tg.min_val != null ? tg.min_val : '',
    tg.max_val != null ? tg.max_val : ''
  ));

  $('form-title').textContent = t('edit_device_title');
  $('save-device-btn').textContent = t('save_device_btn');
  $('cancel-edit-btn').style.display = 'inline-block';
  $('form-error').style.display = 'none';
  $('form-success').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    tags: collectTags(),
  };

  try {
    const url = editingDeviceId ? `/api/devices/${encodeURIComponent(editingDeviceId)}` : '/api/devices';
    const method = editingDeviceId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showFormMessage($('form-error'), data.error === 'هذا الجهاز موجود بالفعل' ? t('device_exists_error') : (data.error || 'Error'));
      return;
    }

    showFormMessage($('form-success'), editingDeviceId ? t('device_updated_success') : t('device_added_success'));
    enterAddMode();
    loadDevices();
  } catch (e) {
    showFormMessage($('form-error'), String(e));
  }
}

async function deleteDevice(deviceId) {
  if (!confirm(t('confirm_delete'))) return;
  await fetch(`/api/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  if (editingDeviceId === deviceId) enterAddMode();
  loadDevices();
}

function formatMinMax(tg) {
  if (tg.min_val == null && tg.max_val == null) return '';
  const min = tg.min_val != null ? tg.min_val : '—';
  const max = tg.max_val != null ? tg.max_val : '—';
  return ` [${min} / ${max}]`;
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
    const tagsHtml = dev.tags.map((tg) =>
      `<span class="device-row-tag">${tg.tag_name}${tg.unit ? ' (' + tg.unit + ')' : ''}${formatMinMax(tg)}</span>`
    ).join('');
    const metaParts = [];
    if (dev.lat != null && dev.lng != null) metaParts.push(`📍 ${dev.lat}, ${dev.lng}`);

    return `
      <div class="device-row">
        <div class="device-row-main">
          <div class="device-row-id">${dev.device_id}</div>
          ${dev.description ? `<div class="device-row-desc">${dev.description}</div>` : ''}
          ${tagsHtml ? `<div class="device-row-tags" style="margin-top:6px;">${tagsHtml}</div>` : ''}
        </div>
        <div class="device-row-meta">${metaParts.join(' &nbsp;·&nbsp; ')}</div>
        <button class="btn btn-ghost btn-sm" onclick="enterEditMode('${dev.device_id}')">${t('edit_btn')}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDevice('${dev.device_id}')">${t('delete_btn')}</button>
      </div>
    `;
  }).join('');
}

function onLanguageChange() {
  renderTagsHeader();
  loadDevices();
  $('form-title').textContent = editingDeviceId ? t('edit_device_title') : t('add_device_title');
}

$('add-tag-btn').addEventListener('click', () => addTagRow());
$('save-device-btn').addEventListener('click', saveDevice);
$('cancel-edit-btn').addEventListener('click', enterAddMode);

renderTagsHeader();
loadDevices();

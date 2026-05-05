(function () {
  'use strict';

  const APP_KEY = 'gc_field_location_app_v53';
  const PHOTO_DB = 'amin_ventures_photo_db_v53';
  const PHOTO_STORE = 'photos';

  function byId(id) {
    return document.getElementById(id);
  }

  function notify(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.log(message);
  }

  function safeState() {
    try {
      return JSON.parse(localStorage.getItem(APP_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function allChecklistItems() {
    if (!Array.isArray(window.STAGES)) return [];
    const state = safeState();
    return window.STAGES.flatMap(stage =>
      stage.sections.flatMap((section, sectionIndex) =>
        section.items.map((item, itemIndex) => {
          const id = `${stage.id}_${sectionIndex}_${itemIndex}`;
          const check = (state.checks && state.checks[id]) || {};
          return {
            id,
            stageId: stage.id,
            stage: stage.name,
            section: section.title,
            item: item[0],
            help: item[1],
            critical: Boolean(item[2]),
            status: check.status || '',
            priority: check.priority || '',
            trade: check.trade || '',
            note: check.note || '',
            photos: check.photos || [],
            location: check.location || '',
            locationType: check.locationType || ''
          };
        })
      )
    );
  }

  function stats() {
    const items = allChecklistItems();
    const entered = items.filter(item => item.status || item.note || item.photos.length);
    const pass = items.filter(item => item.status === 'pass').length;
    const fail = items.filter(item => item.status === 'fail').length;
    const high = items.filter(item => item.priority === 'High' || (item.critical && item.status === 'fail')).length;
    const photos = items.reduce((sum, item) => sum + item.photos.length, 0);
    return { items, entered, pass, fail, high, photos };
  }

  function openPhotoDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(PHOTO_DB, 1);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readAllPhotos() {
    const db = await openPhotoDB();
    if (!db) return {};
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const store = tx.objectStore(PHOTO_STORE);
      const photos = {};
      const cursor = store.openCursor();
      cursor.onsuccess = event => {
        const result = event.target.result;
        if (!result) return;
        photos[result.key] = result.value;
        result.continue();
      };
      tx.oncomplete = () => {
        db.close();
        resolve(photos);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function writeAllPhotos(photos) {
    const db = await openPhotoDB();
    if (!db || !photos) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      const store = tx.objectStore(PHOTO_STORE);
      Object.entries(photos).forEach(([key, value]) => store.put(value, key));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function backupData() {
    const payload = {
      app: 'Amin Ventures Field Checklist',
      version: 2,
      exportedAt: new Date().toISOString(),
      state: safeState(),
      photos: await readAllPhotos()
    };
    const project = (payload.state.session && payload.state.session.project || 'field-checklist')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `${project || 'field-checklist'}-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    notify('Backup downloaded');
  }

  async function restoreData(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || !payload.state) throw new Error('Backup is missing app state');
      localStorage.setItem(APP_KEY, JSON.stringify(payload.state));
      await writeAllPhotos(payload.photos);
      notify('Backup restored');
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      console.error(err);
      notify('Restore failed');
    }
  }

  function csvEscape(value) {
    const text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCSV() {
    const rows = allChecklistItems()
      .filter(item => item.status || item.note || item.photos.length)
      .map(item => ({
        Stage: item.stage,
        Section: item.section,
        Item: item.item,
        Status: item.status,
        Priority: item.priority,
        Trade: item.trade,
        LocationType: item.locationType,
        Location: item.location,
        Photos: item.photos.length,
        Critical: item.critical ? 'Yes' : 'No',
        Notes: item.note
      }));
    const headers = Object.keys(rows[0] || {
      Stage: '', Section: '', Item: '', Status: '', Priority: '', Trade: '',
      LocationType: '', Location: '', Photos: '', Critical: '', Notes: ''
    });
    const csv = [headers.join(',')]
      .concat(rows.map(row => headers.map(header => csvEscape(row[header])).join(',')))
      .join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `Amin_Field_Checklist_${new Date().toISOString().slice(0, 10)}.csv`);
    notify('CSV downloaded');
  }

  function openItem(item) {
    window.state.stage = item.stageId;
    if (typeof window.persist === 'function') window.persist();
    if (typeof window.render === 'function') window.render();
    setTimeout(() => {
      const el = byId(item.id);
      if (el) el.scrollIntoView({ block: 'center' });
    }, 80);
  }

  function showSearch(filter) {
    const items = allChecklistItems();
    const matches = items.filter(item => {
      if (filter === 'fail') return item.status === 'fail';
      if (filter === 'open') return !item.status;
      if (filter === 'high') return item.priority === 'High' || (item.critical && item.status === 'fail');
      return item.status || item.note || item.photos.length;
    }).slice(0, 80);
    const box = byId('avResults');
    if (box) box.innerHTML = buildResultsHtml(matches, filter);
    else renderTools(matches, filter);
  }

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    const matches = allChecklistItems().filter(item =>
      [item.stage, item.section, item.item, item.help, item.note, item.trade, item.location]
        .join(' ')
        .toLowerCase()
        .includes(q)
    ).slice(0, 80);
    const label = q ? `search: ${query}` : 'all';
    const box = byId('avResults');
    if (box) box.innerHTML = buildResultsHtml(matches, label);
    else renderTools(matches, label);
  }

  async function storageSummary() {
    if (!navigator.storage || !navigator.storage.estimate) return 'Storage estimate unavailable.';
    const estimate = await navigator.storage.estimate();
    const used = Math.round((estimate.usage || 0) / 1024 / 1024);
    const quota = Math.round((estimate.quota || 0) / 1024 / 1024);
    return `${used} MB used of about ${quota} MB available on this device.`;
  }

  async function showStorage() {
    const summary = await storageSummary();
    notify(summary);
  }

  function buildResultsHtml(results, label) {
    return results ? `
      <div class="av-search-list">
        <p class="small"><b>${results.length}</b> matching item(s) for ${esc(label)}.</p>
        ${results.map((item, index) => `
          <div class="av-result">
            <strong>${index + 1}. ${esc(item.item)}</strong>
            <span>${esc(item.stage)} / ${esc(item.section)} / ${esc(item.status || 'Open')}${item.location ? ` / ${esc(item.location)}` : ''}</span>
            <button class="btn light" onclick="AVUpgrades.openResult('${esc(item.id)}')">Open</button>
          </div>
        `).join('')}
      </div>
    ` : '';
  }

  function renderTools(results, label) {
    const s = stats();
    const resultHtml = buildResultsHtml(results, label);
    byId('sheet').innerHTML = `
      <h3>Field Tools</h3>
      <div class="av-dashboard">
        <div class="av-metric"><b>Checklist</b><span>${s.entered.length}/${s.items.length}</span></div>
        <div class="av-metric"><b>Passed</b><span>${s.pass}</span></div>
        <div class="av-metric"><b>Failed</b><span>${s.fail}</span></div>
        <div class="av-metric"><b>Photos</b><span>${s.photos}</span></div>
      </div>
      <div class="field">
        <label>Find checklist item, trade, room, or note</label>
        <input id="avSearchInput" placeholder="Search everything" oninput="AVUpgrades.search(this.value)">
      </div>
      <div class="av-tools-grid">
        <button class="av-tool-action primary" onclick="AVUpgrades.backup()">Backup all data</button>
        <button class="av-tool-action" onclick="document.getElementById('avRestoreInput').click()">Restore backup</button>
        <button class="av-tool-action" onclick="AVUpgrades.exportCSV()">Export CSV</button>
        <button class="av-tool-action" onclick="AVUpgrades.showSearch('fail')">Failed items</button>
        <button class="av-tool-action" onclick="AVUpgrades.showSearch('open')">Open items</button>
        <button class="av-tool-action" onclick="AVUpgrades.showSearch('high')">High priority</button>
        <button class="av-tool-action" onclick="AVUpgrades.storage()">Storage status</button>
        <button class="av-tool-action" onclick="installPWA()">Install app</button>
      </div>
      <input class="av-file-input" id="avRestoreInput" type="file" accept="application/json" onchange="AVUpgrades.restore(this.files[0])">
      <div id="avResults">${resultHtml}</div>
      <button class="btn light" style="width:100%;margin-top:12px" onclick="closeModal()">Close</button>
    `;
    byId('modal').classList.remove('hidden');
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setStatusChip(navigator.onLine ? 'Ready offline' : 'Offline', navigator.onLine ? 'ready' : 'offline');
    } catch (err) {
      console.warn('Service worker registration failed', err);
      setStatusChip('Online only', '');
    }
  }

  function setStatusChip(text, mode) {
    const chip = byId('avStatusChip');
    if (!chip) return;
    chip.textContent = text;
    chip.className = `av-status-chip ${mode || ''}`.trim();
  }

  function mount() {
    const requestedStage = location.hash.replace(/^#/, '');
    if (requestedStage && Array.isArray(window.STAGES) && window.STAGES.some(stage => stage.id === requestedStage)) {
      window.state.stage = requestedStage;
      if (typeof window.persist === 'function') window.persist();
      if (typeof window.render === 'function') window.render();
    }
    const host = document.createElement('div');
    host.className = 'av-upgrade-tools';
    host.innerHTML = `
      <div id="avStatusChip" class="av-status-chip">Checking</div>
      <button class="av-tool-button" type="button" onclick="AVUpgrades.open()">Tools</button>
    `;
    document.body.appendChild(host);
    window.addEventListener('online', () => setStatusChip('Ready offline', 'ready'));
    window.addEventListener('offline', () => setStatusChip('Offline', 'offline'));
    registerServiceWorker();
  }

  window.AVUpgrades = {
    open: () => renderTools(),
    backup: backupData,
    restore: restoreData,
    exportCSV,
    showSearch,
    storage: showStorage,
    search: runSearch,
    openResult: id => {
      const item = allChecklistItems().find(row => row.id === id);
      if (item) openItem(item);
      if (typeof window.closeModal === 'function') window.closeModal();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

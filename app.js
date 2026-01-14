const STORAGE_KEY = 'customer-data-storage';
const CLIENTS_KEY = 'saved-clients';
const AUTH_KEY = 'dettofatto-auth';

function checkAuth() {
  return localStorage.getItem(AUTH_KEY) === 'authenticated';
}

function doLogin(username, password) {
  if (username === 'admin' && password === '1212') {
    localStorage.setItem(AUTH_KEY, 'authenticated');
    return true;
  }
  return false;
}

function doLogout() {
  localStorage.removeItem(AUTH_KEY);
  location.reload();
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('app-hidden');
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('app-hidden');
}

let state = {
  company: { name: '', address: '', vatNumber: '', email: '', phone: '' },
  access: { username: '', password: '' },
  activity: { tipologiaAttivita: '', noteAttivita: '' },
  workItems: [],
  quotes: [
    { id: 0, name: '', items: [], totalAmount: 0 },
    { id: 1, name: '', items: [], totalAmount: 0 },
    { id: 2, name: '', items: [], totalAmount: 0 },
    { id: 3, name: '', items: [], totalAmount: 0 }
  ],
  finalNotes: ''
};

let currentQuoteIndex = 0;
let workIdCounter = Date.now();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.state) {
        state = { ...state, ...parsed.state };
      }
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function formatPrice(cents) {
  if (!cents) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function parsePriceToCents(value) {
  if (!value) return 0;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

function generateId() {
  return ++workIdCounter;
}

function renderCompanyForm() {
  document.getElementById('company-name').value = state.company.name || '';
  document.getElementById('company-address').value = state.company.address || '';
  document.getElementById('company-vat').value = state.company.vatNumber || '';
  document.getElementById('company-phone').value = state.company.phone || '';
  document.getElementById('company-email').value = state.company.email || '';
}

function renderAccessForm() {
  document.getElementById('access-username').value = state.access.username || '';
  document.getElementById('access-password').value = state.access.password || '';
}

function renderActivityForm() {
  document.getElementById('activity-type').value = state.activity.tipologiaAttivita || '';
  document.getElementById('activity-notes').value = state.activity.noteAttivita || '';
}

function renderWorkDatabase() {
  const tbody = document.getElementById('work-table-body');
  const cards = document.getElementById('work-cards');
  const empty = document.getElementById('work-empty');

  if (state.workItems.length === 0) {
    tbody.innerHTML = '';
    cards.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = state.workItems.map((item, idx) => `
    <tr data-id="${item.id}">
      <td><input type="text" value="${item.category || ''}" data-field="category" placeholder="Categoria"></td>
      <td><input type="text" value="${item.code || ''}" data-field="code" placeholder="Sottocategoria"></td>
      <td><input type="text" value="${item.name || ''}" data-field="name" placeholder="Descrizione"></td>
      <td><input type="text" value="${item.description || ''}" data-field="description" placeholder="es: ora"></td>
      <td><input type="text" value="${formatPrice(item.unitPrice)}" data-field="unitPrice" placeholder="0,00" class="price-cell"></td>
      <td><button class="btn btn-danger delete-work-btn">&times;</button></td>
    </tr>
  `).join('');

  cards.innerHTML = state.workItems.map((item, idx) => `
    <div class="mobile-card" data-id="${item.id}">
      <button class="btn btn-danger mobile-card-delete delete-work-btn">&times;</button>
      <div class="mobile-card-number">Riga ${idx + 1}</div>
      <div class="form-group">
        <label>Categoria</label>
        <input type="text" value="${item.category || ''}" data-field="category" placeholder="Categoria">
      </div>
      <div class="form-group">
        <label>Sottocategoria</label>
        <input type="text" value="${item.code || ''}" data-field="code" placeholder="Sottocategoria">
      </div>
      <div class="form-group">
        <label>Descrizione</label>
        <input type="text" value="${item.name || ''}" data-field="name" placeholder="Descrizione">
      </div>
      <div class="mobile-card-row">
        <div class="form-group">
          <label>Unità</label>
          <input type="text" value="${item.description || ''}" data-field="description" placeholder="es: ora">
        </div>
        <div class="form-group">
          <label>Prezzo</label>
          <input type="text" value="${formatPrice(item.unitPrice)}" data-field="unitPrice" placeholder="0,00" inputmode="decimal">
        </div>
      </div>
    </div>
  `).join('');
}

function renderQuoteSelect() {
  const select = document.getElementById('quote-add-item');
  const filledItems = state.workItems.filter(w => w.name || w.category || w.code);
  
  select.innerHTML = '<option value="">Seleziona una voce...</option>' +
    filledItems.map(item => 
      `<option value="${item.id}">${item.code || item.category} - ${item.name || 'Senza nome'} (${formatPrice(item.unitPrice)})</option>`
    ).join('');
}

function renderQuotes() {
  const quote = state.quotes[currentQuoteIndex];
  const tbody = document.getElementById('quote-table-body');
  const cards = document.getElementById('quote-cards');
  const empty = document.getElementById('quote-empty');
  
  document.getElementById('quote-name').value = quote.name || '';

  document.querySelectorAll('.tab').forEach((tab, idx) => {
    tab.classList.toggle('active', idx === currentQuoteIndex);
    tab.classList.toggle('has-items', state.quotes[idx].items.length > 0);
  });

  if (!quote.items || quote.items.length === 0) {
    tbody.innerHTML = '';
    cards.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('quote-total-value').textContent = '0,00';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = quote.items.map((item, idx) => `
    <tr data-idx="${idx}">
      <td>${item.name}</td>
      <td>${item.unit || '-'}</td>
      <td class="price-cell">${formatPrice(item.unitPrice)}</td>
      <td><input type="number" class="qty-input" value="${item.quantity}" min="1" data-idx="${idx}"></td>
      <td class="price-cell">${formatPrice(item.total)}</td>
      <td><button class="btn btn-danger delete-quote-item-btn" data-idx="${idx}">&times;</button></td>
    </tr>
  `).join('');

  cards.innerHTML = quote.items.map((item, idx) => `
    <div class="mobile-card">
      <div class="mobile-card-header">
        <div>
          <strong>${item.name}</strong>
          ${item.unit ? `<div style="font-size:0.75rem;color:var(--text-muted)">${item.unit}</div>` : ''}
        </div>
        <button class="btn btn-danger delete-quote-item-btn" data-idx="${idx}">&times;</button>
      </div>
      <div class="mobile-card-row">
        <div>
          <label>Prezzo</label>
          <div style="font-family:monospace">${formatPrice(item.unitPrice)}</div>
        </div>
        <div>
          <label>Quantità</label>
          <input type="number" class="qty-input" value="${item.quantity}" min="1" data-idx="${idx}" inputmode="numeric">
        </div>
        <div>
          <label>Totale</label>
          <div style="font-family:monospace;font-weight:bold;color:var(--primary)">${formatPrice(item.total)}</div>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('quote-total-value').textContent = formatPrice(quote.totalAmount);
}

function renderSummary() {
  document.getElementById('final-notes').value = state.finalNotes || '';
  
  const lines = [];
  
  lines.push('--------------------------------');
  lines.push('DATI_AZIENDA');
  lines.push(`Ragione_sociale: ${state.company.name || ''}`);
  lines.push(`Indirizzo: ${state.company.address || ''}`);
  lines.push(`Partita_IVA_CF: ${state.company.vatNumber || ''}`);
  lines.push(`Telefono: ${state.company.phone || ''}`);
  lines.push(`Email: ${state.company.email || ''}`);
  lines.push('');
  
  lines.push('--------------------------------');
  lines.push('ACCESSO');
  lines.push(`Username: ${state.access.username || ''}`);
  lines.push(`Password: ${state.access.password || ''}`);
  lines.push('');
  
  lines.push('--------------------------------');
  lines.push('ATTIVITA');
  lines.push(`Tipologia_attivita: ${state.activity.tipologiaAttivita || ''}`);
  lines.push(`Note_attivita: ${state.activity.noteAttivita || ''}`);
  lines.push('');
  
  lines.push('--------------------------------');
  lines.push('DATABASE_LAVORAZIONI');
  lines.push('(una riga = una lavorazione)');
  lines.push('');
  lines.push('Categoria | Sottocategoria | Descrizione | Unita | Prezzo');
  lines.push('');
  
  const filledItems = state.workItems.filter(w => w.category || w.code || w.name || w.description || w.unitPrice);
  filledItems.forEach(item => {
    lines.push(`${item.category || ''} | ${item.code || ''} | ${item.name || ''} | ${item.description || ''} | ${formatPrice(item.unitPrice)}`);
  });
  lines.push('');
  
  for (let i = 0; i < 4; i++) {
    lines.push('--------------------------------');
    lines.push(`PREVENTIVO_RAPIDO_${i + 1}`);
    const q = state.quotes[i];
    if (q && q.items && q.items.length > 0) {
      lines.push(`Nome: ${q.name || ''}`);
      lines.push('Descrizione | Unita | Quantita | Prezzo');
      lines.push('');
      q.items.forEach(item => {
        lines.push(`${item.name} | ${item.unit || ''} | ${item.quantity} | ${formatPrice(item.total)}`);
      });
      lines.push('');
      lines.push(`TOTALE: ${formatPrice(q.totalAmount)}`);
    } else {
      lines.push('Nome:');
      lines.push('Descrizione | Unita | Quantita | Prezzo');
      lines.push('');
    }
    lines.push('');
  }
  
  lines.push('--------------------------------');
  lines.push('NOTE_FINALI');
  lines.push(`Note: ${state.finalNotes || ''}`);
  lines.push('');
  lines.push('--------------------------------');
  
  document.getElementById('output-text').value = lines.join('\n');
}

function renderAll() {
  renderCompanyForm();
  renderAccessForm();
  renderActivityForm();
  renderWorkDatabase();
  renderQuoteSelect();
  renderQuotes();
  renderSummary();
}

function switchSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + sectionId).classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === sectionId);
  });

  document.getElementById('sidebar').classList.remove('open');
  
  if (sectionId === 'quotes') {
    renderQuoteSelect();
    renderQuotes();
  }
  if (sectionId === 'summary') {
    renderSummary();
  }
}

function getSavedClients() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveClientToArchive() {
  const clientName = state.company.name || 'Cliente';
  const timestamp = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  const savedClient = {
    id: String(Date.now()),
    name: `${clientName} - ${timestamp}`,
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state))
  };
  
  const clients = getSavedClients();
  clients.push(savedClient);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  
  alert('Cliente salvato: ' + savedClient.name);
}

function loadClient(id) {
  const clients = getSavedClients();
  const client = clients.find(c => c.id === id);
  if (client && client.data) {
    state = { ...state, ...client.data };
    saveState();
    renderAll();
    document.getElementById('modal-overlay').classList.add('hidden');
    alert('Cliente caricato');
  }
}

function deleteClient(id) {
  if (!confirm('Eliminare questo cliente?')) return;
  const clients = getSavedClients().filter(c => c.id !== id);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  renderSavedClientsModal();
}

function renderSavedClientsModal() {
  const list = document.getElementById('saved-clients-list');
  const clients = getSavedClients();
  
  if (clients.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Nessun cliente salvato</p>';
    return;
  }
  
  list.innerHTML = clients.map(c => `
    <div class="saved-client-item">
      <div onclick="loadClient('${c.id}')" style="flex:1">
        <div class="saved-client-name">${c.data?.company?.name || 'Cliente'}</div>
        <div class="saved-client-date">${new Date(c.savedAt).toLocaleString('it-IT')}</div>
      </div>
      <button class="btn btn-danger" onclick="event.stopPropagation();deleteClient('${c.id}')">&times;</button>
    </div>
  `).join('');
}

function resetState() {
  state = {
    company: { name: '', address: '', vatNumber: '', email: '', phone: '' },
    access: { username: '', password: '' },
    activity: { tipologiaAttivita: '', noteAttivita: '' },
    workItems: [],
    quotes: [
      { id: 0, name: '', items: [], totalAmount: 0 },
      { id: 1, name: '', items: [], totalAmount: 0 },
      { id: 2, name: '', items: [], totalAmount: 0 },
      { id: 3, name: '', items: [], totalAmount: 0 }
    ],
    finalNotes: ''
  };
  currentQuoteIndex = 0;
  saveState();
  renderAll();
}

document.addEventListener('DOMContentLoaded', function() {
  if (checkAuth()) {
    showApp();
    loadState();
    renderAll();
  } else {
    showLogin();
  }

  document.getElementById('btn-login').addEventListener('click', function() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (doLogin(username, password)) {
      errorEl.textContent = '';
      showApp();
      loadState();
      renderAll();
    } else {
      errorEl.textContent = 'Credenziali non valide';
    }
  });

  document.getElementById('login-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('btn-login').click();
    }
  });

  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-logout-mobile').addEventListener('click', doLogout);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('btn-new-client').addEventListener('click', () => {
    if (confirm('Creare un nuovo cliente? I dati non salvati andranno persi.')) {
      resetState();
    }
  });

  document.getElementById('btn-save-client').addEventListener('click', saveClientToArchive);

  document.getElementById('btn-load-clients').addEventListener('click', () => {
    renderSavedClientsModal();
    document.getElementById('modal-overlay').classList.remove('hidden');
  });

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  });

  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      document.getElementById('modal-overlay').classList.add('hidden');
    }
  });

  ['company-name', 'company-address', 'company-vat', 'company-phone', 'company-email'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const field = id.replace('company-', '');
      const fieldMap = { name: 'name', address: 'address', vat: 'vatNumber', phone: 'phone', email: 'email' };
      state.company[fieldMap[field]] = el.value;
      saveState();
    });
  });

  document.getElementById('btn-clear-company').addEventListener('click', () => {
    state.company = { name: '', address: '', vatNumber: '', email: '', phone: '' };
    saveState();
    renderCompanyForm();
  });

  ['access-username', 'access-password'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const field = id.replace('access-', '');
      state.access[field] = el.value;
      saveState();
    });
  });

  document.getElementById('btn-clear-access').addEventListener('click', () => {
    state.access = { username: '', password: '' };
    saveState();
    renderAccessForm();
  });

  document.getElementById('activity-type').addEventListener('input', (e) => {
    state.activity.tipologiaAttivita = e.target.value;
    saveState();
  });

  document.getElementById('activity-notes').addEventListener('input', (e) => {
    state.activity.noteAttivita = e.target.value;
    saveState();
  });

  document.getElementById('btn-clear-activity').addEventListener('click', () => {
    state.activity = { tipologiaAttivita: '', noteAttivita: '' };
    saveState();
    renderActivityForm();
  });

  document.getElementById('btn-add-work').addEventListener('click', () => {
    state.workItems.push({
      id: generateId(),
      category: '',
      code: '',
      name: '',
      description: '',
      unitPrice: 0
    });
    saveState();
    renderWorkDatabase();
  });

  document.getElementById('btn-clear-workdb').addEventListener('click', () => {
    if (confirm('Svuotare tutte le lavorazioni?')) {
      state.workItems = [];
      saveState();
      renderWorkDatabase();
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    const row = target.closest('[data-id]');
    if (!row) return;
    
    const id = parseInt(row.dataset.id);
    const field = target.dataset.field;
    if (!field) return;
    
    const item = state.workItems.find(w => w.id === id);
    if (!item) return;
    
    if (field === 'unitPrice') {
      return;
    }
    
    item[field] = target.value;
    saveState();
  });

  document.addEventListener('blur', (e) => {
    const target = e.target;
    if (target.dataset.field !== 'unitPrice') return;
    
    const row = target.closest('[data-id]');
    if (!row) return;
    
    const id = parseInt(row.dataset.id);
    const item = state.workItems.find(w => w.id === id);
    if (!item) return;
    
    item.unitPrice = parsePriceToCents(target.value);
    target.value = formatPrice(item.unitPrice);
    saveState();
  }, true);

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-work-btn')) {
      const row = e.target.closest('[data-id]');
      if (row) {
        const id = parseInt(row.dataset.id);
        state.workItems = state.workItems.filter(w => w.id !== id);
        saveState();
        renderWorkDatabase();
      }
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentQuoteIndex = parseInt(tab.dataset.quote);
      renderQuotes();
    });
  });

  document.getElementById('quote-name').addEventListener('input', (e) => {
    state.quotes[currentQuoteIndex].name = e.target.value;
    saveState();
  });

  document.getElementById('quote-add-item').addEventListener('change', (e) => {
    const workId = parseInt(e.target.value);
    if (!workId) return;
    
    const workItem = state.workItems.find(w => w.id === workId);
    if (!workItem) return;
    
    const quote = state.quotes[currentQuoteIndex];
    quote.items.push({
      workItemId: workItem.id,
      name: workItem.name || `${workItem.category} - ${workItem.code}`,
      unit: workItem.description || '',
      quantity: 1,
      unitPrice: workItem.unitPrice || 0,
      total: workItem.unitPrice || 0
    });
    quote.totalAmount = quote.items.reduce((sum, i) => sum + i.total, 0);
    
    saveState();
    renderQuotes();
    e.target.value = '';
  });

  document.getElementById('btn-clear-quote').addEventListener('click', () => {
    state.quotes[currentQuoteIndex] = { id: currentQuoteIndex, name: '', items: [], totalAmount: 0 };
    saveState();
    renderQuotes();
  });

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('qty-input')) {
      const idx = parseInt(e.target.dataset.idx);
      const quote = state.quotes[currentQuoteIndex];
      const item = quote.items[idx];
      if (!item) return;
      
      item.quantity = parseInt(e.target.value) || 1;
      item.total = item.unitPrice * item.quantity;
      quote.totalAmount = quote.items.reduce((sum, i) => sum + i.total, 0);
      saveState();
      renderQuotes();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-quote-item-btn')) {
      const idx = parseInt(e.target.dataset.idx);
      const quote = state.quotes[currentQuoteIndex];
      quote.items.splice(idx, 1);
      quote.totalAmount = quote.items.reduce((sum, i) => sum + i.total, 0);
      saveState();
      renderQuotes();
    }
  });

  document.getElementById('final-notes').addEventListener('input', (e) => {
    state.finalNotes = e.target.value;
    saveState();
    renderSummary();
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    const text = document.getElementById('output-text').value;
    navigator.clipboard.writeText(text).then(() => {
      alert('Copiato negli appunti!');
    }).catch(() => {
      document.getElementById('output-text').select();
      document.execCommand('copy');
      alert('Copiato!');
    });
  });
});

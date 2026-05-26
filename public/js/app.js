import { api } from './api.js';
import { getState, setState, onState } from './store.js';
import { connectWS, disconnectWS } from './ws.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (id) => $(id)?.classList.remove('hidden');
const hide = (id) => $(id)?.classList.add('hidden');
const chip = (val, extra = '') => `<span class="chip chip-${val} ${extra}">${val}</span>`;

function toast(msg, isErr = false) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, { position:'fixed', bottom:'1rem', right:'1rem', padding:'10px 16px',
    background: isErr ? '#e74c3c' : '#27ae60', color:'#fff', borderRadius:'6px',
    fontSize:'13px', zIndex:'9999', boxShadow:'0 4px 12px rgba(0,0,0,.2)' });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  $('login-error').classList.add('hidden');
  try {
    const { access_token, role } = await api.login($('username').value, $('password').value);
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    startDashboard(role);
  } catch (err) {
    const el = $('login-error'); el.textContent = err.message; el.classList.remove('hidden');
  } finally { btn.disabled = false; btn.textContent = 'Sign in'; }
});

$('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  disconnectWS();
  hide('page-dashboard'); show('page-login');
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function startDashboard(role) {
  hide('page-login'); show('page-dashboard');
  $('user-badge').textContent = role;
  connectWS();
  await loadAll();
  renderAll();
}

async function loadAll() {
  const [wo, op, mc, mat, alloc] = await Promise.all([
    api.getWorkOrders(), api.getOperators(), api.getMachines(),
    api.getMaterials(), api.getAllocations(),
  ]);
  setState({
    workOrders:  wo.items,  operators: op.items,
    machines:    mc.items,  materials: mat.items,
    allocations: alloc.items,
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    show(`tab-${btn.dataset.tab}`);
  });
});

// ── Idle Alerts ───────────────────────────────────────────────────────────────
onState(({ idleAlerts }) => {
  if (!idleAlerts) return;
  const banner = $('idle-banner');
  if (!idleAlerts.length) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');
  banner.innerHTML = idleAlerts.map(a => `
    <div class="idle-alert-row">
      <span>⚠️ <strong>${a.resource_type}</strong> idle since ${new Date(a.idle_since).toLocaleTimeString()}</span>
      <button class="btn-warn" onclick="dismissAlert('${a.resource_id}')">Dismiss</button>
    </div>`).join('');
});

window.dismissAlert = (id) => {
  setState({ idleAlerts: getState().idleAlerts.filter(a => a.resource_id !== id) });
};

// ── Render helpers ────────────────────────────────────────────────────────────
function renderAll() {
  renderWorkOrders(); renderOperators(); renderMachines();
  renderMaterials(); renderAllocations(); populateAllocSelects();
}
onState(() => renderAll());

// ── WORK ORDERS ───────────────────────────────────────────────────────────────
$('wo-add-btn').addEventListener('click', () => show('wo-form-wrap'));
$('wo-cancel-btn').addEventListener('click', () => { hide('wo-form-wrap'); $('wo-form').reset(); });
$('wo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api.createWorkOrder(Object.fromEntries(fd));
    await loadAll(); toast('Work order created');
    $('wo-form').reset(); hide('wo-form-wrap');
  } catch (err) { toast(err.message, true); }
});

function renderWorkOrders() {
  const el = $('wo-table');
  const items = getState().workOrders;
  if (!items.length) { el.innerHTML = '<p style="padding:1rem;color:#999">No work orders yet.</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Product</th><th>Qty</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr></thead>
    <tbody>${items.map(w => `<tr>
      <td>${w.product}</td><td>${w.quantity}</td><td>${w.priority}</td>
      <td>${chip(w.status)}</td>
      <td>${w.created_at?.slice(0,16) ?? ''}</td>
      <td><button class="btn-danger" onclick="deleteWO('${w.id}')">Delete</button></td>
    </tr>`).join('')}</tbody></table>`;
}
window.deleteWO = async (id) => {
  if (!confirm('Delete this work order?')) return;
  try { await api.deleteWorkOrder(id); await loadAll(); toast('Deleted'); }
  catch (err) { toast(err.message, true); }
};

// ── OPERATORS ────────────────────────────────────────────────────────────────
$('op-add-btn').addEventListener('click', () => show('op-form-wrap'));
$('op-cancel-btn').addEventListener('click', () => { hide('op-form-wrap'); $('op-form').reset(); });
$('op-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const d = Object.fromEntries(fd);
  d.skill_set = d.skill_set ? d.skill_set.split(',').map(s => s.trim()).filter(Boolean) : [];
  try { await api.createOperator(d); await loadAll(); toast('Operator added'); $('op-form').reset(); hide('op-form-wrap'); }
  catch (err) { toast(err.message, true); }
});

function renderOperators() {
  const el = $('op-table');
  const items = getState().operators;
  if (!items.length) { el.innerHTML = '<p style="padding:1rem;color:#999">No operators yet.</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Name</th><th>Shift</th><th>Skills</th><th></th></tr></thead>
    <tbody>${items.map(o => `<tr>
      <td>${o.name}</td><td>${o.shift}</td>
      <td>${(Array.isArray(o.skill_set) ? o.skill_set : []).join(', ') || '—'}</td>
      <td><button class="btn-danger" onclick="deleteOp('${o.id}')">Delete</button></td>
    </tr>`).join('')}</tbody></table>`;
}
window.deleteOp = async (id) => {
  if (!confirm('Delete this operator?')) return;
  try { await api.deleteOperator(id); await loadAll(); toast('Deleted'); }
  catch (err) { toast(err.message, true); }
};

// ── MACHINES ──────────────────────────────────────────────────────────────────
$('mc-add-btn').addEventListener('click', () => show('mc-form-wrap'));
$('mc-cancel-btn').addEventListener('click', () => { hide('mc-form-wrap'); $('mc-form').reset(); });
$('mc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await api.createMachine(Object.fromEntries(new FormData(e.target))); await loadAll(); toast('Machine added'); $('mc-form').reset(); hide('mc-form-wrap'); }
  catch (err) { toast(err.message, true); }
});

function renderMachines() {
  const el = $('mc-table');
  const items = getState().machines;
  if (!items.length) { el.innerHTML = '<p style="padding:1rem;color:#999">No machines yet.</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th><th>Idle Threshold</th><th></th></tr></thead>
    <tbody>${items.map(m => `<tr>
      <td>${m.name}</td><td>${m.type}</td><td>${m.capacity}</td>
      <td>${chip(m.status)}</td><td>${m.idle_threshold_minutes} min</td>
      <td>
        ${m.status === 'running' ? `<button class="btn-warn" onclick="setIdle('${m.id}')">Set Idle</button>` : ''}
        <button class="btn-danger" onclick="deleteMC('${m.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
}
window.setIdle = async (id) => {
  try { await api.updateMachine(id, { status: 'idle' }); await loadAll(); toast('Machine set to idle'); }
  catch (err) { toast(err.message, true); }
};
window.deleteMC = async (id) => {
  if (!confirm('Delete this machine?')) return;
  try { await api.deleteMachine(id); await loadAll(); toast('Deleted'); }
  catch (err) { toast(err.message, true); }
};

// ── MATERIALS ─────────────────────────────────────────────────────────────────
$('mat-add-btn').addEventListener('click', () => show('mat-form-wrap'));
$('mat-cancel-btn').addEventListener('click', () => { hide('mat-form-wrap'); $('mat-form').reset(); });
$('mat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await api.createMaterial(Object.fromEntries(new FormData(e.target))); await loadAll(); toast('Material added'); $('mat-form').reset(); hide('mat-form-wrap'); }
  catch (err) { toast(err.message, true); }
});

function renderMaterials() {
  const el = $('mat-table');
  const items = getState().materials;
  if (!items.length) { el.innerHTML = '<p style="padding:1rem;color:#999">No materials yet.</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Name</th><th>Unit</th><th>On Hand</th><th>Reserved</th><th>Available</th><th></th></tr></thead>
    <tbody>${items.map(m => `<tr>
      <td>${m.name}</td><td>${m.unit}</td>
      <td>${m.qty_on_hand}</td><td>${m.qty_reserved}</td>
      <td>${(m.qty_on_hand - m.qty_reserved).toFixed(2)}</td>
      <td><button class="btn-danger" onclick="deleteMat('${m.id}')">Delete</button></td>
    </tr>`).join('')}</tbody></table>`;
}
window.deleteMat = async (id) => {
  if (!confirm('Delete this material?')) return;
  try { await api.deleteMaterial(id); await loadAll(); toast('Deleted'); }
  catch (err) { toast(err.message, true); }
};

// ── ALLOCATIONS ───────────────────────────────────────────────────────────────
$('alloc-add-btn').addEventListener('click', () => { populateAllocSelects(); show('alloc-form-wrap'); });
$('alloc-cancel-btn').addEventListener('click', () => { hide('alloc-form-wrap'); $('alloc-form').reset(); });
$('alloc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  ['machine_id','operator_id','material_id'].forEach(k => { if (!fd[k]) delete fd[k]; });
  if (fd.quantity_used) fd.quantity_used = parseFloat(fd.quantity_used);
  else delete fd.quantity_used;
  try { await api.createAllocation(fd); await loadAll(); toast('Allocated'); $('alloc-form').reset(); hide('alloc-form-wrap'); }
  catch (err) { toast(err.message, true); }
});

function populateAllocSelects() {
  const { workOrders, machines, operators, materials } = getState();
  const woSel = $('alloc-wo-select');
  woSel.innerHTML = '<option value="">— select —</option>' + workOrders.filter(w => w.status !== 'complete').map(w => `<option value="${w.id}">${w.product} (${w.status})</option>`).join('');
  const mcSel = $('alloc-mc-select');
  mcSel.innerHTML = '<option value="">— none —</option>' + machines.filter(m => m.status === 'idle').map(m => `<option value="${m.id}">${m.name} [idle]</option>`).join('');
  const opSel = $('alloc-op-select');
  opSel.innerHTML = '<option value="">— none —</option>' + operators.map(o => `<option value="${o.id}">${o.name} (${o.shift})</option>`).join('');
  const matSel = $('alloc-mat-select');
  matSel.innerHTML = '<option value="">— none —</option>' + materials.map(m => `<option value="${m.id}">${m.name} (avail: ${(m.qty_on_hand - m.qty_reserved).toFixed(2)} ${m.unit})</option>`).join('');
}

function renderAllocations() {
  const el = $('alloc-table');
  const { allocations, workOrders, machines, operators, materials } = getState();
  const woMap = Object.fromEntries(workOrders.map(w => [w.id, w.product]));
  const mcMap = Object.fromEntries(machines.map(m => [m.id, m.name]));
  const opMap = Object.fromEntries(operators.map(o => [o.id, o.name]));
  const matMap = Object.fromEntries(materials.map(m => [m.id, m.name]));
  const active = allocations.filter(a => !a.deallocated_at);
  if (!active.length) { el.innerHTML = '<p style="padding:1rem;color:#999">No active allocations.</p>'; return; }
  el.innerHTML = `<table class="data-table">
    <thead><tr><th>Work Order</th><th>Machine</th><th>Operator</th><th>Material</th><th>Qty</th><th>Since</th><th></th></tr></thead>
    <tbody>${active.map(a => `<tr>
      <td>${woMap[a.work_order_id] ?? a.work_order_id.slice(0,8)}</td>
      <td>${a.machine_id  ? mcMap[a.machine_id]  ?? '—' : '—'}</td>
      <td>${a.operator_id ? opMap[a.operator_id] ?? '—' : '—'}</td>
      <td>${a.material_id ? matMap[a.material_id] ?? '—' : '—'}</td>
      <td>${a.quantity_used ?? '—'}</td>
      <td>${a.allocated_at?.slice(0,16) ?? ''}</td>
      <td><button class="btn-danger" onclick="deallocate('${a.id}')">Deallocate</button></td>
    </tr>`).join('')}</tbody></table>`;
}
window.deallocate = async (id) => {
  if (!confirm('Deallocate this resource?')) return;
  try { await api.deallocate(id); await loadAll(); toast('Deallocated'); }
  catch (err) { toast(err.message, true); }
};

// ── Auto-login if token exists ────────────────────────────────────────────────
(async () => {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');
  if (token && role) {
    try { await startDashboard(role); }
    catch { localStorage.clear(); }
  }
})();

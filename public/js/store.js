// Minimal reactive store using custom events
const state = {
  workOrders: [], operators: [], machines: [], materials: [], allocations: [],
  idleAlerts: [],
};

export function getState() { return state; }

export function setState(patch) {
  Object.assign(state, patch);
  window.dispatchEvent(new CustomEvent('statechange', { detail: patch }));
}

export function onState(fn) {
  window.addEventListener('statechange', (e) => fn(e.detail));
}

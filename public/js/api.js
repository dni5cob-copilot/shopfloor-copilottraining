const BASE = '';

async function request(method, path, body) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login: (username, password) => request('POST', '/api/v1/auth/token', { username, password }),
  // Work orders
  getWorkOrders: (p = 1) => request('GET', `/api/v1/work-orders?page=${p}&page_size=50`),
  createWorkOrder: (d) => request('POST', '/api/v1/work-orders', d),
  updateWorkOrder: (id, d) => request('PATCH', `/api/v1/work-orders/${id}`, d),
  deleteWorkOrder: (id) => request('DELETE', `/api/v1/work-orders/${id}`),
  // Operators
  getOperators: (p = 1) => request('GET', `/api/v1/operators?page=${p}&page_size=100`),
  createOperator: (d) => request('POST', '/api/v1/operators', d),
  deleteOperator: (id) => request('DELETE', `/api/v1/operators/${id}`),
  // Machines
  getMachines: (p = 1) => request('GET', `/api/v1/machines?page=${p}&page_size=100`),
  createMachine: (d) => request('POST', '/api/v1/machines', d),
  updateMachine: (id, d) => request('PATCH', `/api/v1/machines/${id}`, d),
  deleteMachine: (id) => request('DELETE', `/api/v1/machines/${id}`),
  // Materials
  getMaterials: (p = 1) => request('GET', `/api/v1/materials?page=${p}&page_size=100`),
  createMaterial: (d) => request('POST', '/api/v1/materials', d),
  deleteMaterial: (id) => request('DELETE', `/api/v1/materials/${id}`),
  // Allocations
  getAllocations: (p = 1) => request('GET', `/api/v1/allocations?page=${p}&page_size=50`),
  createAllocation: (d) => request('POST', '/api/v1/allocations', d),
  deallocate: (id) => request('DELETE', `/api/v1/allocations/${id}/deallocate`),
};

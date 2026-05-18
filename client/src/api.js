const BASE = '/api';

function getToken() {
  return localStorage.getItem('relive_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res;
}

async function json(path, options = {}) {
  const res = await request(path, options);
  return res.json();
}

export const auth = {
  login: (password) => json('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => { localStorage.removeItem('relive_token'); },
};

export const clients = {
  list: (q) => json(`/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get: (id) => json(`/clients/${id}`),
  create: (data) => json('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => json(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => json(`/clients/${id}`, { method: 'DELETE' }),
  addVehicle: (id, data) => json(`/clients/${id}/vehicles`, { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id, vid, data) => json(`/clients/${id}/vehicles/${vid}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeVehicle: (id, vid) => json(`/clients/${id}/vehicles/${vid}`, { method: 'DELETE' }),
};

export const bookings = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return json(`/bookings${q ? `?${q}` : ''}`);
  },
  get: (id) => json(`/bookings/${id}`),
  create: (data) => json('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => json(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => json(`/bookings/${id}`, { method: 'DELETE' }),
};

export const invoices = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return json(`/invoices${q ? `?${q}` : ''}`);
  },
  get: (id) => json(`/invoices/${id}`),
  create: (data) => json('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => json(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => json(`/invoices/${id}`, { method: 'DELETE' }),
  pdfUrl: (id) => `${BASE}/invoices/${id}/pdf`,
  send: (id) => json(`/invoices/${id}/send`, { method: 'POST' }),
};

export const plans = {
  list: () => json('/plans'),
  create: (data) => json('/plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => json(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => json(`/plans/${id}`, { method: 'DELETE' }),
};

export const revenue = {
  get: () => json('/revenue'),
  exportUrl: () => `${BASE}/revenue/export`,
};

export const settings = {
  get: () => json('/settings'),
  update: (data) => json('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => json('/settings/change-password', { method: 'POST', body: JSON.stringify(data) }),
};

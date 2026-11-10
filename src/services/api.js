const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'printplus_staff_token';

function getAuthHeaders(headers = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function authenticatedFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers)
  });
}

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error || fallback);
}

export function getStaffToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveStaffToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function fetchAuthSetup() {
  const res = await fetch(`${API_BASE}/auth/setup`);
  if (!res.ok) throw new Error('Could not check staff account setup.');
  return res.json();
}

export async function loginStaff(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) throw await readError(res, 'Sign in failed.');
  return res.json();
}

export async function createInitialSuperAdmin(account) {
  const res = await fetch(`${API_BASE}/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account)
  });
  if (!res.ok) throw await readError(res, 'Could not create the initial account.');
  return res.json();
}

export async function fetchCurrentStaffUser() {
  const res = await authenticatedFetch(`${API_BASE}/auth/me`);
  if (!res.ok) throw await readError(res, 'Staff session expired.');
  return res.json();
}

export async function logoutStaff() {
  const res = await authenticatedFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  if (!res.ok) throw await readError(res, 'Could not sign out.');
  return res.json();
}

export async function fetchStaffUsers() {
  const res = await authenticatedFetch(`${API_BASE}/admin/users`);
  if (!res.ok) throw await readError(res, 'Could not load staff accounts.');
  return res.json();
}

export async function createStaffUser(account) {
  const res = await authenticatedFetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account)
  });
  if (!res.ok) throw await readError(res, 'Could not create account.');
  return res.json();
}

export async function setStaffUserActive(id, isActive) {
  const res = await authenticatedFetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive })
  });
  if (!res.ok) throw await readError(res, 'Could not update account.');
  return res.json();
}

export async function fetchPricing() {
  const res = await fetch(`${API_BASE}/pricing`);
  if (!res.ok) throw new Error('Failed to fetch pricing');
  return res.json();
}

export async function updatePricing(pricingData) {
  const res = await authenticatedFetch(`${API_BASE}/pricing`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pricingData)
  });
  if (!res.ok) throw await readError(res, 'Failed to update pricing');
  return res.json();
}

export async function resetPricing() {
  const res = await authenticatedFetch(`${API_BASE}/pricing/reset`, { method: 'POST' });
  if (!res.ok) throw await readError(res, 'Failed to reset pricing');
  return res.json();
}

export async function calculatePricePreview(orderParams) {
  const res = await fetch(`${API_BASE}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderParams)
  });
  if (!res.ok) throw new Error('Failed to calculate price');
  return res.json();
}

export async function fetchOrders(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await authenticatedFetch(`${API_BASE}/orders?${query}`);
  if (!res.ok) throw await readError(res, 'Failed to fetch orders');
  return res.json();
}

export async function fetchOrderById(id) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit order');
  }
  return res.json();
}

export async function updateOrderStatus(id, status, note = '') {
  const res = await authenticatedFetch(`${API_BASE}/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note })
  });
  if (!res.ok) throw await readError(res, 'Failed to update order status');
  return res.json();
}

export async function reviseOrderQuote(id, { revisedAmount, reason, staffName }) {
  const res = await authenticatedFetch(`${API_BASE}/orders/${encodeURIComponent(id)}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revisedAmount, reason, staffName })
  });
  if (!res.ok) throw await readError(res, 'Failed to revise quote');
  return res.json();
}

export async function acceptOrderQuote(id) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/accept-quote`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to accept quote');
  return res.json();
}

export async function updatePayment(id, { paymentStatus, paymentMethod }) {
  const res = await authenticatedFetch(`${API_BASE}/orders/${encodeURIComponent(id)}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus, paymentMethod })
  });
  if (!res.ok) throw await readError(res, 'Failed to update payment');
  return res.json();
}

export async function uploadFiles(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
  } catch {
    throw new Error('Could not reach the upload service. Start the app with "npm run dev" and try again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload files');
  }
  return res.json();
}

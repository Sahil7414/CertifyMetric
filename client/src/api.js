const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
};

export const API_BASE = getApiBase();

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const serverOrigin = API_BASE.replace(/\/api\/?$/, '');
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${serverOrigin}${cleanPath}`;
};

let activeUser = null;
let authToken = null;

try {
  const savedUser = localStorage.getItem('auth_user');
  const savedToken = localStorage.getItem('auth_token');
  if (savedUser) activeUser = JSON.parse(savedUser);
  if (savedToken) authToken = savedToken;
} catch (e) {}

export const setApiUser = (user, token) => {
  activeUser = user ? { id: user.id, role: user.role } : null;
  authToken = token || null;
  if (user && token) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
  } else if (!user) {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }
};

export const getStoredAuth = () => {
  try {
    const u = localStorage.getItem('auth_user');
    const t = localStorage.getItem('auth_token');
    return { user: u ? JSON.parse(u) : null, token: t || null };
  } catch (e) {
    return { user: null, token: null };
  }
};

const getHeaders = (extra = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...extra
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (activeUser) {
    headers['x-user-id'] = activeUser.id;
  }
  return headers;
};

export const api = {
  // Auth
  getUsers: () => fetch(`${API_BASE}/auth/users`).then(async r => {
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  }).catch(() => []),
  login: (email, password) => fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Authentication failed');
    return json;
  }),
  logout: () => fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: getHeaders()
  }).then(() => {
    setApiUser(null);
  }),
  getMe: () => fetch(`${API_BASE}/auth/me`, {
    headers: getHeaders()
  }).then(async r => {
    const data = await r.json();
    return r.ok ? data : null;
  }).catch(() => null),

  // Instruments (Trader)
  getInstruments: (ownerId) => fetch(`${API_BASE}/instruments${ownerId ? `?owner_id=${ownerId}` : ''}`, {
    headers: getHeaders()
  }).then(async r => {
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  }).catch(() => []),
  getInstrument: (id) => fetch(`${API_BASE}/instruments/${id}`, {
    headers: getHeaders()
  }).then(r => r.json()),
  createInstrument: (data) => fetch(`${API_BASE}/instruments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to create instrument');
    return json;
  }),

  // Applications
  getApplications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/applications${query ? `?${query}` : ''}`, {
      headers: getHeaders()
    }).then(async r => {
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    }).catch(() => []);
  },
  getApplication: (id) => fetch(`${API_BASE}/applications/${id}`, {
    headers: getHeaders()
  }).then(r => r.json()),
  createApplication: (data) => fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to submit application');
    return json;
  }),

  // Authority Actions
  reviewApplication: (id) => fetch(`${API_BASE}/applications/${id}/review`, {
    method: 'POST',
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to open review');
    return json;
  }),
  getCandidates: (appId) => fetch(`${API_BASE}/applications/${appId}/candidates`, {
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to load candidates');
    return json;
  }),
  assignVerifier: (appId, data) => fetch(`${API_BASE}/applications/${appId}/assign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to assign verifier');
    return json;
  }),

  // Verifier Actions (Slice 2)
  getVerifierCases: (verifierId) => fetch(`${API_BASE}/verifications/cases${verifierId ? `?verifier_id=${verifierId}` : ''}`, {
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to load cases');
    return json;
  }),
  getCaseWorkspace: (appId) => fetch(`${API_BASE}/verifications/cases/${appId}`, {
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to open workspace');
    return json;
  }),
  startVerification: (appId) => fetch(`${API_BASE}/verifications/cases/${appId}/start`, {
    method: 'POST',
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to start verification');
    return json;
  }),
  saveDraft: (appId, data) => fetch(`${API_BASE}/verifications/cases/${appId}/draft`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to save draft');
    return json;
  }),
  uploadEvidence: (appId, formData) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (activeUser) {
      headers['x-user-id'] = activeUser.id;
      headers['x-user-role'] = activeUser.role;
    }
    return fetch(`${API_BASE}/verifications/cases/${appId}/evidence`, {
      method: 'POST',
      headers,
      body: formData
    }).then(async r => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Failed to upload evidence');
      return json;
    });
  },
  deleteEvidence: (appId, evidenceId) => fetch(`${API_BASE}/verifications/cases/${appId}/evidence/${evidenceId}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to delete evidence');
    return json;
  }),
  submitVerification: (appId, data) => fetch(`${API_BASE}/verifications/cases/${appId}/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to submit verification result');
    return json;
  }),

  // Certificates (Slice 3)
  generateCertificate: (appId) => fetch(`${API_BASE}/certificates/generate/${appId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to generate certificate');
    return json;
  }),
  getCertificates: (ownerId) => fetch(`${API_BASE}/certificates${ownerId ? `?owner_id=${ownerId}` : ''}`, {
    headers: getHeaders()
  }).then(async r => {
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  }).catch(() => []),
  getCertificate: (id) => fetch(`${API_BASE}/certificates/${id}`, {
    headers: getHeaders()
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Failed to fetch certificate');
    return json;
  }),

  // Public Verification (Slice 4)
  verifyPublicCertificate: (token) => fetch(`${API_BASE}/public/verify/${token}`).then(async r => {
    const json = await r.json();
    return { ok: r.ok, httpStatus: r.status, ...json };
  }),

  // Governance
  getAuditLogs: () => fetch(`${API_BASE}/audit-logs`, {
    headers: getHeaders()
  }).then(async r => {
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  }).catch(() => []),
  getStats: () => fetch(`${API_BASE}/stats`, {
    headers: getHeaders()
  }).then(async r => {
    const data = await r.json();
    return r.ok ? data : null;
  }).catch(() => null)
};

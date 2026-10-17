// Frontend API Client for Docworm Backend Server
// All requests use credentials: 'include' for secure httpOnly cookies.

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('docworm_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(apiPath, {
      credentials: 'include',
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  } catch (err: any) {
    throw new Error(err.message || 'Unable to connect to server. Please check your internet connection.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      let msg = data.error || data.message;
      if (typeof msg === 'object' && msg !== null) {
        msg = msg.message || msg.code || JSON.stringify(msg);
      }
      throw new Error(String(msg || `Request failed with status ${res.status}`));
    }
    return data;
  }

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error || parsed.message) {
        const extracted = parsed.error || parsed.message;
        msg = typeof extracted === 'object' ? (extracted.message || extracted.code || JSON.stringify(extracted)) : extracted;
      }
    } catch {}
    throw new Error(msg || `Server returned HTTP ${res.status}`);
  }

  return text as unknown as T;
}

export const api = {
  health: () => apiFetch('/api/health'),

  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      if (data?.token && typeof window !== 'undefined') {
        localStorage.setItem('docworm_token', data.token);
      }
      return data;
    },
    register: (userData: any) =>
      apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    logout: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('docworm_token');
      }
      return apiFetch('/api/auth/logout', { method: 'POST' });
    },
    me: () => apiFetch('/api/auth/me'),
    forgotPassword: (email: string) =>
      apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (payload: { token: string; password: string }) =>
      apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
    changePassword: (payload: { current_password: string; new_password: string }) =>
      apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  },

  profile: {
    update: (data: { name: string; phone?: string; designation?: string; photo_url?: string }) =>
      apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  users: {
    list: () => apiFetch('/api/users'),
    create: (userData: any) =>
      apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userData) }),
    update: (id: string, data: any) =>
      apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    approve: (id: string) =>
      apiFetch(`/api/users/${id}/approve`, { method: 'POST' }),
    reject: (id: string) =>
      apiFetch(`/api/users/${id}/reject`, { method: 'POST' }),
    remove: (id: string) =>
      apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  },

  requests: {
    list: () => apiFetch('/api/permission-requests'),
    create: (data: any) =>
      apiFetch('/api/permission-requests', { method: 'POST', body: JSON.stringify(data) }),
    decide: (id: string, payload: { action: string; remark?: string }) =>
      apiFetch(`/api/permission-requests/${id}/decide`, { method: 'POST', body: JSON.stringify(payload) }),
  },

  leaves: {
    list: () => apiFetch('/api/leaves'),
    create: (data: any) =>
      apiFetch('/api/leaves', { method: 'POST', body: JSON.stringify(data) }),
    decide: (id: string, payload: { action: 'Recommend' | 'Approve' | 'Reject'; remark?: string }) =>
      apiFetch(`/api/leaves/${id}/decide`, { method: 'POST', body: JSON.stringify(payload) }),
    cancel: (id: string) =>
      apiFetch(`/api/leaves/${id}`, { method: 'DELETE' }),
  },

  announcements: {
    list: () => apiFetch('/api/announcements'),
    create: (data: { title: string; body: string; priority?: string; audience_dept?: string | null }) =>
      apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string) =>
      apiFetch(`/api/announcements/${id}/read`, { method: 'POST' }),
  },

  options: {
    get: () => apiFetch('/api/options'),
    add: (data: { type: string; value: string }) =>
      apiFetch('/api/options', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch(`/api/options/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch(`/api/options/${id}`, { method: 'DELETE' }),
  },

  departments: {
    list: () => apiFetch('/api/departments'),
    create: (data: { code: string; name: string }) =>
      apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(data) }),
  },

  categories: {
    list: () => apiFetch('/api/event-categories'),
    create: (data: { name: string }) =>
      apiFetch('/api/event-categories', { method: 'POST', body: JSON.stringify(data) }),
  },

  settings: {
    getLetterhead: () => apiFetch('/api/settings/letterhead'),
    updateLetterhead: (data: any) =>
      apiFetch('/api/settings/letterhead', { method: 'PUT', body: JSON.stringify(data) }),
    getEmail: () => apiFetch('/api/settings/email'),
    updateEmail: (data: any) =>
      apiFetch('/api/settings/email', { method: 'PUT', body: JSON.stringify(data) }),
    testEmail: (email?: string) =>
      apiFetch('/api/settings/test-email', { method: 'POST', body: JSON.stringify({ email }) }),
  },

  admin: {
    listTables: () => apiFetch('/api/admin/tables'),
    getTableRows: (table: string, page = 1, limit = 25) =>
      apiFetch(`/api/admin/tables/${table}?page=${page}&limit=${limit}`),
    runSql: (query: string, writeMode = false) =>
      apiFetch('/api/admin/sql', { method: 'POST', body: JSON.stringify({ query, writeMode }) }),
    getAuditLog: () => apiFetch('/api/audit-log'),
  },

  push: {
    getVapidKey: () => apiFetch('/api/push/vapid-key'),
    subscribe: (sub: any) =>
      apiFetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  },
};

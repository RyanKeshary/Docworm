// Frontend API Client for Docworm Backend Server
// All requests use credentials: 'include' for secure httpOnly cookies.

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return {} as T;
  }

  if (res.status === 405) {
    // Fallback: If dev proxy returned 405, attempt direct backend call
    try {
      const fallbackUrl = `${window.location.protocol}//${window.location.hostname}:3001${url}`;
      const retryRes = await fetch(fallbackUrl, {
        credentials: 'include',
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
      });
      const data = await retryRes.json();
      if (!retryRes.ok) throw new Error(data.error || data.message || `Request failed with status ${retryRes.status}`);
      return data;
    } catch {
      // Proceed with normal error handling
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (!res.ok) throw new Error(text || `Server returned HTTP ${res.status}`);
    return text as unknown as T;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  health: () => apiFetch('/api/health'),

  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData: any) =>
      apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
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

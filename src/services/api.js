// ============================================================
//  J-RSD OS — Service API
//  Fichier : src/services/api.js
// ============================================================

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;
/**
 * Fonction fetch wrapper qui injecte automatiquement le token JWT.
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('jrsd_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const isSuspended = response.status === 403
      && typeof data.message === 'string'
      && data.message.includes('suspendu');

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('jrsd_token');
      if (isSuspended && token) {
        const { useGlobalStore } = await import('../store/globalStore');
        useGlobalStore.getState().logout();
      }
    }
    throw new Error(data.message || 'Une erreur est survenue.');
  }

  return data;
}

async function fetchWithAuthForm(endpoint, formData, method = 'POST') {
  const token = localStorage.getItem('jrsd_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    const isSuspended = response.status === 403
      && typeof data.message === 'string'
      && data.message.includes('suspendu');

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('jrsd_token');
      if (isSuspended && token) {
        const { useGlobalStore } = await import('../store/globalStore');
        useGlobalStore.getState().logout();
      }
    }
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

export const api = {
  auth: {
    login: (email, password) => fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    register: (userData) => fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    getMe: () => fetchWithAuth('/auth/me', {
      method: 'GET',
    }),
    generateInvitation: () => fetchWithAuth('/auth/invitation', {
      method: 'POST',
    }),
    forgotPassword: (email) => fetchWithAuth('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
    resetPassword: (token, password) => fetchWithAuth('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  },
  users: {
    getAll: () => fetchWithAuth('/users', {
      method: 'GET',
    }),
    updateRole: (userId, role) => fetchWithAuth(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
    getManagers: () => fetchWithAuth('/users/managers', { method: 'GET' }),
    uploadCv: (formData) => fetchWithAuthForm('/users/profile/cv', formData, 'POST'),
    deleteCv: () => fetchWithAuth('/users/profile/cv', { method: 'DELETE' }),
    getCvDownloadUrl: (userId) => `${API_BASE_URL}/users/${userId}/cv`,
    updateProfile: (formData) => fetchWithAuthForm('/users/profile', formData, 'PUT'),
  },
  projects: {
    getAll: () => fetchWithAuth('/projects', { method: 'GET' }),
    getOne: (id) => fetchWithAuth(`/projects/${id}`, { method: 'GET' }),
    create: (formData) => fetchWithAuthForm('/projects', formData, 'POST'),
    update: (id, formData) => fetchWithAuthForm(`/projects/${id}`, formData, 'PUT'),
    delete: (id) => fetchWithAuth(`/projects/${id}`, { method: 'DELETE' }),
  },
  teams: {
    getAll: () => fetchWithAuth('/teams', { method: 'GET' }),
    getMembers: (id) => fetchWithAuth(`/teams/${id}/members`, { method: 'GET' }),
    getAvailableUsers: (id) => fetchWithAuth(`/teams/${id}/available-users`, { method: 'GET' }),
    addMember: (teamId, userId) => fetchWithAuth(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    removeMember: (teamId, userId) => fetchWithAuth(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    create: (data) => fetchWithAuth('/teams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchWithAuth(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchWithAuth(`/teams/${id}`, { method: 'DELETE' }),
  },
  messages: {
    getUnreadCount: () => fetchWithAuth('/messages/unread-count', { method: 'GET' }),
    getConversations: () => fetchWithAuth('/messages/conversations', { method: 'GET' }),
    getHistory: (contactId) => fetchWithAuth(`/messages/${contactId}`, { method: 'GET' }),
    send: (receiverId, contenu) => fetchWithAuth('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, contenu }),
    }),
    update: (id, contenu) => fetchWithAuth(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ contenu }),
    }),
    delete: (id) => fetchWithAuth(`/messages/${id}`, { method: 'DELETE' }),
    markRead: (contactId) => fetchWithAuth(`/messages/${contactId}/mark-read`, { method: 'POST' }),
  },
  admin: {
    getUsers: () => fetchWithAuth('/admin/users', { method: 'GET' }),
    updateUserStatusOrRole: (id, data) => fetchWithAuth(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    generateInvitationKey: () => fetchWithAuth('/admin/invitation', { method: 'POST' }),
  },
  tasks: {
    getMyList: () => fetchWithAuth('/tasks/my-list', { method: 'GET' }),
    getMyTasks: () => fetchWithAuth('/tasks/my-tasks', { method: 'GET' }),
    getKanbanGlobal: () => fetchWithAuth('/tasks/kanban/global', { method: 'GET' }),
    getKanbanTeam: () => fetchWithAuth('/tasks/kanban/team', { method: 'GET' }),
    create: (data) => fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStatus: (id, statut) => fetchWithAuth(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statut }),
    }),
  },
  notifications: {
    getAll: () => fetchWithAuth('/notifications', { method: 'GET' }),
    create: (data) => fetchWithAuth('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markAsRead: (id) => fetchWithAuth(`/notifications/${id}/read`, { method: 'POST' }),
    update: (id, data) => fetchWithAuth(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => fetchWithAuth(`/notifications/${id}`, { method: 'DELETE' }),
  },
  userNotifications: {
    getAll: () => fetchWithAuth('/user-notifications', { method: 'GET' }),
    getUnreadCount: () => fetchWithAuth('/user-notifications/unread-count', { method: 'GET' }),
    markAsRead: (id) => fetchWithAuth(`/user-notifications/${id}/read`, { method: 'POST' }),
    markAllAsRead: () => fetchWithAuth('/user-notifications/read-all', { method: 'POST' }),
  },
  planning: {
    getMySchedule: () => fetchWithAuth('/planning/my-schedule', { method: 'GET' }),
    create: (data) => fetchWithAuth('/planning', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => fetchWithAuth(`/planning/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => fetchWithAuth(`/planning/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    getStats: () => fetchWithAuth('/dashboard/stats', { method: 'GET' }),
  },
  documents: {
    getAll: () => fetchWithAuth('/documents', { method: 'GET' }),
    upload: (formData) => fetchWithAuthForm('/documents/upload', formData, 'POST'),
    delete: (id) => fetchWithAuth(`/documents/${id}`, { method: 'DELETE' }),
  },
};

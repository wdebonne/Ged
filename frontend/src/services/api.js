import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || '/uploads';

/**
 * Helper pour construire les URLs des fichiers uploadés
 * @param {string} path - Chemin du fichier (ex: avatars/user.jpg ou courriers/doc.pdf)
 * @returns {string} URL complète du fichier
 */
export const getUploadUrl = (path) => {
  if (!path) return '';
  // Si le chemin est déjà une URL complète, le retourner tel quel
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Supprimer les slashs en début et fin pour éviter les doublons
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  const cleanBase = UPLOADS_URL.replace(/\/+$/g, '');
  return `${cleanBase}/${cleanPath}`;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Intercepteur de requêtes
api.interceptors.request.use(
  (config) => {
    // Ajouter le token d'authentification
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        console.error('Erreur parsing auth storage:', e);
      }
    }
    
    // Ne pas définir Content-Type pour FormData (axios le fait automatiquement)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Gérer les erreurs d'authentification
    if (response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Afficher un toast pour les erreurs serveur
    if (response?.status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer.');
    }

    return Promise.reject(error);
  }
);

export default api;

// Services API spécifiques

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (data) => api.post('/auth/change-password', data),
  getConfig: () => api.get('/auth/config'),
  updateProfile: (formData) => api.put('/auth/profile', formData)
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  uploadAvatar: (id, formData) => api.post(`/users/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getRecipients: (params) => api.get('/users/recipients', { params })
};

// Groups
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getOne: (id) => api.get(`/groups/${id}`),
  update: (id, data) => api.put(`/groups/${id}`, data),
  resetPermissions: (id) => api.post(`/groups/${id}/reset-permissions`),
  getPermissions: () => api.get('/groups/permissions')
};

// Services
export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getOne: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
};

// Senders
export const sendersAPI = {
  getAll: (params) => api.get('/senders', { params }),
  autocomplete: (q) => api.get('/senders/autocomplete', { params: { q } }),
  getOne: (id) => api.get(`/senders/${id}`),
  create: (data) => api.post('/senders', data),
  update: (id, data) => api.put(`/senders/${id}`, data),
  delete: (id) => api.delete(`/senders/${id}`)
};

// Subjects
export const subjectsAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  autocomplete: (q) => api.get('/subjects/autocomplete', { params: { q } }),
  getOne: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`)
};

// Mails
export const mailsAPI = {
  getAll: (params) => api.get('/mails', { params }),
  getOne: (id) => api.get(`/mails/${id}`),
  getById: (id) => api.get(`/mails/${id}`),
  create: (formData) => api.post('/mails', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/mails/${id}`),
  markAsRead: (id) => api.post(`/mails/${id}/read`),
  process: (id) => api.post(`/mails/${id}/process`),
  addResponse: (id, formData) => api.post(`/mails/${id}/response`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteResponse: (mailId, responseId) => api.delete(`/mails/${mailId}/response/${responseId}`),
  archive: (id) => api.post(`/mails/${id}/archive`),
  reopen: (id) => api.put(`/mails/${id}/reopen`),
  export: (data) => api.post('/mails/export', data, { responseType: 'blob' }),
  exportPDF: (id) => api.get(`/mails/${id}/pdf`, { responseType: 'blob' }),
  exportHistoryPDF: (id) => api.get(`/mails/${id}/pdf/history`, { responseType: 'blob' }),
  exportAllZIP: (id) => api.get(`/mails/${id}/pdf/all`, { responseType: 'blob' }),
  getFile: (id) => api.get(`/mails/${id}/file`, { responseType: 'blob' }),
  
  // Pending mails
  getPending: () => api.get('/mails/pending'),
  uploadPending: (formData) => {
    // Utiliser l'instance api configurée
    return api.post('/mails/pending/upload', formData, {
      timeout: 120000
    });
  },
  deletePending: (id) => api.delete(`/mails/pending/${id}`),
  importMail: (data) => api.post('/mails/import', data)
};

// Stats
export const statsAPI = {
  getStats: () => api.get('/stats'),
  getDashboard: () => api.get('/stats/dashboard'),
  getByService: () => api.get('/stats/by-service'),
  getByMonth: (year) => api.get('/stats/by-month', { params: { year } }),
  getDetailed: (params) => api.get('/stats/detailed', { params }),
  getMyPerformance: (params) => api.get('/stats/my-performance', { params })
};

// Settings
export const settingsAPI = {
  getAll: (category) => api.get('/settings', { params: { category } }),
  getOne: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  updateMany: (settings) => api.put('/settings', { settings }),
  testLDAP: (data) => api.post('/settings/ldap/test', data),
  testIMAP: (data) => api.post('/settings/imap/test', data),
  testSMTP: (data) => api.post('/settings/smtp/test', data),
  getBranding: () => api.get('/settings/public/branding'),
  getChatbotConfig: () => api.get('/settings/public/chatbot'),
  getExportOptions: () => api.get('/settings/public/export-options'),
  uploadLogo: (formData) => api.post('/settings/branding/logo', formData),
  deleteLogo: () => api.delete('/settings/branding/logo'),
  // OCR
  getOCRConfig: () => api.get('/settings/ocr/config'),
  saveOCRConfig: (data) => api.put('/settings/ocr/config', data),
  testOCR: (formData) => api.post('/settings/ocr/test', formData)
};

// IMAP
export const imapAPI = {
  getStatus: () => api.get('/imap/status'),
  start: () => api.post('/imap/start'),
  stop: () => api.post('/imap/stop'),
  check: () => api.post('/imap/check')
};

// Email Templates
export const emailTemplatesAPI = {
  getAll: () => api.get('/email-templates'),
  getActions: () => api.get('/email-templates/actions'),
  getOne: (id) => api.get(`/email-templates/${id}`),
  create: (data) => api.post('/email-templates', data),
  update: (id, data) => api.put(`/email-templates/${id}`, data),
  delete: (id) => api.delete(`/email-templates/${id}`),
  preview: (id) => api.post(`/email-templates/${id}/preview`),
  toggle: (id) => api.put(`/email-templates/${id}/toggle`)
};

// Webhooks
export const webhooksAPI = {
  getAll: () => api.get('/webhooks'),
  getOne: (id) => api.get(`/webhooks/${id}`),
  getEvents: () => api.get('/webhooks/events'),
  create: (data) => api.post('/webhooks', data),
  update: (id, data) => api.put(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  toggle: (id) => api.post(`/webhooks/${id}/toggle`),
  test: (id) => api.post(`/webhooks/${id}/test`),
  resetStats: (id) => api.post(`/webhooks/${id}/reset-stats`)
};

// OneDrive
export const onedriveAPI = {
  getStatus: () => api.get('/onedrive/status'),
  getConfig: () => api.get('/onedrive/config'),
  updateConfig: (data) => api.put('/onedrive/config', data),
  getAuthUrl: (redirectUri) => api.get(`/onedrive/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`),
  authCallback: (code, redirectUri) => api.post('/onedrive/auth/callback', { code, redirectUri }),
  test: () => api.post('/onedrive/test'),
  disconnect: () => api.post('/onedrive/disconnect'),
  listFolders: (path) => api.get(`/onedrive/folders${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  createFolder: (path, name) => api.post('/onedrive/folders', { path, name })
};

// S3 Storage
export const s3API = {
  getStatus: () => api.get('/storage/s3/status'),
  getConfig: () => api.get('/storage/s3/config'),
  updateConfig: (data) => api.put('/storage/s3/config', data),
  test: () => api.post('/storage/s3/test'),
  disconnect: () => api.post('/storage/s3/disconnect'),
  listObjects: (prefix) => api.get(`/storage/s3/objects${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`),
  createFolder: (path) => api.post('/storage/s3/folders', { path })
};

// NextCloud Storage
export const nextcloudAPI = {
  getStatus: () => api.get('/storage/nextcloud/status'),
  getConfig: () => api.get('/storage/nextcloud/config'),
  updateConfig: (data) => api.put('/storage/nextcloud/config', data),
  test: () => api.post('/storage/nextcloud/test'),
  disconnect: () => api.post('/storage/nextcloud/disconnect'),
  listFolders: (path) => api.get(`/storage/nextcloud/folders${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  createFolder: (path, name) => api.post('/storage/nextcloud/folders', { path, name })
};

// Delegations
export const delegationsAPI = {
  getAll: (type) => api.get('/delegations', { params: { type } }),
  getActive: () => api.get('/delegations/active'),
  create: (data) => api.post('/delegations', data),
  update: (id, data) => api.put(`/delegations/${id}`, data),
  revoke: (id, note) => api.post(`/delegations/${id}/revoke`, { note }),
  delete: (id) => api.delete(`/delegations/${id}`),
  checkOverlap: (userId) => api.get(`/delegations/check/${userId}`)
};

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  }
};

// Voter APIs
export const voterAPI = {
  register: (voterData) => api.post('/voters/register', voterData),
  getAll: (params) => api.get('/voters', { params }),
  getById: (voterId) => api.get(`/voters/${voterId}`),
  verify: (voterId, data) => api.put(`/voters/${voterId}/verify`, data),
  update: (voterId, data) => api.put(`/voters/${voterId}`, data),
  getStats: () => api.get('/voters/stats')
};

// Token APIs
export const tokenAPI = {
  generate: (voterId) => api.post('/tokens/generate', { voterId }),
  getAll: (params) => api.get('/tokens', { params }),
  getByVoterId: (voterId) => api.get(`/tokens/voter/${voterId}`),
  verify: (tokenHash) => api.get(`/tokens/verify/${tokenHash}`),
  markUsed: (tokenHash, data) => api.put(`/tokens/${tokenHash}/mark-used`, data)
};

// Vote APIs
export const voteAPI = {
  record: (voteData) => api.post('/votes/record', voteData),
  getResults: () => api.get('/votes/results'),
  verify: (transactionHash) => api.get(`/votes/verify/${transactionHash}`),
  getAll: (params) => api.get('/votes', { params }),
  syncFromBlockchain: () => api.post('/votes/sync')
};

// System APIs
export const systemAPI = {
  health: () => api.get('/health'),
  status: () => api.get('/status')
};

export default api;
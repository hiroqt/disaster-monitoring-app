import axios from 'axios';
import { HazardRecord, UserReport, NotificationPreferences } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('Network error - switching to offline mode');
    }
    return Promise.reject(error);
  }
);

export const hazardApi = {
  getHazards: async (params?: {
    type?: string;
    region?: string;
    since?: string;
  }): Promise<HazardRecord[]> => {
    const response = await api.get('/hazards', { params });
    // Server returns { data: [...], pagination: {...}, metadata: {...} }
    return response.data.data || response.data;
  },

  getHazardById: async (id: string): Promise<HazardRecord> => {
    const response = await api.get(`/hazards/${id}`);
    // Server returns { data: {...}, metadata: {...} }
    return response.data.data || response.data;
  },

  getRegionHazards: async (regionId: string): Promise<HazardRecord[]> => {
    const response = await api.get(`/regions/${regionId}/active-hazards`);
    // Server returns { data: [...], metadata: {...} }
    return response.data.data || response.data;
  },

  submitReport: async (report: UserReport): Promise<UserReport> => {
    const response = await api.post('/reports', report);
    // Server returns { data: {...}, metadata: {...} }
    return response.data.data || response.data;
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await api.delete(`/reports/${reportId}`);
  },

  getHealth: async (): Promise<Record<string, string>> => {
    const response = await api.get('/health');
    return response.data;
  },

  updateNotificationPreferences: async (
    preferences: NotificationPreferences
  ): Promise<void> => {
    await api.post('/preferences/notifications', preferences);
  },
};

export default api;

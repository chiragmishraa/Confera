import apiClient from './client';

export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  signup: (userData) => apiClient.post('/auth/signup', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.put('/auth/change-password', data),
  logout: () => apiClient.post('/auth/logout'),
};

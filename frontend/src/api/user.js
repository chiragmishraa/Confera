import apiClient from './client';

export const userAPI = {
  getById: (userId) => apiClient.get(`/user/${userId}`),
};

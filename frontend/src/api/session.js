import apiClient from './client';

export const sessionAPI = {
  createSession: (data) => apiClient.post('/session/create', data),
  getSession: (meetingCode) => apiClient.get(`/session/${meetingCode}`),
  endSession: (meetingCode) => apiClient.delete(`/session/${meetingCode}`),
  getActiveSessions: () => apiClient.get('/session/active'),
  getUserMeetings: () => apiClient.get('/session/history'),
  updateDuration: (meetingCode, duration) => apiClient.put(`/session/${meetingCode}/duration`, { duration }),
};

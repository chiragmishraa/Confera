import apiClient from './client';

export const sessionAPI = {
  createSession: (data) => apiClient.post('/session/create', data),
  getSession: (meetingCode) => apiClient.get(`/session/${meetingCode}`),
  endSession: (meetingCode) => apiClient.delete(`/session/${meetingCode}`),
  getActiveSessions: () => apiClient.get('/session/active'),
  getUserMeetings: () => apiClient.get('/session/history'),
  updateDuration: (meetingCode, duration) => apiClient.put(`/session/${meetingCode}/duration`, { duration }),
  
  // Password management
  setPassword: (meetingCode, password) => apiClient.put(`/session/${meetingCode}/password`, { password }),
  removePassword: (meetingCode) => apiClient.delete(`/session/${meetingCode}/password`),
  verifyPassword: (meetingCode, password) => apiClient.post(`/session/${meetingCode}/verify-password`, { password }),
  
  // Participant management
  removeParticipant: (meetingCode, socketId) => apiClient.delete(`/session/${meetingCode}/participant/${socketId}`),
  
  // Slide management
  createSlide: (meetingCode, name) => apiClient.post(`/session/${meetingCode}/slides`, { name }),
  getSlides: (meetingCode) => apiClient.get(`/session/${meetingCode}/slides`),
  updateSlide: (meetingCode, slideId, name) => apiClient.put(`/session/${meetingCode}/slides/${slideId}`, { name }),
  deleteSlide: (meetingCode, slideId) => apiClient.delete(`/session/${meetingCode}/slides/${slideId}`),
  joinSlide: (meetingCode, slideId, socketId) => apiClient.post(`/session/${meetingCode}/slides/${slideId}/join`, { socketId }),
  leaveSlide: (meetingCode, slideId) => apiClient.delete(`/session/${meetingCode}/slides/${slideId}/leave`),
};

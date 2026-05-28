import client from './client';

export const slidesAPI = {
  // Create a new slide
  createSlide: async (meetingCode, name) => {
    const response = await client.post(`/sessions/${meetingCode}/slides`, { name });
    return response.data;
  },

  // Get all slides for a session
  getSlides: async (meetingCode) => {
    const response = await client.get(`/sessions/${meetingCode}/slides`);
    return response.data;
  },

  // Rename a slide
  renameSlide: async (meetingCode, slideId, name) => {
    const response = await client.put(`/sessions/${meetingCode}/slides/${slideId}`, { name });
    return response.data;
  },

  // Delete a slide
  deleteSlide: async (meetingCode, slideId) => {
    const response = await client.delete(`/sessions/${meetingCode}/slides/${slideId}`);
    return response.data;
  },

  // Move to a slide
  moveToSlide: async (meetingCode, slideId, socketId) => {
    const response = await client.post(`/sessions/${meetingCode}/slides/${slideId}/move`, { socketId });
    return response.data;
  }
};

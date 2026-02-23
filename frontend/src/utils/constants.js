// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Socket.IO
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// File Upload
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// Validation
export const MIN_PASSWORD_LENGTH = 6;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 50;

// Meeting
export const MEETING_CODE_LENGTH = 10;

// Notifications
export const NOTIFICATION_DURATION = 3000; // 3 seconds

// WebRTC
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// Socket.IO
export const SOCKET_CONFIG = {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

// Keyboard Shortcuts
export const SHORTCUTS = {
  TOGGLE_CAMERA: 'Alt+V',
  TOGGLE_MIC: 'Alt+A',
  TOGGLE_PARTICIPANTS: 'Alt+P',
  LEAVE_MEETING: 'Alt+L',
};

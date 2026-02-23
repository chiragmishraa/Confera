import {
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES
} from './constants';

export const validateEmail = (email) => {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    return 'Please enter a valid email';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password || password.trim().length === 0) {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
};

export const validateUsername = (username) => {
  if (username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};

export const validateName = (name) => {
  if (name.length < MIN_NAME_LENGTH) {
    return `Name must be at least ${MIN_NAME_LENGTH} characters`;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name cannot exceed ${MAX_NAME_LENGTH} characters`;
  }
  return null;
};

export const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'File type not allowed. Please use JPG, PNG, or GIF';
  }
  return null;
};

export const validateMeetingCode = (code) => {
  if (!code || code.trim().length === 0) {
    return 'Meeting code is required';
  }
  return null;
};

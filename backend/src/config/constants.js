module.exports = {
  // JWT
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_COOKIE_EXPIRE: 7, // days
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 for production, 1000 for dev
  
  // File upload
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  
  // Session
  SESSION_EXPIRE_HOURS: 24,
  
  // Password
  MIN_PASSWORD_LENGTH: 6,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'https://localhost:5173'],
};

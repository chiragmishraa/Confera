const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sessionLimiter, sessionAccessLimiter } = require('../middleware/rateLimiter');
const {
  createSessionValidation,
  meetingCodeValidation,
  validate
} = require('../middleware/validation');

const {
  createSession,
  getSession,
  endSession,
  getActiveSessions,
  getUserMeetings,
  updateSessionDuration
} = require('../controllers/sessionController');

router.post('/create', protect, sessionLimiter, createSessionValidation, validate, createSession);
router.get('/active', protect, getActiveSessions);
router.get('/history', protect, getUserMeetings);
router.put('/:meetingCode/duration', protect, updateSessionDuration);
router.get('/:meetingCode', protect, sessionAccessLimiter, meetingCodeValidation, validate, getSession);
router.delete('/:meetingCode', protect, meetingCodeValidation, validate, endSession);

module.exports = router;

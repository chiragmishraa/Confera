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
  updateSessionDuration,
  setPassword,
  removePassword,
  verifyPassword,
  removeParticipant
} = require('../controllers/sessionController');

router.post('/create', protect, sessionLimiter, createSessionValidation, validate, createSession);
router.get('/active', protect, getActiveSessions);
router.get('/history', protect, getUserMeetings);
router.put('/:meetingCode/duration', protect, updateSessionDuration);
router.get('/:meetingCode', protect, sessionAccessLimiter, meetingCodeValidation, validate, getSession);
router.delete('/:meetingCode', protect, meetingCodeValidation, validate, endSession);

// Password management routes
router.put('/:meetingCode/password', protect, setPassword);
router.delete('/:meetingCode/password', protect, removePassword);
router.post('/:meetingCode/verify-password', protect, verifyPassword);

// Participant management routes
router.delete('/:meetingCode/participant/:socketId', protect, removeParticipant);

// Slide management routes
const {
  createSlide,
  getSlides,
  renameSlide,
  deleteSlide,
  moveToSlide
} = require('../controllers/sessionController');

router.post('/:meetingCode/slides', protect, createSlide);
router.get('/:meetingCode/slides', protect, getSlides);
router.put('/:meetingCode/slides/:slideId', protect, renameSlide);
router.delete('/:meetingCode/slides/:slideId', protect, deleteSlide);
router.post('/:meetingCode/slides/:slideId/move', protect, moveToSlide);

module.exports = router;
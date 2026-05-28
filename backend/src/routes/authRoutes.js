const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  signupValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
} = require('../middleware/validation');

const {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  guestLogin,
  deleteAccount
} = require('../controllers/authController');

router.post('/signup', authLimiter, signupValidation, validate, signup);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/guest-login', authLimiter, guestLogin);
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);
router.put('/change-password', protect, changePasswordValidation, validate, changePassword);
router.delete('/account', protect, deleteAccount);

module.exports = router;

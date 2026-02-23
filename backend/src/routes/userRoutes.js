const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserById } = require('../controllers/userController');

router.get('/:userId', protect, getUserById);

module.exports = router;

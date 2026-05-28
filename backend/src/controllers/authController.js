const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

exports.signup = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return errorResponse(
        res,
        existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken',
        'USER_EXISTS',
        400
      );
    }

    // Create user
    const user = await User.create({
      name,
      username,
      email,
      password
    });

    logger.info('New user registered', { userId: user._id, email });

    return successResponse(
      res,
      { user: user.getPublicProfile() },
      'User registered successfully',
      201
    );
  } catch (error) {
    logger.error('Signup error:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(
        res,
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401
      );
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    logger.info('User logged in', { userId: user._id });

    return successResponse(
      res,
      {
        token,
        user: user.getPublicProfile()
      },
      'Login successful'
    );
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    return successResponse(
      res,
      req.user.getPublicProfile(),
      'Profile fetched successfully'
    );
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, username, profilePic } = req.body;
    const user = req.user;

    // Check if username is taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return errorResponse(
          res,
          'Username already taken',
          'USERNAME_EXISTS',
          400
        );
      }
    }

    // Update fields
    if (name) user.name = name;
    if (username) user.username = username;
    if (profilePic !== undefined) user.profilePic = profilePic;

    await user.save();

    logger.info('Profile updated', { userId: user._id });

    return successResponse(
      res,
      { user: user.getPublicProfile() },
      'Profile updated successfully'
    );
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(
        res,
        'Current password is incorrect',
        'INVALID_PASSWORD',
        400
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('Password changed', { userId: user._id });

    return successResponse(
      res,
      null,
      'Password changed successfully'
    );
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

exports.guestLogin = async (req, res, next) => {
  try {
    // Generate a random 6-char alphanumeric suffix
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const suffixLower = suffix.toLowerCase();
    const name = `Confera User - ${suffix}`;
    const username = `conferauser${suffixLower}`;
    const email = `user${suffixLower}@confera.com`;
    const password = username; // password same as username

    // Ensure uniqueness (extremely unlikely collision, but safe)
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      // Retry by calling the handler again (tail-call style via next route)
      return exports.guestLogin(req, res, next);
    }

    const user = await User.create({ name, username, email, password });

    user.lastLogin = Date.now();
    await user.save();

    const token = user.generateAuthToken();

    logger.info('Guest user created and logged in', { userId: user._id, username });

    return successResponse(
      res,
      { token, user: user.getPublicProfile() },
      'Guest login successful',
      201
    );
  } catch (error) {
    logger.error('Guest login error:', error);
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);
    logger.info('Account deleted', { userId });
    return successResponse(res, null, 'Account deleted successfully');
  } catch (error) {
    logger.error('Delete account error:', error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    return successResponse(
      res,
      null,
      'Logged out successfully'
    );
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('name username profilePic');
    
    if (!user) {
      return errorResponse(
        res,
        'User not found',
        'USER_NOT_FOUND',
        404
      );
    }

    return successResponse(
      res,
      { user },
      'User fetched successfully'
    );
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
};

const Session = require('../models/Session');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Generate unique meeting code
function generateMeetingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.createSession = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;
    
    // Generate unique meeting code
    let meetingCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      meetingCode = generateMeetingCode();
      const existing = await Session.findOne({ meetingCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return errorResponse(
        res,
        'Failed to generate unique meeting code. Please try again.',
        'CODE_GENERATION_FAILED',
        500
      );
    }

    const session = await Session.create({
      meetingCode,
      hostId: userId,
      hostName: name || req.user.name,
      participants: [],
      joinedUsers: [{
        userId: userId,
        joinedAt: new Date()
      }]
    });

    logger.info('Session created successfully', { 
      sessionId: session._id, 
      meetingCode: session.meetingCode,
      hostId: userId,
      status: session.status
    });
    
    // Verify session was saved
    const verifySession = await Session.findOne({ meetingCode: session.meetingCode });
    if (!verifySession) {
      logger.error('Session verification failed - not found in database', { meetingCode: session.meetingCode });
    } else {
      logger.info('Session verified in database', { 
        sessionId: verifySession._id,
        meetingCode: verifySession.meetingCode 
      });
    }
    
    return successResponse(
      res,
      { 
        meetingCode: session.meetingCode,
        sessionId: session._id
      },
      'Session created successfully',
      201
    );
  } catch (error) {
    logger.error('Create session error:', error);
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase() 
    }).populate('hostId', 'name username profilePic');
    
    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    if (session.status === 'ended') {
      return errorResponse(
        res,
        'This meeting has ended',
        'SESSION_ENDED',
        410
      );
    }

    const sessionData = session.toObject();
    
    // Check if requester is the host
    const isHost = session.hostId._id.toString() === req.user._id.toString() || 
                   session.hostId.toString() === req.user._id.toString();
    
    // Only send password to host, hide from other participants
    if (!isHost) {
      delete sessionData.password;
    }

    return successResponse(
      res,
      sessionData,
      'Session fetched successfully'
    );
  } catch (error) {
    logger.error('Get session error:', error);
    next(error);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase(),
      hostId: userId
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found or you are not the host',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.endSession();

    logger.info('Session ended', { 
      sessionId: session._id, 
      meetingCode 
    });
    
    return successResponse(
      res,
      null,
      'Session ended successfully'
    );
  } catch (error) {
    logger.error('End session error:', error);
    next(error);
  }
};

exports.getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const sessions = await Session.find({
      hostId: userId,
      status: 'active'
    }).sort({ createdAt: -1 });

    return successResponse(
      res,
      { sessions },
      'Active sessions fetched successfully'
    );
  } catch (error) {
    logger.error('Get active sessions error:', error);
    next(error);
  }
};

// Get user's meeting history (meetings they created or joined)
exports.getUserMeetings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Find all sessions where user is host or has joined
    const sessions = await Session.find({
      $or: [
        { hostId: userId },
        { 'joinedUsers.userId': userId }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('meetingCode hostId hostName status participants joinedUsers createdAt updatedAt password isLocked')
    .populate('hostId', 'name username profilePic');

    // Format the response
    const formattedSessions = sessions.map(session => {
      // Get the total number of unique users who joined (including host)
      const uniqueUserIds = new Set();
      
      // Add all users from joinedUsers array
      session.joinedUsers.forEach(ju => {
        uniqueUserIds.add(ju.userId.toString());
      });
      
      // Add host if not already included
      uniqueUserIds.add(session.hostId._id.toString());
      
      const totalParticipants = uniqueUserIds.size;

      // Get duration for current user
      const userJoinData = session.joinedUsers.find(u => u.userId.toString() === userId.toString());
      const duration = userJoinData?.duration || 0;
      
      const isHost = session.hostId._id.toString() === userId.toString();

      return {
        code: session.meetingCode,
        status: session.status,
        hostName: session.hostName,
        isHost: isHost,
        participantCount: totalParticipants,
        lastJoined: session.joinedUsers.find(u => u.userId.toString() === userId.toString())?.joinedAt || session.createdAt,
        createdAt: session.createdAt,
        duration: duration,
        // Only include password if user is the host
        ...(isHost && session.isLocked && { password: session.password, isLocked: true })
      };
    });

    return successResponse(
      res,
      { meetings: formattedSessions },
      'User meetings fetched successfully'
    );
  } catch (error) {
    logger.error('Get user meetings error:', error);
    next(error);
  }
};

// Update session duration for a user
exports.updateSessionDuration = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const { duration } = req.body;
    const userId = req.user._id;

    const session = await Session.findOne({ meetingCode: meetingCode.toUpperCase() });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    // Find and update the user's duration
    const userIndex = session.joinedUsers.findIndex(
      u => u.userId.toString() === userId.toString()
    );

    if (userIndex !== -1) {
      session.joinedUsers[userIndex].duration = duration;
      await session.save();
    }

    return successResponse(
      res,
      { duration },
      'Duration updated successfully'
    );
  } catch (error) {
    logger.error('Update duration error:', error);
    next(error);
  }
};

// Set or update meeting password (host only)
exports.setPassword = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const { password } = req.body;
    const userId = req.user._id;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase(),
      hostId: userId
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found or you are not the host',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.setPassword(password);

    logger.info('Session password set', { 
      sessionId: session._id, 
      meetingCode,
      isLocked: session.isLocked
    });
    
    return successResponse(
      res,
      { isLocked: session.isLocked },
      'Password set successfully'
    );
  } catch (error) {
    logger.error('Set password error:', error);
    next(error);
  }
};

// Remove password from meeting (host only)
exports.removePassword = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase(),
      hostId: userId
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found or you are not the host',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.removePassword();

    logger.info('Session password removed', { 
      sessionId: session._id, 
      meetingCode
    });
    
    return successResponse(
      res,
      { isLocked: false },
      'Password removed successfully'
    );
  } catch (error) {
    logger.error('Remove password error:', error);
    next(error);
  }
};

// Verify meeting password
exports.verifyPassword = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const { password } = req.body;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    const isValid = session.verifyPassword(password);

    if (!isValid) {
      return errorResponse(
        res,
        'Incorrect password',
        'INVALID_PASSWORD',
        401
      );
    }

    return successResponse(
      res,
      { valid: true },
      'Password verified successfully'
    );
  } catch (error) {
    logger.error('Verify password error:', error);
    next(error);
  }
};

// Remove participant from meeting (host only)
exports.removeParticipant = async (req, res, next) => {
  try {
    const { meetingCode, socketId } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase(),
      hostId: userId
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found or you are not the host',
        'SESSION_NOT_FOUND',
        404
      );
    }

    // Remove participant
    await session.removeParticipant(socketId);

    logger.info('Participant removed by host', { 
      sessionId: session._id, 
      meetingCode,
      removedSocketId: socketId
    });
    
    return successResponse(
      res,
      null,
      'Participant removed successfully'
    );
  } catch (error) {
    logger.error('Remove participant error:', error);
    next(error);
  }
};

// Slide Management Controllers

// Create a new slide
exports.createSlide = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const { name } = req.body;
    const userId = req.user._id;
    
    if (!name || !name.trim()) {
      return errorResponse(
        res,
        'Slide name is required',
        'VALIDATION_ERROR',
        400
      );
    }

    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.createSlide(name.trim(), userId);

    logger.info('Slide created', { 
      sessionId: session._id, 
      meetingCode,
      slideName: name
    });
    
    return successResponse(
      res,
      { slides: session.slides },
      'Slide created successfully',
      201
    );
  } catch (error) {
    logger.error('Create slide error:', error);
    next(error);
  }
};

// Get all slides for a session
exports.getSlides = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    }).select('slides');

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    return successResponse(
      res,
      { slides: session.slides },
      'Slides fetched successfully'
    );
  } catch (error) {
    logger.error('Get slides error:', error);
    next(error);
  }
};

// Rename a slide
exports.renameSlide = async (req, res, next) => {
  try {
    const { meetingCode, slideId } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return errorResponse(
        res,
        'Slide name is required',
        'VALIDATION_ERROR',
        400
      );
    }

    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.renameSlide(slideId, name.trim());

    logger.info('Slide renamed', { 
      sessionId: session._id, 
      meetingCode,
      slideId,
      newName: name
    });
    
    return successResponse(
      res,
      { slides: session.slides },
      'Slide renamed successfully'
    );
  } catch (error) {
    logger.error('Rename slide error:', error);
    next(error);
  }
};

// Delete a slide
exports.deleteSlide = async (req, res, next) => {
  try {
    const { meetingCode, slideId } = req.params;
    
    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.deleteSlide(slideId);

    logger.info('Slide deleted', { 
      sessionId: session._id, 
      meetingCode,
      slideId
    });
    
    return successResponse(
      res,
      { slides: session.slides },
      'Slide deleted successfully'
    );
  } catch (error) {
    logger.error('Delete slide error:', error);
    next(error);
  }
};

// Move to a slide
exports.moveToSlide = async (req, res, next) => {
  try {
    const { meetingCode, slideId } = req.params;
    const { socketId } = req.body;
    
    if (!socketId) {
      return errorResponse(
        res,
        'Socket ID is required',
        'VALIDATION_ERROR',
        400
      );
    }

    const session = await Session.findOne({ 
      meetingCode: meetingCode.toUpperCase()
    });

    if (!session) {
      return errorResponse(
        res,
        'Session not found',
        'SESSION_NOT_FOUND',
        404
      );
    }

    await session.moveToSlide(socketId, slideId);

    logger.info('User moved to slide', { 
      sessionId: session._id, 
      meetingCode,
      slideId,
      socketId
    });
    
    return successResponse(
      res,
      { slides: session.slides },
      'Moved to slide successfully'
    );
  } catch (error) {
    logger.error('Move to slide error:', error);
    next(error);
  }
};

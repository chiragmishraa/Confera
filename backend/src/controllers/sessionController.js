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

    return successResponse(
      res,
      session,
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
    .select('meetingCode hostId hostName status participants joinedUsers createdAt updatedAt')
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

      return {
        code: session.meetingCode,
        status: session.status,
        hostName: session.hostName,
        isHost: session.hostId._id.toString() === userId.toString(),
        participantCount: totalParticipants,
        lastJoined: session.joinedUsers.find(u => u.userId.toString() === userId.toString())?.joinedAt || session.createdAt,
        createdAt: session.createdAt,
        duration: duration
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

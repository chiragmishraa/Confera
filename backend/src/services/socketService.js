const Session = require('../models/Session');
const logger = require('../utils/logger');

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.info('User connected', { socketId: socket.id });

    socket.on('join-room', async (data) => {
      try {
        const { roomCode, userInfo } = data;
        
        logger.info('Join room attempt', { roomCode, userInfo });
        
        // Ensure roomCode is uppercase for consistency
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        if (!normalizedRoomCode) {
          logger.warn('No room code provided');
          socket.emit('error', { message: 'Room code is required' });
          return;
        }
        
        // Try to find session with retry logic (in case of timing issues)
        let session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (!session) {
          logger.warn('Session not found on first attempt, retrying...', { 
            roomCode: normalizedRoomCode 
          });
          
          // Wait 500ms and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          session = await Session.findOne({ meetingCode: normalizedRoomCode });
        }
        
        if (!session) {
          logger.error('Session not found after retry', { 
            roomCode: normalizedRoomCode,
            searchedFor: normalizedRoomCode 
          });
          
          // List all sessions for debugging
          const allSessions = await Session.find({}).select('meetingCode status');
          logger.error('Available sessions:', { 
            count: allSessions.length,
            sessions: allSessions.map(s => ({ code: s.meetingCode, status: s.status }))
          });
          
          socket.emit('error', { message: 'Meeting session not found' });
          return;
        }
        
        logger.info('Session found', { 
          sessionId: session._id, 
          meetingCode: session.meetingCode,
          status: session.status
        });
        
        socket.join(normalizedRoomCode);
        socket.userInfo = userInfo;
        socket.roomCode = normalizedRoomCode;

        // Add participant using model method
        await session.addParticipant({
          userId: userInfo.userId,
          socketId: socket.id,
          name: userInfo.name,
          username: userInfo.username,
          profilePic: userInfo.profilePic || ''
        });

        logger.info('User joined room', { 
          socketId: socket.id, 
          roomCode, 
          userName: userInfo.name 
        });

        // Get existing users (exclude screen share dummies)
        const existingUsers = session.participants
          .filter(p => p.socketId !== socket.id && p.isActive && !p.socketId.endsWith('-screen'))
          .map(p => ({
            socketId: p.socketId,
            userInfo: {
              userId: p.userId,
              name: p.name,
              username: p.username,
              profilePic: p.profilePic
            },
            isCameraOn: p.isCameraOn,
            isMicOn: p.isMicOn,
            isScreenSharing: p.isScreenSharing
          }));
        
        logger.info('========== EXISTING USERS CALCULATION ==========');
        logger.info('All participants:', {
          total: session.participants.length,
          participants: session.participants.map(p => ({
            socketId: p.socketId,
            userId: p.userId,
            name: p.name,
            isActive: p.isActive,
            isScreenDummy: p.socketId.endsWith('-screen')
          }))
        });
        logger.info('Existing users for new joiner', {
          newUserSocketId: socket.id,
          totalParticipants: session.participants.length,
          activeParticipants: session.participants.filter(p => p.isActive).length,
          existingUsersCount: existingUsers.length,
          existingUsers: existingUsers.map(u => ({ socketId: u.socketId, name: u.userInfo.name }))
        });
        
        // Get active screen shares
        const activeScreenShares = session.participants
          .filter(p => p.isActive && p.socketId.endsWith('-screen'))
          .map(p => ({
            socketId: p.socketId.replace('-screen', ''), // Real user socket ID
            screenSocketId: p.socketId, // Dummy socket ID
            userInfo: {
              userId: p.userId,
              name: p.name,
              username: p.username,
              profilePic: p.profilePic
            }
          }));
        
        if (existingUsers.length > 0) {
          logger.info('========== SENDING EXISTING-USERS EVENT ==========');
          logger.info('Sending existing-users event', {
            to: socket.id,
            count: existingUsers.length,
            users: existingUsers.map(u => ({ socketId: u.socketId, name: u.userInfo.name })),
            fullData: JSON.stringify(existingUsers)
          });
          socket.emit('existing-users', existingUsers);
        } else {
          logger.warn('========== NO EXISTING USERS TO SEND ==========');
          logger.warn('No existing users to send', { newUserSocketId: socket.id });
        }
        
        // Send active screen shares to new user
        if (activeScreenShares.length > 0) {
          logger.info('Sending active screen shares to new user', { 
            socketId: socket.id,
            screenShares: activeScreenShares 
          });
          
          activeScreenShares.forEach(screenShare => {
            socket.emit('screen-share-started', {
              socketId: screenShare.socketId,
              screenSocketId: screenShare.screenSocketId,
              userInfo: screenShare.userInfo
            });
          });
        }

        socket.to(normalizedRoomCode).emit('user-joined', {
          socketId: socket.id,
          userInfo: userInfo,
          isCameraOn: false,
          isMicOn: false,
          isScreenSharing: false
        });
      } catch (err) {
        logger.error('Join room error:', err);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    socket.on('offer', ({ offer, to }) => {
      logger.debug('Relaying offer', { from: socket.id, to });
      io.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to }) => {
      logger.debug('Relaying answer', { from: socket.id, to });
      io.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      logger.debug('Relaying ICE candidate', { from: socket.id, to });
      io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Screen share signaling
    socket.on('screen-offer', ({ offer, to, from, screenSocketId, room }) => {
      logger.debug('Relaying screen share offer', { from, to, screenSocketId });
      io.to(to).emit('screen-offer', { offer, from, screenSocketId });
    });

    socket.on('screen-answer', ({ answer, to, room }) => {
      logger.debug('Relaying screen share answer', { from: socket.id, to });
      io.to(to).emit('screen-answer', { answer, from: socket.id });
    });

    socket.on('screen-ice-candidate', ({ candidate, to, from }) => {
      logger.debug('Relaying screen share ICE candidate', { from, to });
      io.to(to).emit('screen-ice-candidate', { candidate, from });
    });

    // Chat message handler
    socket.on('chat-message', ({ roomCode, message, userInfo }) => {
      const normalizedRoomCode = roomCode?.toUpperCase();
      
      logger.debug('Chat message', { 
        from: socket.id, 
        roomCode: normalizedRoomCode, 
        userName: userInfo.name 
      });
      
      // Broadcast message to all users in the room including sender
      io.to(normalizedRoomCode).emit('chat-message', {
        id: `${socket.id}-${Date.now()}`,
        message,
        userInfo,
        timestamp: new Date().toISOString()
      });
    });

    // Ping request handler for latency measurement
    socket.on('ping-request', ({ to }, callback) => {
      logger.debug('Ping request', { from: socket.id, to });
      
      // Send ping to target user
      io.to(to).emit('ping', { from: socket.id }, () => {
        // When target responds, callback to original sender
        if (callback) callback({ success: true });
      });
    });

    // Ping response handler
    socket.on('ping-response', ({ to }) => {
      logger.debug('Ping response', { from: socket.id, to });
      io.to(to).emit('ping-response', { from: socket.id });
    });

    // Server ping handler (for self ping measurement)
    socket.on('ping-server', (data, callback) => {
      logger.debug('Server ping', { from: socket.id });
      // Immediately respond to measure round-trip time
      if (callback) callback({ success: true });
    });

    // Media status update handler
    socket.on('media-status-update', async ({ roomCode, isCameraOn, isMicOn, isScreenSharing }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.debug('Media status update', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          isCameraOn,
          isMicOn,
          isScreenSharing
        });
        
        const session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (session) {
          await session.updateParticipantMediaStatus(socket.id, { isCameraOn, isMicOn, isScreenSharing });
          
          // Broadcast status update to all users in the room
          io.to(normalizedRoomCode).emit('user-media-status-changed', {
            socketId: socket.id,
            isCameraOn,
            isMicOn,
            isScreenSharing
          });
          
          logger.debug('Media status updated and broadcast', { 
            socketId: socket.id,
            isCameraOn,
            isMicOn,
            isScreenSharing
          });
        }
      } catch (err) {
        logger.error('Media status update error:', err);
      }
    });

    // Screen share start - create dummy participant
    socket.on('start-screen-share', async ({ roomCode, userInfo }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Screen share started', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          userName: userInfo.name
        });
        
        const session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (session) {
          // Create screen share socket ID (append -screen to original socket ID)
          const screenSocketId = `${socket.id}-screen`;
          
          // Add screen share as a dummy participant
          await session.addParticipant({
            userId: userInfo.userId,
            socketId: screenSocketId,
            name: `${userInfo.name}'s Screen`,
            username: userInfo.username,
            profilePic: userInfo.profilePic || '',
            isCameraOn: false,
            isMicOn: false,
            isScreenSharing: true
          });
          
          // Broadcast to all users (including sender) that screen share started
          io.to(normalizedRoomCode).emit('screen-share-started', {
            socketId: socket.id,
            screenSocketId: screenSocketId,
            userInfo: {
              userId: userInfo.userId,
              name: `${userInfo.name}'s Screen`,
              username: userInfo.username,
              profilePic: userInfo.profilePic || ''
            }
          });
          
          logger.info('Screen share participant added and broadcast', { 
            socketId: socket.id,
            screenSocketId,
            roomCode: normalizedRoomCode,
            userInfo: {
              name: `${userInfo.name}'s Screen`
            }
          });
        }
      } catch (err) {
        logger.error('Start screen share error:', err);
      }
    });

    // Screen share stop - remove dummy participant
    socket.on('stop-screen-share', async ({ roomCode }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Screen share stopped', { 
          from: socket.id, 
          roomCode: normalizedRoomCode
        });
        
        const session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (session) {
          const screenSocketId = `${socket.id}-screen`;
          
          // Remove screen share dummy participant
          await session.removeParticipant(screenSocketId);
          
          // Broadcast to all users (including sender) that screen share stopped
          io.to(normalizedRoomCode).emit('screen-share-stopped', {
            socketId: socket.id,
            screenSocketId: screenSocketId
          });
          
          logger.info('Screen share participant removed and broadcast', { 
            socketId: socket.id,
            screenSocketId,
            roomCode: normalizedRoomCode
          });
        }
      } catch (err) {
        logger.error('Stop screen share error:', err);
      }
    });

    socket.on('disconnect', async () => {
      logger.info('User disconnected', { socketId: socket.id });
      
      try {
        const { userInfo, roomCode } = socket;
        
        if (roomCode) {
          const session = await Session.findOne({ meetingCode: roomCode });
          
          if (session) {
            // Remove the user's participant
            await session.removeParticipant(socket.id);
            
            // Also remove their screen share dummy if it exists
            const screenSocketId = `${socket.id}-screen`;
            await session.removeParticipant(screenSocketId);
            
            logger.info('Participant and screen share removed from session', { 
              socketId: socket.id,
              screenSocketId,
              roomCode,
              remainingParticipants: session.participants.length 
            });
            
            // Notify others that user left
            socket.to(roomCode).emit('user-left', {
              socketId: socket.id,
              userInfo: userInfo
            });
            
            // Notify others that screen share stopped (if it was active)
            socket.to(roomCode).emit('screen-share-stopped', {
              socketId: socket.id,
              screenSocketId: screenSocketId
            });
            
            // Don't delete session immediately - keep it for reconnection
            if (session.participants.length === 0) {
              logger.info('Session now empty, but keeping for potential reconnection', { roomCode });
            }
          }
        }
      } catch (err) {
        logger.error('Disconnect handler error:', err);
      }
    });
  });

  // Cleanup inactive sessions every 5 minutes
  setInterval(async () => {
    try {
      // Delete sessions that have been empty for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = await Session.deleteMany({
        participants: { $size: 0 },
        status: 'active',
        updatedAt: { $lt: fiveMinutesAgo }
      });
      
      if (result.deletedCount > 0) {
        logger.info('Cleaned up empty sessions', { count: result.deletedCount });
      }
    } catch (err) {
      logger.error('Session cleanup error:', err);
    }
  }, 5 * 60 * 1000); // 5 minutes
};

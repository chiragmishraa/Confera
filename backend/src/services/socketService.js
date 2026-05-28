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

        // Add participant using atomic update to avoid schema validation on stale slide data
        const participantData = {
          userId: userInfo.userId,
          socketId: socket.id,
          name: userInfo.name,
          username: userInfo.username,
          profilePic: userInfo.profilePic || '',
          isCameraOn: false,
          isMicOn: false,
          isScreenSharing: false,
          isActive: true,
          joinedAt: new Date()
        };

        // Remove any existing entry for this socketId first, then add fresh
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          { $pull: { participants: { socketId: socket.id } } },
          { new: false }
        );
        session = await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          {
            $push: { participants: participantData },
            $addToSet: { 'slides.$[mainRoom].participants': socket.id }
          },
          {
            new: true,
            arrayFilters: [{ 'mainRoom.id': 'main-room' }]
          }
        );

        // If no main-room slide exists yet, initialize slides and add participant
        if (!session.slides || session.slides.length === 0) {
          session = await Session.findOneAndUpdate(
            { meetingCode: normalizedRoomCode },
            { $set: { slides: [{ id: 'main-room', name: 'Main Room', participants: [socket.id] }] } },
            { new: true }
          );
        }

        // Track in joinedUsers if not already there
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode, 'joinedUsers.userId': { $ne: userInfo.userId } },
          { $push: { joinedUsers: { userId: userInfo.userId, joinedAt: new Date() } } }
        );

        logger.info('User joined room', { 
          socketId: socket.id, 
          roomCode, 
          userName: userInfo.name 
        });

        // Send slides data to the joining user
        socket.emit('slides-data', { slides: session ? session.slides : [] });

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

    // Server ping handler (for self ping measurement)
    socket.on('ping-server', (data, callback) => {
      logger.debug('Server ping', { from: socket.id });
      // Immediately respond to measure round-trip time
      if (callback) callback({ success: true });
    });

    // Broadcast ping to all users in room
    socket.on('broadcast-ping', ({ roomCode, ping }) => {
      logger.debug('Broadcasting ping', { from: socket.id, roomCode, ping });
      // Broadcast to all users in the room except sender
      socket.to(roomCode).emit('user-ping-update', {
        socketId: socket.id,
        ping: ping
      });
    });

    // Remove participant (host only)
    socket.on('remove-participant', async ({ roomCode, socketId, hostId }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Remove participant request', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          targetSocketId: socketId,
          hostId
        });
        
        const session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (!session) {
          logger.error('Session not found for remove participant');
          return;
        }
        
        // Verify requester is the host
        if (session.hostId.toString() !== hostId.toString()) {
          logger.warn('Non-host attempted to remove participant', { 
            requesterId: hostId,
            actualHostId: session.hostId 
          });
          return;
        }
        
        // Remove participant from session (atomic to avoid VersionError)
        const screenSocketId = `${socketId}-screen`;
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          {
            $pull: {
              participants: { socketId: { $in: [socketId, screenSocketId] } },
              'slides.$[].participants': { $in: [socketId, screenSocketId] }
            }
          }
        );
        
        // Notify the removed user
        io.to(socketId).emit('removed-from-meeting', {
          message: 'You have been removed from the meeting by the host'
        });
        
        // Notify all other participants
        socket.to(normalizedRoomCode).emit('participant-removed', {
          socketId: socketId
        });
        
        logger.info('Participant removed successfully', { 
          socketId,
          roomCode: normalizedRoomCode
        });
      } catch (err) {
        logger.error('Remove participant error:', err);
      }
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
        
        // Atomic update for media status - avoids full document save
        const updateFields = {};
        if (isCameraOn !== undefined) updateFields['participants.$.isCameraOn'] = isCameraOn;
        if (isMicOn !== undefined) updateFields['participants.$.isMicOn'] = isMicOn;
        if (isScreenSharing !== undefined) updateFields['participants.$.isScreenSharing'] = isScreenSharing;

        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode, 'participants.socketId': socket.id },
          { $set: updateFields }
        );
          
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
      } catch (err) {
        logger.error('Media status update error:', err);
      }
    });

    // Speaking status changed - broadcast to other users
    socket.on('speaking-status-changed', ({ roomCode, isSpeaking }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.debug('Speaking status update', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          isSpeaking
        });
        
        // Broadcast to all users in the room (including sender for consistency)
        io.to(normalizedRoomCode).emit('user-speaking-status-changed', {
          socketId: socket.id,
          isSpeaking
        });
        
        logger.debug('Speaking status broadcast', { 
          socketId: socket.id,
          isSpeaking
        });
      } catch (err) {
        logger.error('Speaking status update error:', err);
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
        
        const screenSocketId = `${socket.id}-screen`;
        const screenParticipant = {
          userId: userInfo.userId,
          socketId: screenSocketId,
          name: `${userInfo.name}'s Screen`,
          username: userInfo.username,
          profilePic: userInfo.profilePic || '',
          isCameraOn: false,
          isMicOn: false,
          isScreenSharing: true,
          isActive: true,
          joinedAt: new Date()
        };

        // Atomic add - remove any stale entry first, then push
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          { $pull: { participants: { socketId: screenSocketId } } }
        );
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          { $push: { participants: screenParticipant } }
        );
          
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
        
        const screenSocketId = `${socket.id}-screen`;
        
        // Atomic remove - no full document save needed
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          {
            $pull: {
              participants: { socketId: screenSocketId },
              'slides.$[].participants': screenSocketId
            }
          }
        );
        
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
      } catch (err) {
        logger.error('Stop screen share error:', err);
      }
    });

    // Slide management socket events
    socket.on('create-slide', async ({ roomCode, name, userId }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Create slide request', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          name
        });
        
        const slideId = `slide-${Date.now()}`;
        const updated = await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          { $push: { slides: { id: slideId, name, participants: [] } } },
          { new: true }
        );
        
        if (updated) {
          io.to(normalizedRoomCode).emit('slide-created', { slides: updated.slides });
          logger.info('Slide created and broadcast', { roomCode: normalizedRoomCode, slideName: name });
        }
      } catch (err) {
        logger.error('Create slide error:', err);
        socket.emit('error', { message: 'Failed to create slide' });
      }
    });

    socket.on('rename-slide', async ({ roomCode, slideId, name }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Rename slide request', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          slideId,
          name
        });
        
        const updated = await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode, 'slides.id': slideId },
          { $set: { 'slides.$.name': name } },
          { new: true }
        );
        
        if (updated) {
          io.to(normalizedRoomCode).emit('slide-renamed', { slides: updated.slides });
          logger.info('Slide renamed and broadcast', { roomCode: normalizedRoomCode, slideId, newName: name });
        }
      } catch (err) {
        logger.error('Rename slide error:', err);
        socket.emit('error', { message: err.message || 'Failed to rename slide' });
      }
    });

    socket.on('delete-slide', async ({ roomCode, slideId }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Delete slide request', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          slideId
        });
        
        // Get slide participants before deleting
        const session = await Session.findOne({ meetingCode: normalizedRoomCode }, { slides: 1 });
        const slideToDelete = session && session.slides.find(s => s.id === slideId);
        const participantsToMove = slideToDelete ? [...slideToDelete.participants] : [];

        const updated = await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode },
          { $pull: { slides: { id: slideId } } },
          { new: true }
        );
        
        if (updated) {
          io.to(normalizedRoomCode).emit('slide-deleted', {
            slides: updated.slides,
            deletedSlideId: slideId,
            movedParticipants: participantsToMove
          });
          logger.info('Slide deleted and broadcast', { roomCode: normalizedRoomCode, slideId });
        }
      } catch (err) {
        logger.error('Delete slide error:', err);
        socket.emit('error', { message: err.message || 'Failed to delete slide' });
      }
    });

    socket.on('move-to-slide', async ({ roomCode, slideId }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();
        
        logger.info('Move to slide request', { 
          from: socket.id, 
          roomCode: normalizedRoomCode,
          slideId
        });
        
        const session = await Session.findOne({ meetingCode: normalizedRoomCode });
        
        if (session) {
          const targetSlide = session.slides.find(s => s.id === slideId);
          if (!targetSlide) {
            socket.emit('error', { message: 'Slide not found' });
            return;
          }
          
          // Get existing users in target slide (exclude screen shares and self)
          const existingUsersInSlide = session.participants
            .filter(p => 
              targetSlide.participants.includes(p.socketId) && 
              p.socketId !== socket.id && 
              !p.socketId.endsWith('-screen') &&
              p.isActive
            )
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
          
          // Atomically remove from all slides, then add to target
          await Session.findOneAndUpdate(
            { meetingCode: normalizedRoomCode },
            { $pull: { 'slides.$[].participants': socket.id } }
          );
          const updated = await Session.findOneAndUpdate(
            { meetingCode: normalizedRoomCode, 'slides.id': slideId },
            { $addToSet: { 'slides.$.participants': socket.id } },
            { new: true }
          );
          
          // Send confirmation to the moving user with existing users
          socket.emit('moved-to-slide', {
            slideId,
            slideName: targetSlide.name,
            existingUsers: existingUsersInSlide
          });
          
          // Broadcast to all users in the room
          io.to(normalizedRoomCode).emit('user-moved-slide', {
            socketId: socket.id,
            slideId,
            slides: updated ? updated.slides : session.slides
          });
          
          logger.info('User moved to slide and broadcast', { 
            socketId: socket.id,
            roomCode: normalizedRoomCode,
            slideId,
            slideName: targetSlide.name,
            existingUsersCount: existingUsersInSlide.length
          });
        }
      } catch (err) {
        logger.error('Move to slide error:', err);
        socket.emit('error', { message: err.message || 'Failed to move to slide' });
      }
    });

    // Update user info (name, profilePic) in real-time
    socket.on('update-user-info', async ({ roomCode, name, profilePic }) => {
      try {
        const normalizedRoomCode = roomCode?.toUpperCase();

        logger.info('User info update', {
          from: socket.id,
          roomCode: normalizedRoomCode,
          name
        });

        // Update participant record in DB
        await Session.findOneAndUpdate(
          { meetingCode: normalizedRoomCode, 'participants.socketId': socket.id },
          {
            $set: {
              'participants.$.name': name,
              'participants.$.profilePic': profilePic || ''
            }
          }
        );

        // Broadcast to everyone in the room (including sender so their own UI updates)
        io.to(normalizedRoomCode).emit('user-info-updated', {
          socketId: socket.id,
          name,
          profilePic: profilePic || ''
        });

        logger.info('User info updated and broadcast', {
          socketId: socket.id,
          roomCode: normalizedRoomCode,
          name
        });
      } catch (err) {
        logger.error('Update user info error:', err);
      }
    });

    socket.on('disconnect', async () => {
      logger.info('User disconnected', { socketId: socket.id });
      
      try {
        const { userInfo, roomCode } = socket;
        
        if (roomCode) {
          const screenSocketId = `${socket.id}-screen`;

          // Use atomic update to avoid VersionError and stale schema validation
          const updated = await Session.findOneAndUpdate(
            { meetingCode: roomCode },
            {
              $pull: {
                participants: { socketId: { $in: [socket.id, screenSocketId] } },
                'slides.$[].participants': { $in: [socket.id, screenSocketId] }
              }
            },
            { new: true }
          );
            
            logger.info('Participant and screen share removed from session', { 
              socketId: socket.id,
              screenSocketId,
              roomCode,
              remainingParticipants: updated ? updated.participants.length : 0
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
            if (updated && updated.participants.length === 0) {
              logger.info('Session now empty, but keeping for potential reconnection', { roomCode });
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
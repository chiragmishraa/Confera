const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  socketId: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  profilePic: { 
    type: String, 
    default: '' 
  },
  isCameraOn: {
    type: Boolean,
    default: false
  },
  isMicOn: {
    type: Boolean,
    default: false
  },
  isScreenSharing: {
    type: Boolean,
    default: false
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  meetingCode: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  hostName: { 
    type: String, 
    required: true 
  },
  participants: [participantSchema],
  // Track all users who have ever joined this session
  joinedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance (timestamps:true already creates createdAt and updatedAt)
sessionSchema.index({ hostId: 1 });
sessionSchema.index({ status: 1 });

// Virtual for participant count
sessionSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Method to add participant
sessionSchema.methods.addParticipant = function(participantData) {
  // Find by socketId instead of userId to allow multiple participants per user
  // (e.g., real user + screen share dummy)
  const existingIndex = this.participants.findIndex(
    p => p.socketId === participantData.socketId
  );

  if (existingIndex !== -1) {
    // Update existing participant
    this.participants[existingIndex] = {
      ...this.participants[existingIndex],
      ...participantData,
      isActive: true
    };
  } else {
    // Add new participant
    this.participants.push(participantData);
  }

  // Track user in joinedUsers if not already tracked (only for real users, not screen dummies)
  if (!participantData.socketId.endsWith('-screen')) {
    const hasJoined = this.joinedUsers.some(
      u => u.userId.toString() === participantData.userId.toString()
    );
    
    if (!hasJoined) {
      this.joinedUsers.push({
        userId: participantData.userId,
        joinedAt: new Date()
      });
    }
  }

  return this.save();
};

// Method to remove participant
sessionSchema.methods.removeParticipant = function(socketId) {
  this.participants = this.participants.filter(
    p => p.socketId !== socketId
  );
  return this.save();
};

// Method to update participant media status
sessionSchema.methods.updateParticipantMediaStatus = function(socketId, { isCameraOn, isMicOn, isScreenSharing }) {
  const participant = this.participants.find(p => p.socketId === socketId);
  if (participant) {
    if (isCameraOn !== undefined) participant.isCameraOn = isCameraOn;
    if (isMicOn !== undefined) participant.isMicOn = isMicOn;
    if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to end session
sessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.endedAt = Date.now();
  return this.save();
};

// Static method to find active sessions
sessionSchema.statics.findActiveSessions = function() {
  return this.find({ status: 'active' });
};

// Static method to cleanup inactive participants
sessionSchema.statics.cleanupInactiveSessions = async function() {
  const result = await this.deleteMany({
    participants: { $size: 0 },
    status: 'active'
  });
  return result.deletedCount;
};

module.exports = mongoose.model('Session', sessionSchema);

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
  password: {
    type: String,
    default: null
  },
  isLocked: {
    type: Boolean,
    default: false
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
  // Slides for organizing participants into different rooms
  slides: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    participants: [{
      type: String // Socket IDs of participants in this slide
    }]
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

  // Initialize slides if not present (default: Main Room)
  if (!this.slides || this.slides.length === 0) {
    this.slides = [{
      id: 'main-room',
      name: 'Main Room',
      participants: []
    }];
  }

  // Add participant to Main Room slide by default (only real users, not screen dummies)
  if (!participantData.socketId.endsWith('-screen')) {
    const mainRoom = this.slides.find(s => s.id === 'main-room');
    if (mainRoom && !mainRoom.participants.includes(participantData.socketId)) {
      mainRoom.participants.push(participantData.socketId);
    }
  }

  return this.save();
};

// Method to remove participant
sessionSchema.methods.removeParticipant = function(socketId) {
  this.participants = this.participants.filter(
    p => p.socketId !== socketId
  );
  
  // Remove from all slides
  if (this.slides) {
    this.slides.forEach(slide => {
      slide.participants = slide.participants.filter(p => p !== socketId);
    });
  }
  
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

// Method to set/update password
sessionSchema.methods.setPassword = function(password) {
  this.password = password;
  this.isLocked = !!password;
  return this.save();
};

// Method to verify password
sessionSchema.methods.verifyPassword = function(password) {
  if (!this.isLocked || !this.password) {
    return true; // No password set
  }
  return this.password === password;
};

// Method to remove password
sessionSchema.methods.removePassword = function() {
  this.password = null;
  this.isLocked = false;
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

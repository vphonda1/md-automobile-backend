const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true }, // general, sales, service, accounts, manager, dm-xxx-yyy
  
  // Sender
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderPhoto: String,
  
  // Content
  type: { type: String, default: 'text' }, // text, image, video, voice, document, location, system
  text: String,
  mediaUrl: String,
  mediaType: String, // mime type
  mediaSize: Number,
  fileName: String,
  duration: Number, // for voice/video
  
  // Location
  latitude: Number,
  longitude: Number,
  locationName: String,
  
  // Reply/Forward
  replyTo: {
    messageId: String,
    senderName: String,
    text: String,
    type: String
  },
  forwardedFrom: String,
  
  // Status
  edited: { type: Boolean, default: false },
  editedAt: Date,
  deleted: { type: Boolean, default: false },
  
  // Engagement
  starred: { type: Boolean, default: false },
  starredBy: [String],
  readBy: [{ userId: String, readAt: Date }],
  deliveredTo: [String],
  
  // Reactions
  reactions: [{ userId: String, emoji: String, at: Date }],
  
  createdAt: { type: Date, default: Date.now, index: true }
});

MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ text: 'text' });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);

const mongoose = require('mongoose');

const ChatGroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  description: String,
  icon: String,
  members: [{
    userId: { type: String, required: true },
    userName: String,
    role: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  admins: [String],  // userIds with admin rights in this group
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

ChatGroupSchema.index({ 'members.userId': 1 });

module.exports = mongoose.models.ChatGroup || mongoose.model('ChatGroup', ChatGroupSchema);

const mongoose = require('mongoose');

const FollowupSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  mobileNo: { type: String, required: true, index: true },
  
  followupType: { type: String, default: 'lead' }, // lead, post-sale, service, complaint
  source: String, // walk-in, online, referral, call
  interestedModel: String,
  
  // Schedule
  followupDate: { type: String, required: true, index: true },
  followupTime: String,
  
  // Interaction
  contactMode: { type: String, default: 'call' }, // call, whatsapp, visit, email
  notes: String,
  outcome: String, // interested, not-interested, callback, converted, dropped
  nextActionDate: String,
  
  // Status
  status: { type: String, default: 'open' }, // open, in-progress, closed, converted
  priority: { type: String, default: 'normal' },
  
  assignedTo: String,
  convertedToInvoice: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FollowupSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Followup || mongoose.model('Followup', FollowupSchema);

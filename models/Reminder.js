const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, default: 'general' }, // service, battery-check, payment, emi, followup, general
  
  // Related entities
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  mobileNo: { type: String, index: true },
  chassisNo: String,
  vehicleModel: String,
  
  // Schedule
  dueDate: { type: String, required: true, index: true },
  dueTime: String,
  
  // Status
  status: { type: String, default: 'pending' }, // pending, sent, completed, dismissed
  priority: { type: String, default: 'normal' }, // low, normal, high, urgent
  
  // Notification tracking
  notifiedAt: String,
  whatsappSent: { type: Boolean, default: false },
  pushSent: { type: Boolean, default: false },
  
  // Repeat
  isRecurring: { type: Boolean, default: false },
  recurringInterval: String, // monthly, quarterly, yearly
  
  assignedTo: String, // staffId
  notes: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ReminderSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);

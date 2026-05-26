const mongoose = require('mongoose');

const TestRideSchema = new mongoose.Schema({
  // Customer
  customerName: { type: String, required: true },
  mobileNo: { type: String, required: true, index: true },
  email: String,
  drivingLicense: String,

  // Vehicle
  vehicleModel: { type: String, required: true },
  preferredVariant: String,
  preferredColor: String,

  // Schedule
  scheduledDate: { type: String, required: true, index: true },
  scheduledTime: { type: String, default: '11:00' },
  duration: { type: Number, default: 30 }, // minutes

  // Source
  source: { type: String, default: 'walk-in' }, // walk-in, online, referral, call

  // Status
  status: { type: String, default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled', 'no-show', 'converted'] },
  
  // Post-ride feedback
  rideFeedback: String,
  rating: { type: Number, min: 1, max: 5 },
  customerInterested: Boolean,
  followupNeeded: { type: Boolean, default: true },

  // Conversion tracking
  convertedToInvoice: String, // if customer bought
  convertedAt: String,

  assignedStaff: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TestRideSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.TestRide || mongoose.model('TestRide', TestRideSchema);

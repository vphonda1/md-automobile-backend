const mongoose = require('mongoose');

const ServiceAppointmentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  mobileNo: { type: String, required: true, index: true },

  vehicleModel: String,
  chassisNo: String,
  batteryNumber: String,
  currentKm: Number,

  // Schedule
  appointmentDate: { type: String, required: true, index: true },
  appointmentTime: { type: String, default: '10:00' },

  // Type of service
  serviceType: { type: String, enum: ['free-1', 'free-2', 'free-3', 'paid', 'warranty', 'breakdown', 'battery-check'], default: 'paid' },
  issuesReported: [String],
  customerComplaint: String,

  // Status workflow
  status: { type: String, default: 'scheduled', enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'] },
  
  // Live tracking
  vehicleReceived: Boolean,
  receivedAt: String,
  technician: String,
  estimatedCompletion: String,
  customerNotified: { type: Boolean, default: false },
  readyForPickup: { type: Boolean, default: false },
  deliveredAt: String,

  // Linked job card
  jobCardNumber: String,

  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ServiceAppointmentSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.ServiceAppointment || mongoose.model('ServiceAppointment', ServiceAppointmentSchema);

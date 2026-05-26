const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  staffId: { type: String, required: true, index: true },
  staffName: String,
  date: { type: String, required: true, index: true }, // YYYY-MM-DD

  checkIn: { type: String }, // ISO datetime
  checkInLat: Number,
  checkInLng: Number,
  checkInAddress: String,

  checkOut: { type: String },
  checkOutLat: Number,
  checkOutLng: Number,
  checkOutAddress: String,

  workHours: { type: Number, default: 0 },
  status: { type: String, default: 'present' }, // present, absent, half-day, leave, holiday
  leaveType: String, // sick, casual, paid
  notes: String,

  createdAt: { type: Date, default: Date.now }
});

AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

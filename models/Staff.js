const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  staffId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  mobileNo: { type: String, required: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  role: { type: String, default: 'sales' }, // owner, manager, sales, service, accounts, technician
  designation: String,

  // Personal
  fatherName: String,
  address: String,
  city: String,
  pincode: String,
  dob: String,
  aadhar: String,
  pan: String,
  bloodGroup: String,
  emergencyContact: String,

  // Employment
  joiningDate: String,
  baseSalary: { type: Number, default: 0 },
  commissionPercent: { type: Number, default: 0 },
  bankAccount: String,
  bankName: String,
  ifscCode: String,

  // Access
  loginEmail: { type: String, trim: true },
  loginPassword: String, // TODO: hash with bcrypt in production
  isActive: { type: Boolean, default: true },
  permissions: [String], // ['dashboard', 'customers', 'invoices', ...]

  photo: String, // base64 or URL
  notes: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

StaffSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);

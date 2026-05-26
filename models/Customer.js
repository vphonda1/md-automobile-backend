const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  // Personal
  customerName: { type: String, required: true, trim: true },
  mobileNo: { type: String, required: true, index: true, trim: true },
  alternateMobile: { type: String, trim: true },
  fatherName: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, default: 'Bhopal' },
  pincode: { type: String, trim: true },
  aadhar: { type: String, trim: true },
  pan: { type: String, trim: true },
  dob: { type: String, trim: true }, // ISO YYYY-MM-DD
  email: { type: String, trim: true, lowercase: true },

  // Vehicle reference
  vehicleModel: { type: String, trim: true },
  chassisNo: { type: String, trim: true, index: true },
  color: { type: String, trim: true },

  // MD Automobile-specific (NEW)
  batteryNumber: { type: String, trim: true },
  motorNumber: { type: String, trim: true },
  batteryWarrantyDate: { type: String, trim: true }, // 1 year from purchase
  motorWarrantyDate: { type: String, trim: true },   // 1 year from purchase
  controllerWarrantyDate: { type: String, trim: true }, // 1 year from purchase

  // Sales
  invoiceDate: { type: String, trim: true },
  invoiceNumber: { type: String, trim: true },
  onRoadPrice: { type: Number, default: 0 },
  fameSubsidy: { type: Number, default: 0 },
  stateSubsidy: { type: Number, default: 0 },
  finalPaidPrice: { type: Number, default: 0 },

  // Optional (Electric vehicles - registration not mandatory below 25kmph)
  registrationNo: { type: String, trim: true, default: '' },
  insuranceDate: { type: String, trim: true, default: '' },
  insuranceCompany: { type: String, trim: true, default: '' },

  // Finance
  financeCompany: { type: String, trim: true, default: '' },
  loanAmount: { type: Number, default: 0 },
  emiAmount: { type: Number, default: 0 },
  emiStartDate: { type: String, trim: true, default: '' },

  // Tracking
  source: { type: String, default: 'walk-in' }, // walk-in, online, referral
  status: { type: String, default: 'active' }, // active, inactive

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CustomerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

CustomerSchema.index({ customerName: 'text', mobileNo: 'text', chassisNo: 'text' });

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

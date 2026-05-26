const mongoose = require('mongoose');

const JobCardSchema = new mongoose.Schema({
  jobCardNumber: { type: String, required: true, unique: true, index: true },
  jobCardDate: { type: String, required: true },
  serviceType: { type: String, default: 'paid' }, // free, paid, warranty
  serviceNumber: { type: Number, default: 1 }, // 1st, 2nd, 3rd free service

  // Customer & vehicle
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  vehicleModel: String,
  chassisNo: { type: String, index: true },
  batteryNumber: String,
  motorNumber: String,
  currentKm: { type: Number, default: 0 },

  // Service details (electric-specific)
  serviceItems: [{
    item: String,         // e.g., "Battery health check", "Motor inspection", "Brake check"
    description: String,
    cost: { type: Number, default: 0 }
  }],

  // Battery diagnostics
  batteryHealthBefore: { type: Number, default: 100 },
  batteryHealthAfter: { type: Number, default: 100 },
  chargeCycles: { type: Number, default: 0 },

  // Parts used
  partsUsed: [{
    partNumber: String,
    partName: String,
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  }],

  // Pricing
  labourCharges: { type: Number, default: 0 },
  partsTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },

  // Status
  status: { type: String, default: 'open' }, // open, in-progress, completed, delivered
  assignedTechnician: String,
  customerComplaint: String,
  workDone: String,
  recommendations: String,
  nextServiceDue: String, // date or km

  deliveryDate: String,
  customerSignature: String,
  invoiceGenerated: { type: Boolean, default: false },
  linkedInvoiceNumber: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

JobCardSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.JobCard || mongoose.model('JobCard', JobCardSchema);

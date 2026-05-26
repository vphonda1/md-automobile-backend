const mongoose = require('mongoose');

const WarrantyReplacementSchema = new mongoose.Schema({
  // Customer & Vehicle reference
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: String,
  mobileNo: { type: String, index: true },
  chassisNo: { type: String, index: true },
  vehicleModel: String,

  // What was replaced
  component: { type: String, required: true, enum: ['battery', 'motor', 'controller', 'charger', 'other'], index: true },
  componentName: String, // free text if 'other'

  // Old item details
  oldSerialNumber: String,
  oldInstallDate: String,        // when was the OLD one installed/given
  oldAgeInDays: Number,          // age at time of replacement

  // New item details
  newSerialNumber: { type: String, required: true },
  replacementDate: { type: String, required: true, index: true }, // when NEW one installed
  newWarrantyTill: String,       // typically replacementDate + 1 year

  // Why & how
  reason: { type: String, enum: ['warranty-claim', 'damage', 'upgrade', 'recall', 'wear-out', 'other'], default: 'warranty-claim' },
  reasonDetails: String,
  underWarranty: { type: Boolean, default: true },
  cost: { type: Number, default: 0 }, // 0 if covered under warranty

  // Service info
  jobCardNumber: String,
  technician: String,
  approvedBy: String,
  
  // Documents
  photoBefore: String,           // base64 or URL
  photoAfter: String,
  invoiceUrl: String,

  notes: String,

  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

WarrantyReplacementSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
WarrantyReplacementSchema.index({ chassisNo: 1, component: 1, replacementDate: -1 });

module.exports = mongoose.models.WarrantyReplacement || mongoose.model('WarrantyReplacement', WarrantyReplacementSchema);

const mongoose = require('mongoose');

const QuotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true, unique: true, index: true },
  quotationDate: { type: String, required: true },
  validTill: { type: String },

  // Customer
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  email: String,
  address: String,

  // Vehicle
  vehicleModel: { type: String, required: true },
  variant: String,
  color: String,

  // Pricing breakdown
  exShowroomPrice: { type: Number, default: 0 },
  accessories: { type: Number, default: 0 },
  extendedWarranty: { type: Number, default: 0 },

  // Subsidies (MD Automobile-specific)
  fameSubsidy: { type: Number, default: 0 },
  stateSubsidy: { type: Number, default: 0 },
  totalSubsidy: { type: Number, default: 0 },

  // Optional charges (RTO/Insurance not mandatory but available)
  registrationCharges: { type: Number, default: 0 },
  insurancePremium: { type: Number, default: 0 },

  onRoadPrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 }, // after subsidy

  // Finance offer
  downPayment: { type: Number, default: 0 },
  loanAmount: { type: Number, default: 0 },
  tenureMonths: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0 },
  emiAmount: { type: Number, default: 0 },

  status: { type: String, default: 'open' }, // open, converted, expired, cancelled
  convertedToInvoice: String, // invoice number if converted
  notes: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

QuotationSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);

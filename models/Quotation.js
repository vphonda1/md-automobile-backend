const mongoose = require('mongoose');

const QuotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true, unique: true, index: true },
  quotationDate: { type: String, required: true },
  validTill: String,

  // Customer
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  email: String,
  address: String,
  hypothecation: String,        // ← Bank/Financer
  customerGstin: String,        // ← Customer GSTIN

  // Vehicle
  vehicleModel: String,
  variant: String,
  color: String,

  // Pricing — MD Automobile uses simple "price" field
  price: { type: Number, default: 0 },              // ex-showroom price
  exShowroomPrice: { type: Number, default: 0 },    // alias for older quotations
  accessories: { type: Number, default: 0 },
  extendedWarranty: { type: Number, default: 0 },

  // Warranties (text — "1 Year", "2 Years", etc.)
  batteryWarranty: { type: String, default: '1 Year' },
  motorWarranty: { type: String, default: '1 Year' },
  controllerWarranty: { type: String, default: '1 Year' },
  chargerWarranty: { type: String, default: '1 Year' },

  // Subsidies
  fameSubsidy: { type: Number, default: 0 },
  stateSubsidy: { type: Number, default: 0 },
  totalSubsidy: { type: Number, default: 0 },

  // Other charges (kept for legacy, not used in new MD format)
  rto: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  registrationCharges: { type: Number, default: 0 },
  insurancePremium: { type: Number, default: 0 },

  // Finance
  downPayment: { type: Number, default: 0 },
  loanAmount: { type: Number, default: 0 },
  tenureMonths: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0 },
  emiAmount: { type: Number, default: 0 },

  // Totals
  onRoadPrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },   // ← MD Automobile primary total

  status: { type: String, default: 'open' },
  convertedToInvoice: String,
  notes: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });  // ← allow extra fields for forward-compatibility

QuotationSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);

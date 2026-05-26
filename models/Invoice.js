const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: String,
  hsn: String,
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 5 }, // EV typically 5%
  gstAmount: { type: Number, default: 0 }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  invoiceDate: { type: String, required: true },
  invoiceType: { type: String, default: 'sale' }, // sale, service, parts

  // Customer
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  customerAddress: String,
  customerAadhar: String,
  customerPan: String,
  customerGSTIN: String,

  // Vehicle (if sale)
  vehicleModel: String,
  chassisNo: { type: String, index: true },
  engineNo: String,
  batteryNumber: String,
  motorNumber: String,
  color: String,

  // Line items
  items: [InvoiceItemSchema],

  // Pricing
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },

  // MD Automobile-specific subsidies
  fameSubsidy: { type: Number, default: 0 },
  stateSubsidy: { type: Number, default: 0 },
  totalSubsidy: { type: Number, default: 0 },
  finalPayable: { type: Number, default: 0 },

  // Payment
  paymentMode: { type: String, default: 'cash' }, // cash, upi, card, finance, cheque
  paymentStatus: { type: String, default: 'paid' }, // paid, pending, partial
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },

  // Finance
  financeCompany: { type: String, default: '' },
  loanAmount: { type: Number, default: 0 },
  downPayment: { type: Number, default: 0 },

  // Business info (MD Automobile)
  sellerGSTIN: { type: String, default: '' }, // TODO: add MD Automobile GSTIN
  sellerName: { type: String, default: 'MD Automobile' },

  notes: String,
  pdfUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

InvoiceSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

const mongoose = require('mongoose');

const PaymentReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true, index: true },
  receiptDate: { type: String, required: true },

  // Customer
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  vehicleModel: String,

  // Payment classification
  paymentType: { type: String, enum: ['emi', 'downpayment', 'other'], default: 'emi' },

  // If paymentType === 'emi' — link back to the EMI + which installment
  emiId: { type: mongoose.Schema.Types.ObjectId, ref: 'Emi' },
  installmentIndex: Number,      // 0-based index in the schedule
  installmentLabel: String,      // e.g. "3/12" or "March 2026"
  installmentDueDate: String,

  // Amount + method
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'cash' },  // cash, upi, bank-transfer, cheque
  notes: String,

  receivedBy: String,   // staff name who collected

  createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.models.PaymentReceipt || mongoose.model('PaymentReceipt', PaymentReceiptSchema);

const mongoose = require('mongoose');

const CustomerDueSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  vehicleModel: String,

  dueType: { type: String, enum: ['downpayment', 'credit', 'other'], default: 'other' },
  description: String,          // e.g. "Down payment shortfall", "Udhaari for accessories"

  totalAmount: { type: Number, required: true },   // original amount owed
  paidAmount: { type: Number, default: 0 },         // cumulative paid so far
  balanceAmount: { type: Number, required: true },  // remaining (auto-computed)

  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },

  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    method: String,
    notes: String,
    receiptNumber: String
  }],

  notes: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

CustomerDueSchema.pre('save', function(next) {
  this.balanceAmount = Math.max(0, (this.totalAmount || 0) - (this.paidAmount || 0));
  if (this.balanceAmount <= 0) this.status = 'paid';
  else if (this.paidAmount > 0) this.status = 'partial';
  else this.status = 'pending';
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.CustomerDue || mongoose.model('CustomerDue', CustomerDueSchema);

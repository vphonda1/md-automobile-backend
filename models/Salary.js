const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  staffId: { type: String, required: true, index: true },
  staffName: String,
  month: { type: String, required: true }, // YYYY-MM
  
  baseSalary: { type: Number, default: 0 },
  daysWorked: { type: Number, default: 0 },
  daysAbsent: { type: Number, default: 0 },
  
  allowances: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  
  deductions: { type: Number, default: 0 },
  advance: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  esi: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  
  paymentStatus: { type: String, default: 'pending' }, // pending, paid
  paymentDate: String,
  paymentMode: String,
  transactionId: String,
  notes: String,
  
  createdAt: { type: Date, default: Date.now }
});

SalarySchema.index({ staffId: 1, month: 1 }, { unique: true });

module.exports = mongoose.models.Salary || mongoose.model('Salary', SalarySchema);

// Backend route: /api/emis — EMI/Loan tracking
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// ── Schema (flexible with strict:false) ──
const emiSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerPhone: String,
  mobile: String,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  vehicleModel: String,
  chassisNo: String,

  loanAmount: { type: Number, default: 0 },
  emiAmount: { type: Number, required: true },
  emiDay: { type: Number, required: true, min: 1, max: 31 },
  tenure: { type: Number, default: 12 },

  startDate: Date,
  endDate: Date,
  paidEmis: { type: Number, default: 0 },
  totalEmis: { type: Number, default: 12 },
  remainingAmount: Number,

  status: { type: String, enum: ['active', 'completed', 'defaulted', 'cancelled'], default: 'active' },
  notes: String,

  paymentHistory: [{
    paidDate: Date,
    amount: Number,
    method: String,
    notes: String
  }]
}, { timestamps: true, strict: false });

const Emi = mongoose.models.Emi || mongoose.model('Emi', emiSchema);

// ── GET all EMIs ──
router.get('/', async (req, res) => {
  try {
    const { status, customerId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    const emis = await Emi.find(query).sort({ emiDay: 1, createdAt: -1 });
    res.json(emis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single EMI ──
router.get('/:id', async (req, res) => {
  try {
    const emi = await Emi.findById(req.params.id);
    if (!emi) return res.status(404).json({ error: 'EMI not found' });
    res.json(emi);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE EMI ──
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    // Auto-calculate end date if not provided
    if (data.startDate && data.tenure && !data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(data.tenure));
      data.endDate = end;
    }
    // Auto-calculate totalEmis
    if (!data.totalEmis && data.tenure) data.totalEmis = Number(data.tenure);
    // Auto-calculate remainingAmount
    if (!data.remainingAmount && data.loanAmount) {
      data.remainingAmount = Number(data.loanAmount) - (Number(data.paidEmis || 0) * Number(data.emiAmount || 0));
    }
    const emi = await Emi.create(data);
    res.status(201).json(emi);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── UPDATE EMI ──
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    // Recalculate end date if changes
    if (data.startDate && data.tenure) {
      const start = new Date(data.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(data.tenure));
      data.endDate = end;
    }
    const emi = await Emi.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!emi) return res.status(404).json({ error: 'EMI not found' });
    res.json(emi);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Record a payment ──
router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, method = 'cash', notes = '' } = req.body;
    const emi = await Emi.findById(req.params.id);
    if (!emi) return res.status(404).json({ error: 'EMI not found' });
    emi.paymentHistory = emi.paymentHistory || [];
    emi.paymentHistory.push({ paidDate: new Date(), amount: Number(amount), method, notes });
    emi.paidEmis = (emi.paidEmis || 0) + 1;
    emi.remainingAmount = Math.max(0, (emi.remainingAmount || emi.loanAmount || 0) - Number(amount));
    if (emi.paidEmis >= (emi.totalEmis || emi.tenure)) emi.status = 'completed';
    await emi.save();
    res.json(emi);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE EMI ──
router.delete('/:id', async (req, res) => {
  try {
    const emi = await Emi.findByIdAndDelete(req.params.id);
    if (!emi) return res.status(404).json({ error: 'EMI not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stats endpoint ──
router.get('/stats/summary', async (req, res) => {
  try {
    const all = await Emi.find();
    const active = all.filter(e => e.status === 'active');
    const totalMonthlyCollection = active.reduce((s, e) => s + (Number(e.emiAmount) || 0), 0);
    const totalOutstanding = active.reduce((s, e) => s + (Number(e.remainingAmount) || 0), 0);
    res.json({
      totalActive: active.length,
      totalCompleted: all.filter(e => e.status === 'completed').length,
      totalDefaulted: all.filter(e => e.status === 'defaulted').length,
      monthlyCollection: totalMonthlyCollection,
      totalOutstanding
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

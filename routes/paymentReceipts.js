// /api/payment-receipts — Received Payment tracking (EMI installments + Down Payments)
const express = require('express');
const router = express.Router();
const PaymentReceipt = require('../models/PaymentReceipt');

// GET all receipts (with search/filter)
router.get('/', async (req, res) => {
  try {
    const { search, customerId, paymentType } = req.query;
    let query = {};
    if (customerId) query.customerId = customerId;
    if (paymentType) query.paymentType = paymentType;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } }
      ];
    }
    const items = await PaymentReceipt.find(query).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET next receipt number
router.get('/util/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await PaymentReceipt.countDocuments({ receiptNumber: new RegExp(`^MD-R/${year}/`) });
    const next = `MD-R/${year}/${String(count + 1).padStart(4, '0')}`;
    res.json({ receiptNumber: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single receipt
router.get('/:id', async (req, res) => {
  try {
    const item = await PaymentReceipt.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE receipt (and if linked to an EMI installment, mark that EMI installment paid)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.receiptNumber) {
      const year = new Date().getFullYear();
      const count = await PaymentReceipt.countDocuments({ receiptNumber: new RegExp(`^MD-R/${year}/`) });
      data.receiptNumber = `MD-R/${year}/${String(count + 1).padStart(4, '0')}`;
    }
    const receipt = await PaymentReceipt.create(data);

    // If this receipt is for an EMI installment, mark the EMI as paid one more installment
    if (data.paymentType === 'emi' && data.emiId) {
      try {
        const Emi = require('mongoose').model('Emi'); // registered in routes/emis.js
        const emi = await Emi.findById(data.emiId);
        if (emi) {
          emi.paymentHistory = emi.paymentHistory || [];
          emi.paymentHistory.push({ paidDate: new Date(), amount: Number(data.amount), method: data.paymentMethod, notes: data.notes });
          emi.paidEmis = (emi.paidEmis || 0) + 1;
          emi.remainingAmount = Math.max(0, (emi.remainingAmount || emi.loanAmount || 0) - Number(data.amount));
          if (emi.paidEmis >= (emi.totalEmis || emi.tenure)) emi.status = 'completed';
          await emi.save();
        }
      } catch (linkErr) {
        console.warn('[paymentReceipts] Could not auto-mark EMI paid:', linkErr.message);
      }
    }

    res.status(201).json(receipt);
  } catch (err) {
    console.error('[paymentReceipts POST]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// DELETE receipt
router.delete('/:id', async (req, res) => {
  try {
    const result = await PaymentReceipt.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

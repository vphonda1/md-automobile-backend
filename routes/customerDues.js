// /api/customer-dues — Customer Udhaari / Credit Ledger tracking
const express = require('express');
const router = express.Router();
const CustomerDue = require('../models/CustomerDue');

// LIST (with search, filter by customerId, status)
router.get('/', async (req, res) => {
  try {
    const { search, customerId, status } = req.query;
    let query = {};
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } }
      ];
    }
    const items = await CustomerDue.find(query).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const item = await CustomerDue.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new due entry
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.customerName || !data.totalAmount) {
      return res.status(400).json({ error: 'customerName और totalAmount ज़रूरी हैं' });
    }
    data.balanceAmount = Number(data.totalAmount) - Number(data.paidAmount || 0);
    const item = await CustomerDue.create(data);
    res.status(201).json(item);
  } catch (err) {
    console.error('[customerDues POST]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// RECORD a partial/full payment against a due
router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, method, notes, receiptNumber } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Amount ज़रूरी है' });

    const item = await CustomerDue.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    item.paymentHistory = item.paymentHistory || [];
    item.paymentHistory.push({ amount: Number(amount), date: new Date(), method: method || 'cash', notes, receiptNumber });
    item.paidAmount = (item.paidAmount || 0) + Number(amount);
    // balanceAmount + status auto-computed in pre-save hook
    await item.save();

    res.json(item);
  } catch (err) {
    console.error('[customerDues PAY]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// UPDATE due entry (edit description/totalAmount etc)
router.put('/:id', async (req, res) => {
  try {
    const item = await CustomerDue.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await CustomerDue.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

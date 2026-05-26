const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET all customers (with optional search/filter)
router.get('/', async (req, res) => {
  try {
    const { search, limit = 1000, skip = 0 } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') },
        { chassisNo: new RegExp(search, 'i') }
      ];
    }
    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - create customer
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT - update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true, deleted: customer._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sync - bulk sync from localStorage (VP Honda pattern)
router.post('/sync', async (req, res) => {
  try {
    const { customers = [] } = req.body;
    let added = 0, updated = 0;

    for (const c of customers) {
      const existing = await Customer.findOne({ mobileNo: c.mobileNo });
      if (existing) {
        await Customer.findByIdAndUpdate(existing._id, { ...c, updatedAt: new Date() });
        updated++;
      } else {
        await new Customer(c).save();
        added++;
      }
    }
    res.json({ success: true, added, updated, total: customers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /lookup/:mobile - find by mobile (for cross-page lookups)
router.get('/lookup/:mobile', async (req, res) => {
  try {
    const customer = await Customer.findOne({ mobileNo: req.params.mobile });
    if (!customer) return res.status(404).json({ error: 'Not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

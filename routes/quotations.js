const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');

router.get('/', async (req, res) => {
  try {
    const { search, status, limit = 1000 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { quotationNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') }
      ];
    }
    const items = await Quotation.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Quotation.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    data.totalSubsidy = (Number(data.fameSubsidy) || 0) + (Number(data.stateSubsidy) || 0);
    if (!data.finalPrice) data.finalPrice = (Number(data.onRoadPrice) || 0) - data.totalSubsidy;
    const item = new Quotation(data);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Quotation.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Quotation.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Next quotation number
router.get('/util/next-number', async (req, res) => {
  try {
    const last = await Quotation.findOne().sort({ createdAt: -1 });
    const year = new Date().getFullYear();
    let next = 1;
    if (last && last.quotationNumber) {
      const m = last.quotationNumber.match(/(\d+)$/);
      if (m) next = parseInt(m[1]) + 1;
    }
    res.json({ quotationNumber: `MD-Q/${year}/${String(next).padStart(4, '0')}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

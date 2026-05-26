const express = require('express');
const router = express.Router();
const TestRide = require('../models/TestRide');

router.get('/', async (req, res) => {
  try {
    const { status, fromDate, toDate, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) query.scheduledDate.$gte = fromDate;
      if (toDate) query.scheduledDate.$lte = toDate;
    }
    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') },
        { vehicleModel: new RegExp(search, 'i') }
      ];
    }
    const items = await TestRide.find(query).sort({ scheduledDate: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new TestRide(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await TestRide.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await TestRide.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

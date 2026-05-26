const express = require('express');
const router = express.Router();
const JobCard = require('../models/JobCard');

router.get('/', async (req, res) => {
  try {
    const { search, status, fromDate, toDate, limit = 1000 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { jobCardNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { chassisNo: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') }
      ];
    }
    if (fromDate || toDate) {
      query.jobCardDate = {};
      if (fromDate) query.jobCardDate.$gte = fromDate;
      if (toDate) query.jobCardDate.$lte = toDate;
    }
    const items = await JobCard.find(query).sort({ jobCardDate: -1 }).limit(parseInt(limit));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await JobCard.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new JobCard(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await JobCard.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await JobCard.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/util/next-number', async (req, res) => {
  try {
    const last = await JobCard.findOne().sort({ createdAt: -1 });
    const year = new Date().getFullYear();
    let next = 1;
    if (last && last.jobCardNumber) {
      const m = last.jobCardNumber.match(/(\d+)$/);
      if (m) next = parseInt(m[1]) + 1;
    }
    res.json({ jobCardNumber: `MD-JC/${year}/${String(next).padStart(4, '0')}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

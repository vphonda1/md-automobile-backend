const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');

router.get('/', async (req, res) => {
  try {
    const { status, type, fromDate, toDate, upcoming } = req.query;
    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
      query.dueDate = { $gte: today, $lte: nextMonth.toISOString().split('T')[0] };
    }
    if (fromDate || toDate) {
      query.dueDate = query.dueDate || {};
      if (fromDate) query.dueDate.$gte = fromDate;
      if (toDate) query.dueDate.$lte = toDate;
    }
    const items = await Reminder.find(query).sort({ dueDate: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new Reminder(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Reminder.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Reminder.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/dismiss', async (req, res) => {
  try {
    const item = await Reminder.findByIdAndUpdate(req.params.id, { status: 'dismissed' }, { new: true });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

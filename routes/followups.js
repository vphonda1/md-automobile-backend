const express = require('express');
const router = express.Router();
const Followup = require('../models/Followup');

router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (type) query.followupType = type;
    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') }
      ];
    }
    const items = await Followup.find(query).sort({ followupDate: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new Followup(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Followup.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Followup.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

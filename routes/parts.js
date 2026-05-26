const express = require('express');
const router = express.Router();
const Part = require('../models/Part');

router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { partName: new RegExp(search, 'i') },
        { partNumber: new RegExp(search, 'i') }
      ];
    }
    if (category) query.category = category;
    if (lowStock === 'true') query.$expr = { $lte: ['$stockQuantity', '$minStockLevel'] };

    const parts = await Part.find(query).sort({ partName: 1 });
    res.json(parts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Not found' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const part = new Part(req.body);
    await part.save();
    res.status(201).json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!part) return res.status(404).json({ error: 'Not found' });
    res.json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Part.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock
router.post('/:id/adjust-stock', async (req, res) => {
  try {
    const { delta, reason } = req.body;
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Not found' });
    part.stockQuantity += Number(delta);
    if (part.stockQuantity < 0) part.stockQuantity = 0;
    await part.save();
    res.json({ success: true, part, reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

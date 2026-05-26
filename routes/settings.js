const express = require('express');
const router = express.Router();
const AppSettings = require('../models/AppSettings');

router.get('/', async (req, res) => {
  try {
    const settings = await AppSettings.find();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:key', async (req, res) => {
  try {
    const s = await AppSettings.findOne({ key: req.params.key });
    res.json(s || { key: req.params.key, value: null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { key, value, category, updatedBy } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });
    const result = await AppSettings.findOneAndUpdate(
      { key },
      { key, value, category: category || 'general', updatedBy, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk', async (req, res) => {
  try {
    const { settings = {}, updatedBy } = req.body;
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const r = await AppSettings.findOneAndUpdate(
        { key },
        { key, value, updatedBy, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      results.push(r);
    }
    res.json({ success: true, count: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

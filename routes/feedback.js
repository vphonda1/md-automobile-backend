const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

router.get('/', async (req, res) => {
  try {
    const { status, feedbackType, minRating, maxRating } = req.query;
    let query = {};
    if (status) query.status = status;
    if (feedbackType) query.feedbackType = feedbackType;
    if (minRating || maxRating) {
      query.overallRating = {};
      if (minRating) query.overallRating.$gte = Number(minRating);
      if (maxRating) query.overallRating.$lte = Number(maxRating);
    }
    const items = await Feedback.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new Feedback(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Feedback.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats endpoint for dashboard
router.get('/stats/summary', async (req, res) => {
  try {
    const all = await Feedback.find();
    const total = all.length;
    if (total === 0) return res.json({ total: 0, average: 0, nps: 0, distribution: {} });

    const avg = all.reduce((s, f) => s + (f.overallRating || 0), 0) / total;
    const promoters = all.filter(f => (f.wouldRecommend || 0) >= 9).length;
    const detractors = all.filter(f => (f.wouldRecommend || 0) <= 6).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    all.forEach(f => { if (f.overallRating) distribution[f.overallRating] = (distribution[f.overallRating] || 0) + 1; });

    res.json({ total, average: avg.toFixed(2), nps, distribution });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

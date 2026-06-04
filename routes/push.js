// /api/push — Web Push notification subscriptions
const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');

// Subscribe a device
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, userId, userName, device } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    // Upsert by endpoint (so re-subscribe doesn't duplicate)
    const updated = await PushSubscription.findOneAndUpdate(
      { 'subscription.endpoint': subscription.endpoint },
      {
        userId, userName, subscription, device,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, id: updated._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unsubscribe a device
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    const result = await PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all subscriptions (admin)
router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await PushSubscription.find().sort({ updatedAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a test push to a user
router.post('/test', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.app.locals.sendPush) return res.status(500).json({ error: 'sendPush not configured' });
    const result = await req.app.locals.sendPush(userId, {
      title: '🔔 Test Notification',
      body: 'यह एक test push notification है — MD Automobile',
      icon: '/icons/icon-192.png'
    });
    res.json({ success: true, sent: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanup stale subscriptions older than 30 days
router.post('/cleanup', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await PushSubscription.deleteMany({ updatedAt: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

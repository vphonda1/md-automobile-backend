const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET messages for a room
router.get('/:room', async (req, res) => {
  try {
    const { limit = 200, before } = req.query;
    let query = { room: req.params.room, deleted: { $ne: true } };
    if (before) query.createdAt = { $lt: new Date(before) };
    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(messages.reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST a new message
router.post('/:room', async (req, res) => {
  try {
    const data = { ...req.body, room: req.params.room };
    const message = new Message(data);
    await message.save();

    // Send push notification to room participants (handled via app.locals.sendPush)
    if (req.app.locals.sendPush) {
      req.app.locals.sendPush(null, {
        title: `${data.senderName} (${req.params.room})`,
        body: data.type === 'text' ? data.text : `Sent a ${data.type}`,
        icon: '/icons/icon-192.png',
        data: { room: req.params.room, messageId: message._id }
      });
    }

    res.status(201).json(message);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Edit message
router.patch('/:room/:id/edit', async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { text, edited: true, editedAt: new Date() },
      { new: true }
    );
    res.json(message);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Delete message (soft delete)
router.delete('/:room/:id', async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { deleted: true, text: 'This message was deleted' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Star/unstar
router.patch('/:room/:id/star', async (req, res) => {
  try {
    const { userId, starred } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Not found' });
    
    if (starred) {
      if (!message.starredBy.includes(userId)) message.starredBy.push(userId);
    } else {
      message.starredBy = message.starredBy.filter(u => u !== userId);
    }
    message.starred = message.starredBy.length > 0;
    await message.save();
    res.json(message);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Mark as read
router.patch('/:room/:id/read', async (req, res) => {
  try {
    const { userId } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Not found' });
    
    if (!message.readBy.find(r => r.userId === userId)) {
      message.readBy.push({ userId, readAt: new Date() });
      await message.save();
    }
    res.json(message);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// React to message
router.patch('/:room/:id/react', async (req, res) => {
  try {
    const { userId, emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Not found' });
    
    message.reactions = message.reactions.filter(r => r.userId !== userId);
    if (emoji) message.reactions.push({ userId, emoji, at: new Date() });
    await message.save();
    res.json(message);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Search across all rooms
router.get('/search/global', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const messages = await Message.find({
      text: new RegExp(q, 'i'),
      deleted: { $ne: true }
    }).sort({ createdAt: -1 }).limit(50);
    res.json(messages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Unread counts for a user
router.get('/unread/:userId', async (req, res) => {
  try {
    const rooms = ['general', 'sales', 'service', 'accounts', 'manager'];
    const counts = {};
    for (const room of rooms) {
      counts[room] = await Message.countDocuments({
        room,
        'readBy.userId': { $ne: req.params.userId },
        senderId: { $ne: req.params.userId },
        deleted: { $ne: true }
      });
    }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

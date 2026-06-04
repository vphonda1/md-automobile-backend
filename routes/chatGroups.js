// /api/chat-groups — Chat group / room membership management
const express = require('express');
const router = express.Router();
const ChatGroup = require('../models/ChatGroup');

const DEFAULT_GROUPS = [
  { groupId: 'general',  label: 'General',  icon: '📢', description: 'सब के लिए' },
  { groupId: 'sales',    label: 'Sales',    icon: '💼', description: 'Sales team' },
  { groupId: 'service',  label: 'Service',  icon: '🔧', description: 'Service technicians' },
  { groupId: 'accounts', label: 'Accounts', icon: '💰', description: 'Accounts team' },
  { groupId: 'manager',  label: 'Manager',  icon: '👔', description: 'Managers only' }
];

// Auto-create default groups if not exist
async function ensureDefaultGroups() {
  for (const g of DEFAULT_GROUPS) {
    await ChatGroup.findOneAndUpdate(
      { groupId: g.groupId },
      { $setOnInsert: { ...g, members: [], admins: [], createdAt: new Date() } },
      { upsert: true, new: true }
    );
  }
}
ensureDefaultGroups().catch(err => console.warn('Default groups init failed:', err.message));

// GET all groups
router.get('/', async (req, res) => {
  try {
    await ensureDefaultGroups();
    const groups = await ChatGroup.find().sort({ groupId: 1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single group with members
router.get('/:groupId', async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET groups a user belongs to
router.get('/user/:userId', async (req, res) => {
  try {
    await ensureDefaultGroups();
    const groups = await ChatGroup.find({ 'members.userId': req.params.userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a new group
router.post('/', async (req, res) => {
  try {
    const { groupId, label, description, icon, createdBy } = req.body;
    if (!groupId || !label) return res.status(400).json({ error: 'groupId and label required' });
    const exists = await ChatGroup.findOne({ groupId });
    if (exists) return res.status(409).json({ error: 'Group already exists' });
    const group = await ChatGroup.create({
      groupId, label, description: description || '', icon: icon || '💬',
      members: [], admins: createdBy ? [createdBy] : [], createdBy,
      createdAt: new Date(), updatedAt: new Date()
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE group info (label, description, icon)
router.put('/:groupId', async (req, res) => {
  try {
    const { label, description, icon } = req.body;
    const update = { updatedAt: new Date() };
    if (label !== undefined) update.label = label;
    if (description !== undefined) update.description = description;
    if (icon !== undefined) update.icon = icon;
    const group = await ChatGroup.findOneAndUpdate({ groupId: req.params.groupId }, update, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a group (custom groups only — default ones can't be deleted)
router.delete('/:groupId', async (req, res) => {
  try {
    const defaultIds = DEFAULT_GROUPS.map(g => g.groupId);
    if (defaultIds.includes(req.params.groupId)) {
      return res.status(403).json({ error: 'Default groups को delete नहीं कर सकते' });
    }
    const result = await ChatGroup.deleteOne({ groupId: req.params.groupId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Group not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a member to group
router.post('/:groupId/members', async (req, res) => {
  try {
    const { userId, userName, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const group = await ChatGroup.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Prevent duplicate
    const exists = group.members.find(m => m.userId === userId);
    if (exists) return res.status(409).json({ error: 'Member पहले से मौजूद है' });

    group.members.push({
      userId, userName: userName || 'Unknown',
      role: role || 'staff',
      joinedAt: new Date()
    });
    group.updatedAt = new Date();
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// REMOVE a member from group
router.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const before = group.members.length;
    group.members = group.members.filter(m => m.userId !== req.params.userId);
    if (group.members.length === before) return res.status(404).json({ error: 'Member not in group' });
    group.admins = group.admins.filter(id => id !== req.params.userId);
    group.updatedAt = new Date();
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// BULK: add multiple members at once
router.post('/:groupId/members/bulk', async (req, res) => {
  try {
    const { members } = req.body;  // [{ userId, userName, role }, ...]
    if (!Array.isArray(members)) return res.status(400).json({ error: 'members array required' });
    const group = await ChatGroup.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    let added = 0;
    for (const m of members) {
      if (!m.userId) continue;
      if (group.members.find(x => x.userId === m.userId)) continue;
      group.members.push({
        userId: m.userId,
        userName: m.userName || 'Unknown',
        role: m.role || 'staff',
        joinedAt: new Date()
      });
      added++;
    }
    group.updatedAt = new Date();
    await group.save();
    res.json({ added, group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// MAKE admin / REMOVE admin
router.patch('/:groupId/admins/:userId', async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const group = await ChatGroup.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (isAdmin) {
      if (!group.admins.includes(req.params.userId)) group.admins.push(req.params.userId);
    } else {
      group.admins = group.admins.filter(id => id !== req.params.userId);
    }
    group.updatedAt = new Date();
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

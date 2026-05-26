const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');

router.get('/', async (req, res) => {
  try {
    const { active, role } = req.query;
    let query = {};
    if (active !== undefined) query.isActive = active === 'true';
    if (role) query.role = role;
    const items = await Staff.find(query).sort({ name: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Staff.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new Staff(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Staff.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Staff.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Login endpoint (basic - upgrade to bcrypt+JWT in production)
router.post('/login', async (req, res) => {
  try {
    const { email, mobile, password } = req.body;
    const query = email ? { loginEmail: email } : { mobileNo: mobile };
    const staff = await Staff.findOne(query);
    if (!staff) return res.status(404).json({ error: 'User not found' });
    if (!staff.isActive) return res.status(403).json({ error: 'Account inactive' });
    if (staff.loginPassword !== password) return res.status(401).json({ error: 'Invalid password' });

    const { loginPassword, ...safeStaff } = staff.toObject();
    res.json({ success: true, user: safeStaff });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

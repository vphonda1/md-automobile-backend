const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');

// POST /api/auth/login — works for both email and mobile
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Username और password ज़रूरी हैं' });

    const isEmail = String(identifier).includes('@');
    const query = isEmail
      ? { loginEmail: identifier.toLowerCase().trim() }
      : { $or: [{ mobileNo: identifier }, { staffId: identifier }] };

    const staff = await Staff.findOne(query);
    if (!staff) return res.status(404).json({ error: 'User not found' });
    if (!staff.isActive) return res.status(403).json({ error: 'Account inactive — admin से contact करें' });
    if (staff.loginPassword !== password) return res.status(401).json({ error: 'गलत password' });

    const { loginPassword, ...safe } = staff.toObject();
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-admin — checks if password matches ANY admin/owner
router.post('/verify-admin', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const admins = await Staff.find({
      role: { $in: ['owner', 'admin', 'manager'] },
      isActive: true
    });

    const match = admins.find(a => a.loginPassword === password);
    if (!match) return res.status(401).json({ valid: false, error: 'Invalid admin password' });

    res.json({ valid: true, adminName: match.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password — user changes their own password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) return res.status(400).json({ error: 'सभी fields ज़रूरी हैं' });
    if (newPassword.length < 4) return res.status(400).json({ error: 'Password कम से कम 4 characters का हो' });

    const staff = await Staff.findById(userId);
    if (!staff) return res.status(404).json({ error: 'User not found' });
    if (staff.loginPassword !== oldPassword) return res.status(401).json({ error: 'पुराना password गलत है' });

    staff.loginPassword = newPassword;
    await staff.save();
    res.json({ success: true, message: 'Password change ho gaya' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password — admin resets someone else's password
router.post('/reset-password', async (req, res) => {
  try {
    const { adminPassword, targetUserId, newPassword } = req.body;
    if (!adminPassword || !targetUserId || !newPassword) return res.status(400).json({ error: 'All fields required' });

    const admins = await Staff.find({ role: { $in: ['owner', 'admin'] }, isActive: true });
    const isAdmin = admins.some(a => a.loginPassword === adminPassword);
    if (!isAdmin) return res.status(403).json({ error: 'गलत admin password' });

    const target = await Staff.findById(targetUserId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.loginPassword = newPassword;
    await target.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/seed-admin — one-time setup to create default admin if no users exist
router.get('/seed-admin', async (req, res) => {
  try {
    const count = await Staff.countDocuments();
    if (count > 0) return res.json({ message: 'Users already exist, skipped seeding', count });

    const admin = new Staff({
      staffId: 'MD001',
      name: 'Admin',
      mobileNo: '0000000000',
      email: 'admin@mdautomobile.com',
      role: 'owner',
      designation: 'Owner',
      loginEmail: 'admin',
      loginPassword: 'admin123',
      isActive: true,
      baseSalary: 0
    });
    await admin.save();
    res.json({
      success: true,
      message: 'Default admin created',
      credentials: { username: 'admin', password: 'admin123' },
      warning: 'Login करके तुरंत password change करें!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

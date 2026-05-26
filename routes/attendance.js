const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

router.get('/', async (req, res) => {
  try {
    const { staffId, fromDate, toDate, date } = req.query;
    let query = {};
    if (staffId) query.staffId = staffId;
    if (date) query.date = date;
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }
    const items = await Attendance.find(query).sort({ date: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/checkin', async (req, res) => {
  try {
    const { staffId, staffName, lat, lng, address } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    let attendance = await Attendance.findOne({ staffId, date: today });
    if (attendance && attendance.checkIn) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    if (!attendance) {
      attendance = new Attendance({ staffId, staffName, date: today });
    }
    attendance.checkIn = new Date().toISOString();
    attendance.checkInLat = lat;
    attendance.checkInLng = lng;
    attendance.checkInAddress = address;
    attendance.status = 'present';
    await attendance.save();
    res.json(attendance);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/checkout', async (req, res) => {
  try {
    const { staffId, lat, lng, address } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findOne({ staffId, date: today });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ error: 'Not checked in yet' });
    }

    attendance.checkOut = new Date().toISOString();
    attendance.checkOutLat = lat;
    attendance.checkOutLng = lng;
    attendance.checkOutAddress = address;
    const hours = (new Date(attendance.checkOut) - new Date(attendance.checkIn)) / 3600000;
    attendance.workHours = Math.round(hours * 100) / 100;
    await attendance.save();
    res.json(attendance);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Attendance.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

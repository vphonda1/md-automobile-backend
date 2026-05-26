const express = require('express');
const router = express.Router();
const ServiceAppointment = require('../models/ServiceAppointment');

router.get('/', async (req, res) => {
  try {
    const { status, fromDate, toDate, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.appointmentDate = {};
      if (fromDate) query.appointmentDate.$gte = fromDate;
      if (toDate) query.appointmentDate.$lte = toDate;
    }
    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') },
        { chassisNo: new RegExp(search, 'i') }
      ];
    }
    const items = await ServiceAppointment.find(query).sort({ appointmentDate: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const item = new ServiceAppointment(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await ServiceAppointment.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await ServiceAppointment.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Update status (workflow tracking)
router.patch('/:id/status', async (req, res) => {
  try {
    const updates = { status: req.body.status, updatedAt: new Date() };
    if (req.body.status === 'in-progress') updates.vehicleReceived = true;
    if (req.body.status === 'in-progress' && !req.body.receivedAt) updates.receivedAt = new Date().toISOString();
    if (req.body.status === 'completed') updates.readyForPickup = true;
    const item = await ServiceAppointment.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

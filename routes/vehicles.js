const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');

router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 2000 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { chassisNo: new RegExp(search, 'i') },
        { vehicleModel: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') }
      ];
    }
    const vehicles = await Vehicle.find(query).sort({ updatedAt: -1 }).limit(parseInt(limit));
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/chassis/:chassisNo', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ chassisNo: req.params.chassisNo });
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { vehicles = [] } = req.body;
    let added = 0, updated = 0;
    for (const v of vehicles) {
      if (!v.chassisNo) continue;
      const existing = await Vehicle.findOne({ chassisNo: v.chassisNo });
      if (existing) {
        await Vehicle.findByIdAndUpdate(existing._id, { ...v, updatedAt: new Date() });
        updated++;
      } else {
        await new Vehicle(v).save();
        added++;
      }
    }
    res.json({ success: true, added, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

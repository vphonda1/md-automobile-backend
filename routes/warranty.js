const express = require('express');
const router = express.Router();
const WarrantyReplacement = require('../models/WarrantyReplacement');

router.get('/', async (req, res) => {
  try {
    const { customerId, chassisNo, mobileNo, component } = req.query;
    let query = {};
    if (customerId) query.customerId = customerId;
    if (chassisNo) query.chassisNo = chassisNo;
    if (mobileNo) query.mobileNo = mobileNo;
    if (component) query.component = component;
    const items = await WarrantyReplacement.find(query).sort({ replacementDate: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await WarrantyReplacement.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    // Auto-calculate old age
    if (data.oldInstallDate && data.replacementDate) {
      const days = Math.floor((new Date(data.replacementDate) - new Date(data.oldInstallDate)) / 86400000);
      data.oldAgeInDays = days;
      data.underWarranty = days <= 365; // 1 year warranty
    }
    // Auto-set new warranty till (1 year)
    if (data.replacementDate && !data.newWarrantyTill) {
      const d = new Date(data.replacementDate);
      d.setFullYear(d.getFullYear() + 1);
      data.newWarrantyTill = d.toISOString().split('T')[0];
    }
    const item = new WarrantyReplacement(data);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await WarrantyReplacement.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await WarrantyReplacement.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Get full history for a vehicle (battery, motor, controller timelines)
router.get('/history/:chassisNo', async (req, res) => {
  try {
    const items = await WarrantyReplacement.find({ chassisNo: req.params.chassisNo }).sort({ replacementDate: 1 });
    const timeline = {
      battery: items.filter(i => i.component === 'battery'),
      motor: items.filter(i => i.component === 'motor'),
      controller: items.filter(i => i.component === 'controller'),
      charger: items.filter(i => i.component === 'charger'),
      other: items.filter(i => i.component === 'other')
    };
    res.json({ chassisNo: req.params.chassisNo, totalReplacements: items.length, timeline });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Salary = require('../models/Salary');

router.get('/', async (req, res) => {
  try {
    const { staffId, month } = req.query;
    let query = {};
    if (staffId) query.staffId = staffId;
    if (month) query.month = month;
    const items = await Salary.find(query).sort({ month: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    // Auto-calc gross & net
    data.grossSalary = (Number(data.baseSalary) || 0) + (Number(data.allowances) || 0) + 
                       (Number(data.bonus) || 0) + (Number(data.commission) || 0) + 
                       (Number(data.overtime) || 0);
    const totalDeductions = (Number(data.deductions) || 0) + (Number(data.advance) || 0) +
                            (Number(data.pf) || 0) + (Number(data.esi) || 0) + (Number(data.tds) || 0);
    data.netSalary = data.grossSalary - totalDeductions;
    
    const item = new Salary(data);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    data.grossSalary = (Number(data.baseSalary) || 0) + (Number(data.allowances) || 0) + 
                       (Number(data.bonus) || 0) + (Number(data.commission) || 0) + 
                       (Number(data.overtime) || 0);
    const totalDeductions = (Number(data.deductions) || 0) + (Number(data.advance) || 0) +
                            (Number(data.pf) || 0) + (Number(data.esi) || 0) + (Number(data.tds) || 0);
    data.netSalary = data.grossSalary - totalDeductions;
    const item = await Salary.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Salary.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

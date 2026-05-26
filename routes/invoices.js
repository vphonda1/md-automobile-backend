const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

router.get('/', async (req, res) => {
  try {
    const { search, fromDate, toDate, limit = 1000 } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { mobileNo: new RegExp(search, 'i') },
        { chassisNo: new RegExp(search, 'i') }
      ];
    }
    if (fromDate || toDate) {
      query.invoiceDate = {};
      if (fromDate) query.invoiceDate.$gte = fromDate;
      if (toDate) query.invoiceDate.$lte = toDate;
    }
    const invoices = await Invoice.find(query).sort({ invoiceDate: -1 }).limit(parseInt(limit));
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;

    // Auto-calc subsidy total + final payable
    data.totalSubsidy = (Number(data.fameSubsidy) || 0) + (Number(data.stateSubsidy) || 0);
    if (!data.finalPayable) {
      data.finalPayable = (Number(data.totalAmount) || 0) - data.totalSubsidy;
    }

    const invoice = new Invoice(data);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    data.totalSubsidy = (Number(data.fameSubsidy) || 0) + (Number(data.stateSubsidy) || 0);
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF parse endpoint (merged from VP Honda lessons - inline in invoices.js)
router.post('/parse-pdf', async (req, res) => {
  try {
    const { pdfText = '' } = req.body;
    // Simple regex parsing - extend as needed
    const result = {
      invoiceNumber: (pdfText.match(/Invoice\s*(?:No|Number)[:\s]+(\S+)/i) || [])[1] || '',
      invoiceDate: (pdfText.match(/Date[:\s]+(\d{2}[/-]\d{2}[/-]\d{4})/i) || [])[1] || '',
      customerName: (pdfText.match(/(?:Customer|Bill\s*To)[:\s]+([^\n]+)/i) || [])[1]?.trim() || '',
      mobileNo: (pdfText.match(/(?:Mobile|Phone|Contact)[:\s]+(\d{10})/i) || [])[1] || '',
      chassisNo: (pdfText.match(/Chassis[:\s]+(\S+)/i) || [])[1] || '',
      batteryNumber: (pdfText.match(/Battery[:\s]+(\S+)/i) || [])[1] || '',
      motorNumber: (pdfText.match(/Motor[:\s]+(\S+)/i) || [])[1] || '',
      vehicleModel: (pdfText.match(/Model[:\s]+([^\n]+)/i) || [])[1]?.trim() || '',
      totalAmount: parseFloat((pdfText.match(/Total[:\s]+₹?\s*([\d,]+\.?\d*)/i) || [])[1]?.replace(/,/g, '') || '0')
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get next invoice number
router.get('/util/next-number', async (req, res) => {
  try {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    const year = new Date().getFullYear();
    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    res.json({ invoiceNumber: `MD/${year}/${String(nextNum).padStart(4, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

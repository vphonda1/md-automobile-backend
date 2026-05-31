// Helper endpoints for invoice auto-fill from customer/vehicle/pricelist data
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const PriceList = require('../models/PriceList');

// GET /api/invoice-helper/customer-full/:mobileNo
// Returns customer + their vehicle + matching price list entry in one go
router.get('/customer-full/:mobileNo', async (req, res) => {
  try {
    const mobile = req.params.mobileNo;
    const customer = await Customer.findOne({ mobileNo: mobile });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Try to find vehicle by chassis if customer has one
    let vehicle = null;
    if (customer.chassisNo) {
      vehicle = await Vehicle.findOne({ chassisNo: customer.chassisNo });
    }

    // Try to find price list entry for this model
    let priceEntry = null;
    if (customer.vehicleModel) {
      priceEntry = await PriceList.findOne({ modelName: customer.vehicleModel.toUpperCase().trim() });
    }

    res.json({ customer, vehicle, priceEntry });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/invoice-helper/price/:modelName/:variant
// Get specific price for model + variant combination
router.get('/price/:modelName/:variant', async (req, res) => {
  try {
    const entry = await PriceList.findOne({ modelName: req.params.modelName.toUpperCase().trim() });
    if (!entry) return res.status(404).json({ error: 'Model price not found' });
    const v = entry.variants.find(x => x.name === req.params.variant);
    if (!v || v.price == null) return res.json({ price: null });
    res.json({ price: v.price, modelName: entry.modelName, variant: req.params.variant });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

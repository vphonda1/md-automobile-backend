// Backend route: /api/admin/* — Diagnostic + Sync helpers
// Ensures data consistency across collections
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// ── GET diagnostic counts ──
router.get('/diagnostic', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = {
      customers: await db.collection('customers').countDocuments(),
      vehicles: await db.collection('vehicles').countDocuments(),
      vehiclesSold: await db.collection('vehicles').countDocuments({ status: 'sold' }),
      vehiclesInStock: await db.collection('vehicles').countDocuments({ status: { $ne: 'sold' } }),
      invoices: await db.collection('invoices').countDocuments(),
      invoicesPaid: await db.collection('invoices').countDocuments({ status: 'paid' }),
      jobcards: await db.collection('jobcards').countDocuments(),
      emis: await db.collection('emis').countDocuments(),
      documents: await db.collection('documents').countDocuments()
    };

    // Check inconsistency
    stats.invoiceVsSoldMismatch = stats.vehiclesSold - stats.invoices;
    stats.needsSync = stats.invoiceVsSoldMismatch > 0;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sync invoices from sold vehicles ──
// For each sold vehicle without an invoice, create one
router.post('/sync-invoices-from-vehicles', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const customersCol = db.collection('customers');
    const vehiclesCol = db.collection('vehicles');
    const invoicesCol = db.collection('invoices');

    const soldVehicles = await vehiclesCol.find({ status: 'sold' }).toArray();
    const stats = { checked: soldVehicles.length, created: 0, alreadyExists: 0, errors: [] };

    let counter = 0;
    for (const veh of soldVehicles) {
      try {
        // Skip if invoice already exists for this chassis
        if (veh.chassisNo) {
          const exists = await invoicesCol.findOne({ chassisNo: veh.chassisNo });
          if (exists) {
            stats.alreadyExists++;
            continue;
          }
        }

        // Fetch customer
        let customer = null;
        if (veh.customerId) {
          try { customer = await customersCol.findOne({ _id: veh.customerId }); }
          catch {}
        }
        if (!customer && veh.customerName) {
          customer = await customersCol.findOne({
            $or: [
              { customerName: veh.customerName },
              { name: veh.customerName }
            ]
          });
        }

        // Generate invoice number
        counter++;
        const now = new Date();
        const fy = now.getMonth() < 3
          ? `${(now.getFullYear() - 1).toString().slice(-2)}-${now.getFullYear().toString().slice(-2)}`
          : `${now.getFullYear().toString().slice(-2)}-${(now.getFullYear() + 1).toString().slice(-2)}`;
        const invNo = `MDA/${fy} ${String(Date.now()).slice(-3)}${counter}`;

        const price = Number(veh.onRoadPrice || veh.exShowroomPrice || 0);

        const invoiceDoc = {
          invoiceNumber: invNo,  // ← required field
          invoiceNo: invNo,
          serialNo: invNo,
          invoiceDate: veh.soldAt || veh.createdAt || new Date(),
          saleDate: veh.soldAt || veh.createdAt || new Date(),

          customerId: veh.customerId || customer?._id || null,
          customerName: veh.customerName || customer?.customerName || customer?.name || 'Unknown',
          customerMobile: customer?.mobile || customer?.mobileNo || null,
          mobile: customer?.mobile || customer?.mobileNo || null,
          customerAddress: customer?.address || null,
          address: customer?.address || null,
          fatherName: customer?.fatherName || null,
          dob: customer?.dob || null,
          district: customer?.district || customer?.city || null,
          state: 'MADHYA PRADESH',
          pincode: customer?.pincode || null,

          vehicleId: veh._id,
          vehicleModel: veh.model || veh.vehicleModel || null,
          model: veh.model || veh.vehicleModel || null,
          vehicleVariant: veh.variant || null,
          variant: veh.variant || null,
          vehicleColor: veh.color || null,
          color: veh.color || null,
          chassisNo: veh.chassisNo || null,
          motorNo: veh.motorNo || null,
          chargerNo: veh.chargerNo || null,
          controllerNo: veh.controllerNo || null,
          keyNo: veh.keyNo || null,
          batteryNumbers: veh.batteryNumbers || [],
          batteryNo: Array.isArray(veh.batteryNumbers) ? veh.batteryNumbers.join(', ') : null,
          volt: veh.variant || null,
          year: veh.manufactureDate ? new Date(veh.manufactureDate).getFullYear() : new Date().getFullYear(),

          price: price,
          netAmount: price,
          grandTotal: price,
          taxableAmount: price / 1.05,
          sgst: (price / 1.05) * 0.025,
          cgst: (price / 1.05) * 0.025,
          exShowroom: price,
          discount: 0,
          paymentMode: 'CASH',
          financerName: 'CASH',
          status: 'paid',
          source: 'auto-sync-from-vehicles',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await invoicesCol.insertOne(invoiceDoc);
        stats.created++;
      } catch (err) {
        stats.errors.push(`${veh.chassisNo || veh._id}: ${err.message}`);
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reset/wipe (admin only - DANGEROUS) ──
router.post('/wipe-imports', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'YES_DELETE_ALL_IMPORTED_DATA') {
      return res.status(400).json({ error: 'Confirmation required' });
    }
    const db = mongoose.connection.db;
    const r1 = await db.collection('customers').deleteMany({ source: 'excel-import' });
    const r2 = await db.collection('vehicles').deleteMany({ source: 'excel-import' });
    const r3 = await db.collection('invoices').deleteMany({ source: { $in: ['excel-import', 'auto-sync-from-vehicles'] } });
    res.json({
      customersDeleted: r1.deletedCount,
      vehiclesDeleted: r2.deletedCount,
      invoicesDeleted: r3.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recompute & update prices on EXISTING invoices ──
// Uses customer+vehicle data to derive correct price
router.post('/recompute-prices', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const customersCol = db.collection('customers');
    const vehiclesCol = db.collection('vehicles');
    const invoicesCol = db.collection('invoices');

    const allInvoices = await invoicesCol.find({}).toArray();
    const stats = { checked: allInvoices.length, updated: 0, skipped: 0, stillZero: [] };

    for (const inv of allInvoices) {
      try {
        // Skip if already has good price
        const currentPrice = Number(inv.netAmount || inv.grandTotal || inv.price || 0);
        if (currentPrice > 0) {
          stats.skipped++;
          continue;
        }

        // Find linked customer & vehicle
        let customer = null;
        if (inv.customerId) {
          try { customer = await customersCol.findOne({ _id: inv.customerId }); }
          catch {}
        }
        if (!customer && inv.customerName) {
          customer = await customersCol.findOne({
            $or: [{ customerName: inv.customerName }, { name: inv.customerName }]
          });
        }

        let vehicle = null;
        if (inv.chassisNo) {
          vehicle = await vehiclesCol.findOne({ chassisNo: inv.chassisNo });
        }

        // Try multiple sources to derive price
        const candidates = [
          Number(vehicle?.onRoadPrice || 0),
          Number(vehicle?.exShowroomPrice || 0),
          Number(vehicle?.salePrice || 0),
          Number(customer?.effectivePrice || 0),
          Number(customer?.totalAmount || 0),
          Number(customer?.saleAmount || 0),
          Number(customer?.netAmount || 0),
          Number(customer?.saleWithAccessories || 0),
          Number(customer?.downPayment || 0) + Number(customer?.disbursed || 0),
          Number(customer?.financierPayment || 0) + Number(customer?.downPayment || 0),
          Number(inv.saleWithAccessories || 0),
          Number(inv.disbursed || 0) + Number(inv.downPayment || 0)
        ];

        const derivedPrice = Math.max(...candidates, 0);

        if (derivedPrice > 0) {
          await invoicesCol.updateOne(
            { _id: inv._id },
            {
              $set: {
                price: derivedPrice,
                netAmount: derivedPrice,
                grandTotal: derivedPrice,
                exShowroom: derivedPrice,
                taxableAmount: derivedPrice / 1.05,
                sgst: (derivedPrice / 1.05) * 0.025,
                cgst: (derivedPrice / 1.05) * 0.025,
                priceRecomputedAt: new Date()
              }
            }
          );
          stats.updated++;
        } else {
          stats.stillZero.push({
            invoiceNo: inv.invoiceNo || inv.invoiceNumber,
            customer: inv.customerName,
            chassis: inv.chassisNo
          });
        }
      } catch (err) {
        // continue
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk update invoice prices (manual entry) ──
// Body: { updates: [{ invoiceId, price }, ...] }
router.post('/bulk-update-prices', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });
    const db = mongoose.connection.db;
    const invoicesCol = db.collection('invoices');
    let updated = 0;
    let errors = [];
    for (const u of updates) {
      if (!u.invoiceId || !u.price) continue;
      const price = Number(u.price);
      if (price <= 0) continue;
      try {
        // Try ObjectId, fallback to string match
        let query;
        try {
          query = { _id: new mongoose.Types.ObjectId(u.invoiceId) };
        } catch {
          query = { _id: u.invoiceId };
        }
        const result = await invoicesCol.updateOne(
          query,
          {
            $set: {
              price, netAmount: price, grandTotal: price, exShowroom: price,
              taxableAmount: price / 1.05,
              sgst: (price / 1.05) * 0.025,
              cgst: (price / 1.05) * 0.025,
              updatedAt: new Date()
            }
          }
        );
        if (result.modifiedCount > 0) updated++;
      } catch (err) {
        errors.push(`${u.invoiceId}: ${err.message}`);
      }
    }
    res.json({ updated, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

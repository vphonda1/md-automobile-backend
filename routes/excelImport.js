// Backend route: /api/excel-import
// Receives parsed rows from Excel, creates/updates Customers, Vehicles, Invoices
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// ────────── Helpers ──────────

const isEmpty = (v) => v == null || v === '' || (typeof v === 'string' && v.trim() === '') || v === 'NaN';

const cleanString = (v) => isEmpty(v) ? null : String(v).trim();

const parseNumber = (v) => {
  if (isEmpty(v)) return 0;
  const n = Number(String(v).replace(/[,₹\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Excel date serial number OR JS date OR string → Date object
const parseDate = (v) => {
  if (isEmpty(v)) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    // Excel serial number (days since 1900-01-01)
    const epoch = new Date(1900, 0, 1);
    epoch.setDate(epoch.getDate() + v - 2);
    return epoch;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// "9039971773/ 9300007963" → ["9039971773", "9300007963"]
const splitMobile = (v) => {
  if (isEmpty(v)) return ['', ''];
  const parts = String(v).split(/[\/,;]/).map(p => p.replace(/\D/g, '').trim()).filter(p => p.length >= 10);
  return [parts[0] || '', parts[1] || ''];
};

// "X25ABC, Y26DEF, Z27GHI" → ["X25ABC", "Y26DEF", "Z27GHI"]
const splitList = (v) => {
  if (isEmpty(v)) return [];
  return String(v).split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
};

// ────────── Main Route ──────────
router.post('/', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array required' });
    }

    const stats = {
      customers: { created: 0, updated: 0 },
      vehicles: { created: 0, updated: 0 },
      invoices: { created: 0 },
      errors: []
    };

    const db = mongoose.connection.db;
    const customersCol = db.collection('customers');
    const vehiclesCol = db.collection('vehicles');
    const invoicesCol = db.collection('invoices');

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      try {
        const customerName = cleanString(r.customerName);
        if (!customerName) {
          stats.errors.push(`Row ${i + 1}: customerName missing`);
          continue;
        }

        const [mobile, altMobile] = splitMobile(r.mobile);
        const aadhar = cleanString(r.aadhar);
        const pan = cleanString(r.pan);
        const chassisNo = cleanString(r.chassisNo);

        // ── 1. CUSTOMER (upsert by mobile or aadhar) ──
        const customerDoc = {
          customerName,
          name: customerName,
          fatherName: cleanString(r.fatherName),
          dob: parseDate(r.dob),
          aadhar: aadhar,
          aadharNo: aadhar,
          pan: pan,
          panNo: pan,
          mobile: mobile || null,
          mobileNo: mobile || null,
          alternateMobile: altMobile || null,
          address: cleanString(r.address),
          district: cleanString(r.district),
          city: cleanString(r.district),
          pincode: cleanString(r.pincode),
          nomineeName: cleanString(r.nomineeName),
          source: 'excel-import',
          updatedAt: new Date()
        };

        const matchQuery = mobile
          ? { $or: [{ mobile }, { mobileNo: mobile }, { aadhar }] }
          : aadhar ? { aadhar } : { customerName };

        const cExists = await customersCol.findOne(matchQuery);
        let customerId;
        if (cExists) {
          await customersCol.updateOne({ _id: cExists._id }, { $set: customerDoc });
          customerId = cExists._id;
          stats.customers.updated++;
        } else {
          customerDoc.createdAt = new Date();
          const ins = await customersCol.insertOne(customerDoc);
          customerId = ins.insertedId;
          stats.customers.created++;
        }

        // ── 2. VEHICLE (upsert by chassisNo) ──
        if (chassisNo) {
          const vehicleDoc = {
            model: cleanString(r.vehicleModel),
            vehicleModel: cleanString(r.vehicleModel),
            color: cleanString(r.color),
            variant: cleanString(r.variant),
            chassisNo,
            motorNo: cleanString(r.motorNo),
            keyNo: cleanString(r.keyNo),
            manufactureDate: parseDate(r.manufactureDate),
            batteryNumbers: splitList(r.batteryNumbers),
            chargerNo: cleanString(r.chargerNo),
            controllerNo: cleanString(r.controllerNo),
            status: 'sold',
            soldAt: parseDate(r.saleDate),
            customerId,
            customerName,
            source: 'excel-import',
            updatedAt: new Date()
          };

          const vExists = await vehiclesCol.findOne({ chassisNo });
          if (vExists) {
            await vehiclesCol.updateOne({ _id: vExists._id }, { $set: vehicleDoc });
            stats.vehicles.updated++;
          } else {
            vehicleDoc.createdAt = new Date();
            await vehiclesCol.insertOne(vehicleDoc);
            stats.vehicles.created++;
          }
        }

        // ── 3. INVOICE (always insert new — represents a sale) ──
        const serialNo = cleanString(r.serialNo);
        const invoiceDoc = {
          invoiceNo: serialNo || `EXCEL/${i + 1}`,
          serialNo,
          saleDate: parseDate(r.saleDate),
          customerId,
          customerName,
          customerMobile: mobile,
          customerAddress: cleanString(r.address),

          vehicleModel: cleanString(r.vehicleModel),
          vehicleColor: cleanString(r.color),
          vehicleVariant: cleanString(r.variant),
          chassisNo,
          motorNo: cleanString(r.motorNo),

          price: parseNumber(r.price),
          accessoriesValue: parseNumber(r.accessoriesValue),
          saleWithAccessories: parseNumber(r.saleWithAccessories),
          helmet: parseNumber(r.helmet),
          netAmount: parseNumber(r.netAmount),
          downPayment: parseNumber(r.downPayment),
          oldVehicleValue: parseNumber(r.oldVehicleValue),
          disbursed: parseNumber(r.disbursed),
          financierPayment: parseNumber(r.financierPayment),
          pendingAmount: parseNumber(r.pendingAmount),
          paymentMode: cleanString(r.paymentMode),
          giftRecord: cleanString(r.giftRecord),

          source: 'excel-import',
          importedAt: new Date(),
          createdAt: new Date()
        };

        // Skip duplicate invoice (by serialNo)
        if (serialNo) {
          const dup = await invoicesCol.findOne({ $or: [{ invoiceNo: serialNo }, { serialNo }] });
          if (dup) {
            await invoicesCol.updateOne({ _id: dup._id }, { $set: invoiceDoc });
          } else {
            await invoicesCol.insertOne(invoiceDoc);
            stats.invoices.created++;
          }
        } else {
          await invoicesCol.insertOne(invoiceDoc);
          stats.invoices.created++;
        }

      } catch (err) {
        stats.errors.push(`Row ${i + 1} (${r.customerName || '?'}): ${err.message}`);
      }
    }

    res.json(stats);
  } catch (err) {
    console.error('[excel-import] Fatal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Excel Import endpoint is live. POST records to import.' });
});

module.exports = router;

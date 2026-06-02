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

// ── Compute effective sale price from multiple Excel columns ──
// Tries netAmount → saleWithAccessories → (price + accessories + helmet) → (downPayment + disbursed) → (financierPayment + downPayment)
function computeEffectivePrice(r) {
  const candidates = [
    parseNumber(r.netAmount),
    parseNumber(r.saleWithAccessories),
    parseNumber(r.downPayment) + parseNumber(r.disbursed),
    parseNumber(r.price) + parseNumber(r.accessoriesValue) + parseNumber(r.helmet),
    parseNumber(r.financierPayment) + parseNumber(r.downPayment),
    parseNumber(r.price)
  ];
  return Math.max(...candidates, 0);
}

// ── Variant-based defaults (range, speed, capacity, warranty) ──
function getVariantDefaults(variant) {
  const v = String(variant || '').toUpperCase().replace(/\s+/g, ' ').trim();
  // 60V 43AH special - higher capacity
  if (v.includes('43AH') || v.includes('60V 43')) {
    return { rangeMin: 80, rangeMax: 90, range: '80-90 km', topSpeed: 35, batteryCapacity: '4.3 kWh', motorPower: '1.2 kW', warrantyMonths: 12 };
  }
  if (v.includes('72')) {
    return { rangeMin: 60, rangeMax: 70, range: '60-70 km', topSpeed: 45, batteryCapacity: '3.6 kWh', motorPower: '1.5 kW', warrantyMonths: 12 };
  }
  if (v.includes('60')) {
    return { rangeMin: 50, rangeMax: 60, range: '50-60 km', topSpeed: 35, batteryCapacity: '3 kWh', motorPower: '1.2 kW', warrantyMonths: 12 };
  }
  if (v.includes('48')) {
    return { rangeMin: 40, rangeMax: 50, range: '40-50 km', topSpeed: 25, batteryCapacity: '2.4 kWh', motorPower: '0.8 kW', warrantyMonths: 12 };
  }
  // Default
  return { rangeMin: 0, rangeMax: 0, range: '', topSpeed: 25, batteryCapacity: '2 kWh', motorPower: '1 kW', warrantyMonths: 12 };
}

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

        // ── Compute effective sale price (used everywhere) ──
        const effectivePrice = computeEffectivePrice(r);

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
          // ─ All amount fields (so we can recover price later) ─
          effectivePrice: effectivePrice,
          totalAmount: effectivePrice,
          saleAmount: effectivePrice,
          netAmount: parseNumber(r.netAmount),
          price: parseNumber(r.price),
          downPayment: parseNumber(r.downPayment),
          disbursed: parseNumber(r.disbursed),
          saleWithAccessories: parseNumber(r.saleWithAccessories),
          accessoriesValue: parseNumber(r.accessoriesValue),
          helmet: parseNumber(r.helmet),
          financierPayment: parseNumber(r.financierPayment),
          pendingAmount: parseNumber(r.pendingAmount),
          paymentMode: cleanString(r.paymentMode) || 'CASH',
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
          const variant = cleanString(r.variant) || '';
          const defaults = getVariantDefaults(variant);
          const mfgDate = parseDate(r.manufactureDate);
          const saleDate = parseDate(r.saleDate);

          // Warranty calculation (1 year from purchase/manufacture date)
          const warrantyStart = saleDate || mfgDate || new Date();
          const warrantyEnd = new Date(warrantyStart);
          warrantyEnd.setMonth(warrantyEnd.getMonth() + defaults.warrantyMonths);

          const vehicleDoc = {
            model: cleanString(r.vehicleModel),
            vehicleModel: cleanString(r.vehicleModel),
            color: cleanString(r.color),
            variant,
            chassisNo,
            motorNo: cleanString(r.motorNo),
            keyNo: cleanString(r.keyNo),
            manufactureDate: mfgDate,
            batteryNumbers: splitList(r.batteryNumbers),
            chargerNo: cleanString(r.chargerNo),
            controllerNo: cleanString(r.controllerNo),
            // ─ Variant-based specs (auto-filled) ─
            range: defaults.range,
            rangeKm: defaults.rangeMax,
            rangeMin: defaults.rangeMin,
            rangeMax: defaults.rangeMax,
            topSpeed: defaults.topSpeed,
            batteryCapacity: defaults.batteryCapacity,
            motorPower: defaults.motorPower,
            // ─ Pricing (uses computed effective price) ─
            exShowroomPrice: effectivePrice || parseNumber(r.price),
            onRoadPrice: effectivePrice || parseNumber(r.netAmount) || parseNumber(r.price),
            salePrice: effectivePrice,
            // ─ Warranty (1 year on battery/charger/controller/motor) ─
            batteryWarrantyEnd: warrantyEnd,
            chargerWarrantyEnd: warrantyEnd,
            controllerWarrantyEnd: warrantyEnd,
            motorWarrantyEnd: warrantyEnd,
            warrantyMonths: defaults.warrantyMonths,
            // ─ Status ─
            status: 'sold',
            soldAt: saleDate,
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
        const invNo = serialNo || `EXCEL/${i + 1}`;
        const invoiceDoc = {
          invoiceNumber: invNo,  // ← required by backend Invoice model
          invoiceNo: invNo,
          serialNo: invNo,
          invoiceDate: parseDate(r.saleDate),
          saleDate: parseDate(r.saleDate),
          customerId,
          customerName,
          customerMobile: mobile,
          mobile: mobile,
          customerAddress: cleanString(r.address),
          address: cleanString(r.address),

          vehicleModel: cleanString(r.vehicleModel),
          model: cleanString(r.vehicleModel),
          vehicleColor: cleanString(r.color),
          color: cleanString(r.color),
          vehicleVariant: cleanString(r.variant),
          variant: cleanString(r.variant),
          chassisNo,
          motorNo: cleanString(r.motorNo),

          // ─ Prices (uses effective max calculation) ─
          price: effectivePrice || parseNumber(r.price),
          netAmount: effectivePrice,
          grandTotal: effectivePrice,
          exShowroom: effectivePrice || parseNumber(r.price),

          // ─ Raw amounts for reference ─
          accessoriesValue: parseNumber(r.accessoriesValue),
          saleWithAccessories: parseNumber(r.saleWithAccessories),
          helmet: parseNumber(r.helmet),
          downPayment: parseNumber(r.downPayment),
          oldVehicleValue: parseNumber(r.oldVehicleValue),
          disbursed: parseNumber(r.disbursed),
          financierPayment: parseNumber(r.financierPayment),
          pendingAmount: parseNumber(r.pendingAmount),
          paymentMode: cleanString(r.paymentMode) || 'CASH',
          financerName: cleanString(r.paymentMode) || 'CASH',
          giftRecord: cleanString(r.giftRecord),

          status: 'paid',
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

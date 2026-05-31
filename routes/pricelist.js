const express = require('express');
const router = express.Router();
const PriceList = require('../models/PriceList');
const AppSettings = require('../models/AppSettings');

const DEFAULT_VARIANTS = ['W OUT BTY', '48 VOLT', '60 VOLT', '72 VOLT', '60 V 43 AH'];

// GET all price list entries
router.get('/', async (req, res) => {
  try {
    const items = await PriceList.find({ isActive: true }).sort({ serialNo: 1, modelName: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET column variants (stored in AppSettings)
router.get('/variants', async (req, res) => {
  try {
    const setting = await AppSettings.findOne({ key: 'price_variants' });
    res.json(setting?.value || DEFAULT_VARIANTS);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT variants — update column list
router.put('/variants', async (req, res) => {
  try {
    const { variants } = req.body;
    if (!Array.isArray(variants)) return res.status(400).json({ error: 'Variants array चाहिए' });
    await AppSettings.findOneAndUpdate(
      { key: 'price_variants' },
      { key: 'price_variants', value: variants, category: 'pricelist', updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, variants });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST — create new model
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.modelName) data.modelName = data.modelName.toUpperCase().trim();
    const item = new PriceList(data);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT — update entire model
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body, updatedAt: new Date() };
    if (data.modelName) data.modelName = data.modelName.toUpperCase().trim();
    const item = await PriceList.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH — update ONE price cell (inline edit)
router.patch('/:id/price', async (req, res) => {
  try {
    const { variantName, price } = req.body;
    const item = await PriceList.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    const existing = item.variants.find(v => v.name === variantName);
    const numPrice = price === null || price === '' ? null : Number(price);

    if (existing) {
      existing.price = numPrice;
    } else {
      item.variants.push({ name: variantName, price: numPrice });
    }
    item.updatedAt = new Date();
    await item.save();
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE model
router.delete('/:id', async (req, res) => {
  try {
    await PriceList.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /sync — bulk import (Excel)
router.post('/sync', async (req, res) => {
  try {
    const { items = [] } = req.body;
    let added = 0, updated = 0;
    for (const it of items) {
      if (!it.modelName) continue;
      it.modelName = it.modelName.toUpperCase().trim();
      const existing = await PriceList.findOne({ modelName: it.modelName });
      if (existing) {
        Object.assign(existing, it);
        existing.updatedAt = new Date();
        await existing.save();
        updated++;
      } else {
        await new PriceList(it).save();
        added++;
      }
    }
    res.json({ success: true, added, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Yakuza seed data — runs only if database empty
router.get('/seed-yakuza', async (req, res) => {
  try {
    const count = await PriceList.countDocuments();
    if (count > 0) return res.json({ message: 'Price list में पहले से data है', count });

    // Save default variants
    await AppSettings.findOneAndUpdate(
      { key: 'price_variants' },
      { key: 'price_variants', value: DEFAULT_VARIANTS, category: 'pricelist', updatedAt: new Date() },
      { upsert: true }
    );

    const mk = (sn, name, wob, v48, v60, v72, v6043) => ({
      serialNo: sn, modelName: name, brandName: 'Yakuza',
      variants: [
        { name: 'W OUT BTY', price: wob },
        { name: '48 VOLT', price: v48 },
        { name: '60 VOLT', price: v60 },
        { name: '72 VOLT', price: v72 },
        { name: '60 V 43 AH', price: v6043 }
      ]
    });

    const seedData = [
      mk(1,  'RUBIE',         33000, 41000, 43000, 45500, 50000),
      mk(2,  'RAMIE',         34000, 43500, 45500, 48000, 52500),
      mk(3,  'NEO',           34500, 42500, 44500, 47000, 51500),
      mk(4,  'VIRAJ',         35500, 44000, 46000, null,  null),
      mk(5,  'ZUNAID',        36000, 44000, 46000, 48500, 53000),
      mk(6,  'DUSTER',        36500, null,  39000, null,  null),
      mk(7,  'CHERRY',        37500, 45500, 47500, 50000, 54500),
      mk(8,  'RUSTER',        38500, null,  40500, null,  null),
      mk(9,  'DRAGGER',       39500, null,  41500, null,  null),
      mk(10, 'RAAVTA',        42000, null,  52000, 54500, 59000),
      mk(11, 'ASHER',         35000, null,  43000, null,  null),
      mk(12, 'ADDA',          35000, null,  11000, null,  null),
      mk(13, 'WE4',           36000, null,  44000, null,  null),
      mk(14, 'DELTA',         40000, null,  48000, 50500, 54000),
      mk(15, 'SHAMA',         41000, null,  49000, 51500, null),
      mk(16, 'SPARROW',       42500, null,  50500, 53000, 56500),
      mk(17, 'BEATS',         43000, null,  51000, 53500, null),
      mk(18, 'SPARROW PRO',   43500, null,  51500, 54000, 57500),
      mk(19, 'CYCLONE',       44000, null,  52000, 54500, null),
      mk(20, 'AQABA',         44500, null,  55000, 57500, 62000),
      mk(21, 'ASVA',          47500, null,  57500, 60000, 64500),
      mk(22, 'SPARROW PLUS',  44500, null,  54500, 57000, 61500),
      mk(23, 'UNIQUE MANO',   45500, null,  53500, 56000, 59500),
      mk(24, 'SPARROW X',     45500, null,  53500, 56000, 59500),
      mk(25, 'RUSH',          54500, null,  63000, 65500, 70000),
      mk(26, 'LUCKA',         50500, null,  60500, 63000, 67500)
    ];

    for (const item of seedData) await new PriceList(item).save();
    res.json({ success: true, seeded: seedData.length, message: `${seedData.length} Yakuza models added — सब prices editable हैं!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

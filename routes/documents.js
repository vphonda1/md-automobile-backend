const express = require('express');
const router = express.Router();
const Document = require('../models/Document');

// Fields we exclude from LIST view (heavy base64 data) — fetched individually when opened
const HEAVY_FIELDS = { fileData: 0, fileBase64: 0 };

// LIST documents (with various filters) — EXCLUDES heavy file bytes to avoid MongoDB
// in-memory sort exceeding the 32MB limit. Individual documents are fetched in full
// via GET /:id when the user actually opens/views one.
router.get('/', async (req, res) => {
  try {
    const { customerId, customerPhone, mobileNo, docType, documentType, folder } = req.query;
    let query = {};
    if (customerId) query.customerId = customerId;
    if (folder) query.folder = folder;
    if (customerPhone) query.$or = [{ customerPhone }, { mobileNo: customerPhone }];
    else if (mobileNo) query.$or = [{ customerPhone: mobileNo }, { mobileNo }];
    if (docType) query.$or = [{ docType }, { documentType: docType }];
    else if (documentType) query.$or = [{ docType: documentType }, { documentType }];

    // 🔧 FIX: project away fileData/fileBase64 BEFORE sorting, so the in-memory
    // sort operates on small metadata documents instead of full base64 blobs.
    const items = await Document
      .find(query, HEAVY_FIELDS)
      .sort({ savedAt: -1, createdAt: -1 })
      .limit(500)
      .lean();

    res.json(items);
  } catch (err) {
    console.error('[documents GET list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single document — FULL data including fileData (for viewing/downloading)
router.get('/:id', async (req, res) => {
  try {
    const item = await Document.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error('[documents GET single]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// CREATE document
router.post('/', async (req, res) => {
  try {
    // Ensure customerId is valid ObjectId or null
    if (req.body.customerId && typeof req.body.customerId === 'string') {
      if (!/^[0-9a-fA-F]{24}$/.test(req.body.customerId)) {
        delete req.body.customerId;  // invalid → drop so it doesn't error
      }
    }

    // Validate file presence
    if (!req.body.fileData && !req.body.fileBase64 && !req.body.fileUrl) {
      return res.status(400).json({ error: 'File data missing (fileData/fileBase64/fileUrl)' });
    }

    const item = new Document(req.body);
    await item.save();

    // Return WITHOUT heavy fields to keep the response light (frontend already has
    // the file locally since it just uploaded it)
    const lightItem = item.toObject();
    delete lightItem.fileData;
    delete lightItem.fileBase64;
    res.status(201).json(lightItem);
  } catch (err) {
    console.error('[documents POST]', err.message, err.errors);
    res.status(400).json({ error: err.message, details: err.errors });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const item = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error('[documents PUT]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await Document.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[documents DELETE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

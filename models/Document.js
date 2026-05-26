const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: String,
  mobileNo: { type: String, index: true },
  
  documentType: { type: String, required: true }, // aadhar, pan, license, photo, address-proof, invoice, rc, insurance, other
  documentName: String,
  documentNumber: String,
  
  fileUrl: String,
  fileBase64: String, // for small files
  fileName: String,
  fileSize: Number,
  mimeType: String,
  
  notes: String,
  uploadedBy: String,
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

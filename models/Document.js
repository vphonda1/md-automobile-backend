const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  // Customer info
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: String,
  customerPhone: { type: String, index: true },    // frontend sends customerPhone
  mobileNo: { type: String, index: true },         // legacy alias
  aadharNo: String,
  nomineeName: String,
  hypothecation: String,

  // Folder for grouping (e.g., "CustomerName_Phone")
  folder: { type: String, index: true },

  // Vehicle info
  vehicleModel: String,
  chassisNo: String,
  motorNo: String,
  chargerNo: String,
  controllerNo: String,
  batteryNo: String,                                // comma-separated up to 6

  // Document classification — both old and new names supported
  docType: String,                                  // frontend uses this (aadhar, pan, etc.)
  docTypeLabel: String,                             // display label
  docIcon: String,                                  // emoji icon
  documentType: String,                             // legacy alias
  documentName: String,                             // legacy
  documentNumber: String,                           // legacy

  // File data
  fileData: String,                                 // frontend sends base64 here
  fileBase64: String,                               // legacy alias
  fileUrl: String,
  fileType: String,                                 // frontend sends MIME type
  mimeType: String,                                 // legacy alias
  fileName: String,
  fileSize: Number,

  // Meta
  expiryDate: String,
  notes: String,
  uploadedBy: String,
  savedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });  // ← allow any extra fields for forward-compat

// Pre-save: normalize aliases so both old and new code work
DocumentSchema.pre('save', function(next) {
  // Sync docType <-> documentType
  if (this.docType && !this.documentType) this.documentType = this.docType;
  if (this.documentType && !this.docType) this.docType = this.documentType;

  // Sync customerPhone <-> mobileNo
  if (this.customerPhone && !this.mobileNo) this.mobileNo = this.customerPhone;
  if (this.mobileNo && !this.customerPhone) this.customerPhone = this.mobileNo;

  // Sync fileData <-> fileBase64
  if (this.fileData && !this.fileBase64) this.fileBase64 = this.fileData;

  // Sync fileType <-> mimeType
  if (this.fileType && !this.mimeType) this.mimeType = this.fileType;

  next();
});

// 🔧 Index for fast sorting by date (avoids in-memory sort on large collections)
DocumentSchema.index({ savedAt: -1, createdAt: -1 });

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

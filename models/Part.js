const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
  partNumber: { type: String, required: true, unique: true, index: true },
  partName: { type: String, required: true },
  category: { type: String, default: 'general' }, // battery, motor, controller, brake, tyre, general
  description: String,
  hsn: String,

  // Inventory
  stockQuantity: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 5 },
  unit: { type: String, default: 'piece' },

  // Pricing
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 18 },

  // Compatibility
  compatibleModels: [String],

  // Tracking
  supplier: String,
  lastPurchaseDate: String,
  location: String, // rack number

  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PartSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
PartSchema.index({ partName: 'text', partNumber: 'text' });

module.exports = mongoose.models.Part || mongoose.model('Part', PartSchema);

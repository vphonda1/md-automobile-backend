const mongoose = require('mongoose');

const VariantPriceSchema = new mongoose.Schema({
  name: String,           // "W OUT BTY", "48 VOLT", "60 VOLT" etc.
  price: { type: Number, default: null }   // null = NA
}, { _id: false });

const PriceListSchema = new mongoose.Schema({
  modelName: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
  serialNo: { type: Number, default: 0 },
  brandName: { type: String, default: 'Yakuza' },
  variants: [VariantPriceSchema],
  notes: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PriceListSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.PriceList || mongoose.model('PriceList', PriceListSchema);

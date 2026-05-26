const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: mongoose.Schema.Types.Mixed,
  category: { type: String, default: 'general' }, // business, branding, system, custom
  updatedBy: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);

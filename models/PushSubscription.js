const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  userName: String,
  subscription: {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: String,
      auth: String
    }
  },
  device: String, // browser/device info
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);

const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  mobileNo: { type: String, index: true },
  chassisNo: String,

  // Type of feedback
  feedbackType: { type: String, default: 'service', enum: ['sale', 'service', 'product', 'staff', 'general'] },
  category: String, // sub-category

  // Ratings (1-5)
  overallRating: { type: Number, min: 1, max: 5, required: true },
  staffRating: { type: Number, min: 1, max: 5 },
  productRating: { type: Number, min: 1, max: 5 },
  serviceRating: { type: Number, min: 1, max: 5 },
  
  // NPS score
  wouldRecommend: { type: Number, min: 0, max: 10 },

  // Text
  comment: String,
  improvements: String,
  
  // Related staff
  staffName: String,
  staffId: String,

  // Status
  status: { type: String, default: 'new' }, // new, acknowledged, resolved
  acknowledgement: String,
  resolvedBy: String,
  resolvedAt: String,

  // Source
  source: { type: String, default: 'in-person' }, // in-person, whatsapp, call, online

  createdAt: { type: Date, default: Date.now }
});

FeedbackSchema.index({ overallRating: 1, createdAt: -1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

// ========================================
// MD Automobile Dealership - Main Server
// ========================================
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 5000;

// ========== Middleware ==========
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== MongoDB Connection ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/md-automobile')
  .then(() => console.log('✅ MongoDB connected (MD Automobile)'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ========== Web Push Setup (VAPID) ==========
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@mdautomobile.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('✅ VAPID keys configured');
} else {
  console.warn('⚠️  VAPID keys not set - push notifications disabled');
}

// ========== Inline Push Routes (avoid separate file conflicts per VP Honda lessons) ==========
const PushSubscription = require('./models/PushSubscription');

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

app.post('/api/push/save-push-subscription', async (req, res) => {
  try {
    const { subscription, userId, userName } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription required' });
    
    await PushSubscription.findOneAndUpdate(
      { 'subscription.endpoint': subscription.endpoint },
      { subscription, userId, userName, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/test-push-notification', async (req, res) => {
  try {
    const { title = 'MD Automobile', body = 'Test notification', userId } = req.body;
    const query = userId ? { userId } : {};
    const subs = await PushSubscription.find(query);
    
    const payload = JSON.stringify({ title, body, icon: '/icons/icon-192.png' });
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, payload))
    );
    
    res.json({ sent: results.filter(r => r.status === 'fulfilled').length, total: subs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to send push from anywhere in the app
app.locals.sendPush = async (userId, payload) => {
  try {
    const subs = userId ? await PushSubscription.find({ userId }) : await PushSubscription.find();
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await Promise.allSettled(subs.map(s => webpush.sendNotification(s.subscription, body)));
  } catch (err) {
    console.error('Push send error:', err.message);
  }
};

// ========== Route Registration ==========
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/jobcards', require('./routes/jobcards'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/warranty', require('./routes/warranty'));
app.use('/api/testrides', require('./routes/testrides'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/appointments', require('./routes/appointments'));

// ========== Health & Root ==========
app.get('/', (req, res) => {
  res.json({
    name: 'MD Automobile API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/customers', '/api/vehicles', '/api/invoices', '/api/dashboard', '/api/messages', '/api/push/*']
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ========== Start ==========
app.listen(PORT, () => {
  console.log(`🚀 MD Automobile backend running on port ${PORT}`);
});

module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const webpush = require('web-push');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// === MIDDLEWARE ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// === MONGODB CONNECTION ===
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MDAutomobile';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

mongoose.connection.on('error', err => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

// === WEB PUSH (VAPID) SETUP ===
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BD0y6z0bNBY1A75ZhVr7al0hOgL--sCev7vagK3SKKwyDP0pifT_Ig6cmKUo72MeHACpablwxfJtpspFn7Jp0FQ';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'Sn9hJ--kk1iAMLbeJxfy-8SPLRVdVTyR4JWwinChXds';

try {
  webpush.setVapidDetails('mailto:admin@mdautomobile.com', VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('✅ Web Push configured');
} catch (e) {
  console.warn('⚠️ Web Push not configured:', e.message);
}

// Make webpush available to routes
app.locals.webpush = webpush;
app.locals.vapidPublic = VAPID_PUBLIC;

// === HEALTH CHECK ===
app.get('/', (req, res) => res.json({
  status: 'ok',
  service: 'MD Automobile API',
  time: new Date().toISOString(),
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// VAPID public key endpoint (frontend needs this for push subscriptions)
app.get('/api/vapid-public-key', (req, res) => res.json({ publicKey: VAPID_PUBLIC }));

// === ROUTES ===

// Auth & Settings
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));

// Customer & Vehicle
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));

// Invoicing
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/pricelist', require('./routes/pricelist'));
app.use('/api/invoice-helper', require('./routes/invoice-helper'));

// Service
app.use('/api/jobcards', require('./routes/jobcards'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/warranty', require('./routes/warranty'));

// Customer Engagement
app.use('/api/testrides', require('./routes/testrides'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/reminders', require('./routes/reminders'));

// Communication
app.use('/api/messages', require('./routes/messages'));
app.use('/api/documents', require('./routes/documents'));

// Staff & HR
app.use('/api/staff', require('./routes/staff'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/salary', require('./routes/salary'));

// Reporting
app.use('/api/dashboard', require('./routes/dashboard'));

// === 404 HANDLER ===
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 MD Automobile API server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/`);
});
